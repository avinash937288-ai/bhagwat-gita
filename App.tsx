
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, Verse, UserVoiceIntent } from './types';
import { GITA_CHAPTERS, ICONS } from './constants';
import { parseVoiceIntent, generateSpeech, decodeBase64Audio, fetchVerseContent } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'verse'>('home');
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [selectedLang, setSelectedLang] = useState<Language>(Language.HINDI);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fontSize, setFontSize] = useState(28); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [audioState, setAudioState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('gita-theme');
    return saved === 'dark';
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isSequencePlayingRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('gita-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.body.classList.add('dark-mode-active');
    } else {
      document.body.classList.remove('dark-mode-active');
    }
  }, [isDarkMode]);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const stopCurrentAudio = useCallback(() => {
    isSequencePlayingRef.current = false;
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    setAudioState('stopped');
  }, []);

  const togglePause = async () => {
    const ctx = initAudio();
    if (ctx.state === 'running') {
      await ctx.suspend();
      setAudioState('paused');
    } else if (ctx.state === 'suspended') {
      await ctx.resume();
      setAudioState('playing');
    }
  };

  const playAudio = useCallback(async (text: string, lang: Language): Promise<void> => {
    try {
      const ctx = initAudio();
      
      if (ctx.state === 'suspended') await ctx.resume();

      const base64Audio = await generateSpeech(text, lang);
      if (base64Audio) {
        return new Promise((resolve) => {
          decodeBase64Audio(base64Audio, ctx).then(buffer => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            
            setAudioState('playing');
            source.onended = () => {
              if (currentSourceRef.current === source) {
                setAudioState('stopped');
              }
              resolve();
            };
            
            source.start(0);
            currentSourceRef.current = source;
          }).catch(() => resolve());
        });
      }
    } catch (err) {
      console.error("Audio error:", err);
      setAudioState('stopped');
    }
  }, [initAudio]);

  const playFullVerseSequence = useCallback(async (verse: Verse, lang: Language) => {
    stopCurrentAudio();
    isSequencePlayingRef.current = true;

    if (!isSequencePlayingRef.current) return;
    await playAudio(verse.sanskrit, Language.HINDI);
    
    if (!isSequencePlayingRef.current) return;
    await new Promise(r => setTimeout(r, 500)); 
    
    if (!isSequencePlayingRef.current) return;
    await playAudio(verse.meaning[lang], lang);
    
    isSequencePlayingRef.current = false;
  }, [playAudio, stopCurrentAudio]);

  const loadVerse = useCallback(async (ch: number, v: number, targetLang: Language = selectedLang) => {
    stopCurrentAudio();
    setIsProcessing(true);
    
    const verseData = await fetchVerseContent(ch, v);
    if (verseData) {
      setCurrentVerse(verseData);
      setView('verse');
      setIsSidebarOpen(false);
      setIsProcessing(false);
      
      playFullVerseSequence(verseData, targetLang);
    } else {
      setIsProcessing(false);
    }
  }, [selectedLang, stopCurrentAudio, playFullVerseSequence]);

  const handleNextVerse = () => {
    if (!currentVerse) return;
    const { chapter, verse } = currentVerse;
    const currentChapterData = GITA_CHAPTERS.find(c => c.id === chapter);
    if (!currentChapterData) return;

    if (verse < currentChapterData.verses_count) {
      loadVerse(chapter, verse + 1);
    } else if (chapter < 18) {
      loadVerse(chapter + 1, 1);
    }
  };

  const handlePrevVerse = () => {
    if (!currentVerse) return;
    const { chapter, verse } = currentVerse;

    if (verse > 1) {
      loadVerse(chapter, verse - 1);
    } else if (chapter > 1) {
      const prevChapterData = GITA_CHAPTERS.find(c => c.id === chapter - 1);
      if (prevChapterData) {
        loadVerse(chapter - 1, prevChapterData.verses_count);
      }
    }
  };

  const handleMicClick = async () => {
    initAudio();
    if (isRecording) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          const intent = await parseVoiceIntent(base64Data);
          
          if (intent.type === 'VERSE_SEARCH' && intent.chapter && intent.verse) {
            loadVerse(intent.chapter, intent.verse, intent.language || selectedLang);
          } else if (intent.type === 'LANGUAGE_CHANGE' && intent.language) {
            setSelectedLang(intent.language);
            if (currentVerse) {
              playFullVerseSequence(currentVerse, intent.language);
            }
            setIsProcessing(false);
          } else {
            setIsProcessing(false);
          }
        };
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission needed.");
    }
  };

  const LangButton = ({ lang, label, sublabel }: { lang: Language, label: string, sublabel: string }) => (
    <button
      onClick={() => {
        setSelectedLang(lang);
        if (currentVerse) playFullVerseSequence(currentVerse, lang);
      }}
      className={`flex flex-col items-center justify-center px-3 md:px-6 py-1.5 md:py-3 rounded-xl md:rounded-2xl border-2 transition-all active:scale-95 ${
        selectedLang === lang
          ? 'bg-[#f8d48b] dark:bg-[#eba92a] border-[#eba92a] scale-105 z-10 shadow-md font-bold'
          : `bg-white/50 dark:bg-zinc-800/50 border-orange-100 dark:border-zinc-700 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'} hover:border-orange-300`
      }`}
    >
      <span className={`text-lg md:text-2xl font-hindi leading-none ${selectedLang === lang ? 'text-[#3d2b1f]' : ''}`}>{label}</span>
      <span className={`text-[9px] md:text-xs font-bold uppercase mt-0.5 tracking-wider ${selectedLang === lang ? 'text-[#3d2b1f]/60' : 'text-gray-500'}`}>{sublabel}</span>
    </button>
  );

  const themeClasses = isDarkMode ? 'dark-mode bg-zinc-950 text-zinc-100' : 'bg-[#fdfcf0] text-[#3d2b1f]';

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${themeClasses} paper-texture selection:bg-orange-200 overflow-x-hidden`}>
      {/* Top Header / Nav */}
      <div className={`sticky md:fixed top-0 left-0 right-0 z-[60] p-3 md:p-4 flex flex-wrap gap-2 justify-between items-center ${isDarkMode ? 'bg-zinc-950/90' : 'bg-[#fdfcf0]/90'} backdrop-blur-md md:bg-transparent`}>
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}>
            <ICONS.Menu className="w-6 h-6 text-[#eba92a]" />
          </button>
        </div>

        <div className="flex gap-1.5 md:gap-4 bg-white/40 dark:bg-zinc-900/40 p-1 md:p-1.5 rounded-2xl md:rounded-[1.5rem] border border-orange-100 dark:border-zinc-800 shadow-sm mx-auto md:mr-0 md:ml-auto">
          <LangButton lang={Language.HINDI} label="हिंदी" sublabel="Hindi" />
          <LangButton lang={Language.BHOJPURI} label="भोजपुरी" sublabel="Bhojpuri" />
          <LangButton lang={Language.ENGLISH} label="English" sublabel="English" />
        </div>

        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-3 md:p-4 rounded-full transition-all active:scale-90 border shadow-lg ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-yellow-400' : 'bg-white border-orange-100 text-zinc-800'}`}
        >
          {isDarkMode ? <ICONS.Sun className="w-5 h-5 md:w-6 md:h-6" /> : <ICONS.Moon className="w-5 h-5 md:w-6 md:h-6" />}
        </button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-out ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-orange-100'} w-full max-w-xs md:max-w-md shadow-2xl flex flex-col border-r`}>
        <div className="p-5 md:p-8 bg-[#eba92a] text-[#3d2b1f] flex justify-between items-center shadow-md border-b-4 border-[#d89721]">
          <div className="flex items-center gap-3">
            <ICONS.Krishna className="w-6 h-6 md:w-8 md:h-8" />
            <h2 className="text-xl md:text-3xl font-hindi font-black tracking-tight">श्रीमद्भगवद्गीता</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 bg-white/40 rounded-full active:scale-90">
            <ICONS.Close className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-3 md:space-y-4">
          {GITA_CHAPTERS.map((chapter) => (
            <div key={chapter.id} className={`rounded-xl md:rounded-[2rem] overflow-hidden border-2 transition-shadow ${isDarkMode ? 'bg-zinc-800 border-zinc-700 shadow-none' : 'bg-white border-orange-50 shadow-sm'}`}>
              <button
                onClick={() => setActiveChapterId(activeChapterId === chapter.id ? null : chapter.id)}
                className={`w-full text-left p-3 md:p-6 transition-all flex justify-between items-center ${activeChapterId === chapter.id ? (isDarkMode ? 'bg-zinc-700/30' : 'bg-orange-50') : (isDarkMode ? 'hover:bg-zinc-700/50' : 'hover:bg-orange-50/50')}`}
              >
                <div>
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Adhyay {chapter.id}</p>
                  <p className={`font-hindi text-lg md:text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-gray-800'}`}>{chapter.name}</p>
                  <p className={`text-xs md:text-base font-medium ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>{chapter.translation}</p>
                </div>
                <ICONS.ChevronRight className={`w-5 h-5 md:w-8 md:h-8 transition-transform duration-300 ${activeChapterId === chapter.id ? 'rotate-90' : ''} ${isDarkMode ? 'text-zinc-600' : 'text-orange-300'}`} />
              </button>
              
              {activeChapterId === chapter.id && (
                <div className={`grid grid-cols-4 md:grid-cols-5 gap-1.5 p-3 md:p-6 border-t-2 animate-in fade-in duration-200 ${isDarkMode ? 'bg-zinc-900/40 border-zinc-700' : 'bg-orange-50/20 border-orange-50'}`}>
                  {Array.from({ length: chapter.verses_count }, (_, i) => i + 1).map((v) => (
                    <button
                      key={v}
                      onClick={() => loadVerse(chapter.id, v)}
                      className={`h-10 w-10 md:h-14 md:w-14 flex items-center justify-center rounded-lg md:rounded-[1rem] text-base md:text-xl font-black transition-all active:scale-90 ${
                        currentVerse?.chapter === chapter.id && currentVerse?.verse === v
                        ? 'bg-[#eba92a] text-white shadow-lg scale-110 border md:border-4 border-white'
                        : `${isDarkMode ? 'bg-zinc-700 border-zinc-600 text-zinc-300' : 'bg-white border-orange-100 text-orange-800'} border hover:border-[#eba92a]`
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center min-h-screen overflow-y-auto relative px-4 md:px-12 py-8 md:py-10">
        {view === 'home' ? (
          <div className="flex flex-col items-center text-center max-w-2xl w-full animate-in fade-in zoom-in duration-500 mt-10 md:mt-0">
            <div className="relative mb-5 md:mb-12">
               <div className={`absolute inset-0 rounded-full animate-pulse opacity-40 scale-125 ${isDarkMode ? 'bg-zinc-800' : 'bg-[#f8eecd]'}`}></div>
               <div className={`relative w-20 h-20 md:w-32 md:h-32 rounded-full flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-zinc-800' : 'bg-[#f8eecd]'}`}>
                <ICONS.Krishna className={`w-10 h-10 md:w-16 md:h-16 ${isDarkMode ? 'text-zinc-600' : 'text-[#e6b149]'}`} />
              </div>
            </div>

            <h1 className={`text-5xl md:text-[8rem] font-hindi mb-2 md:mb-4 tracking-tighter font-black drop-shadow-sm ${isDarkMode ? 'text-zinc-100' : 'text-[#3d2b1f]'}`}>नमस्ते</h1>
            <p className={`text-xl md:text-5xl font-hindi leading-snug mb-8 md:mb-20 max-w-xs md:max-w-lg ${isDarkMode ? 'text-zinc-400' : 'text-[#7d6b5f]'}`}>
              अपना श्लोक बोलकर सुनें <br className="hidden md:block"/>
              <span className="text-[#eba92a] font-black border-b-2 md:border-b-8 border-[#eba92a]/20 px-1 md:px-2">"अध्याय 2 श्लोक 47"</span>
            </p>

            <div className="flex flex-col items-center gap-4 md:gap-10 mb-8 md:mb-24">
              <button
                onClick={handleMicClick}
                className={`relative group flex items-center justify-center w-28 h-28 md:w-52 md:h-52 rounded-full transition-all duration-300 transform active:scale-90 shadow-2xl ${
                  isRecording 
                    ? 'bg-red-500 ring-4 md:ring-[20px] ring-red-100 dark:ring-red-900/50' 
                    : 'bg-[#eba92a] ring-4 md:ring-[20px] ring-white dark:ring-zinc-900 hover:bg-[#d89721]'
                }`}
              >
                {isProcessing ? (
                  <div className="w-8 h-8 md:w-16 md:h-16 border-4 md:border-[8px] border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ICONS.Mic className={`w-10 h-10 md:w-24 md:h-24 text-white ${isRecording ? 'animate-pulse' : ''}`} />
                )}
                {isRecording && <div className="absolute -inset-4 md:-inset-10 border-2 md:border-4 border-red-400 rounded-full animate-ping opacity-30"></div>}
              </button>
              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                <span className={`text-xl md:text-4xl font-black font-hindi ${isDarkMode ? 'text-zinc-200' : 'text-[#3d2b1f]'}`}>यहाँ दबाकर बोलें</span>
                <span className={`text-[8px] md:text-sm uppercase tracking-[0.2em] font-black opacity-40 ${isDarkMode ? 'text-zinc-500' : 'text-[#7d6b5f]'}`}>Tap to search by voice</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 w-full max-w-xl px-2">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className={`flex items-center justify-center gap-2 md:gap-4 px-4 py-3 md:py-6 rounded-xl md:rounded-[2rem] border-2 md:border-4 font-hindi text-lg md:text-3xl font-black transition-all shadow-lg active:scale-95 ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-white border-[#e6b149]/30 text-[#3d2b1f] hover:bg-orange-50'}`}
              >
                <ICONS.Book className="w-5 h-5 md:w-10 md:h-10 text-[#eba92a]" />
                अध्याय खोलें
              </button>
              <button 
                onClick={() => loadVerse(2, 47)}
                className="flex items-center justify-center gap-2 md:gap-4 px-4 py-3 md:py-6 rounded-xl md:rounded-[2rem] bg-[#eba92a] text-[#3d2b1f] font-hindi text-lg md:text-3xl font-black shadow-2xl hover:bg-[#d89721] transition-all active:scale-95"
              >
                <ICONS.Krishna className="w-5 h-5 md:w-10 md:h-10" />
                लोकप्रिय श्लोक
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-5 md:gap-10 animate-in slide-in-from-bottom-8 duration-500 px-2 mt-16 md:mt-0 pb-28">
            <button 
              onClick={() => { stopCurrentAudio(); setView('home'); }}
              className={`self-start font-black flex items-center gap-2 md:gap-3 transition-all mb-1 md:mb-2 px-4 py-2 md:px-8 md:py-4 rounded-full border shadow-md active:scale-95 ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-orange-50 text-[#3d2b1f]'}`}
            >
              <ICONS.ChevronRight className="w-4 h-4 md:w-6 md:h-6 rotate-180" />
              <span className="text-base md:text-2xl font-hindi">वापस (Home)</span>
            </button>

            {isProcessing && !currentVerse ? (
              <div className="flex-1 flex flex-col items-center justify-center text-orange-500 gap-4 md:gap-10 mt-10 md:mt-24">
                <div className="w-12 h-12 md:w-24 md:h-24 border-[6px] md:border-[8px] border-[#e6b149] border-t-transparent rounded-full animate-spin"></div>
                <p className="font-hindi text-xl md:text-4xl font-black animate-pulse text-center">श्लोक खोजा जा रहा है...</p>
              </div>
            ) : currentVerse ? (
              <div className="flex flex-col gap-6 md:gap-12">
                <section className={`rounded-[1.5rem] md:rounded-[3rem] shadow-xl p-5 md:p-16 border-2 relative text-center transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-orange-50'}`}>
                  <div className={`absolute top-0 left-0 w-8 h-8 md:w-24 md:h-24 border-t-2 md:border-t-4 border-l-2 md:border-l-4 rounded-tl-[1.5rem] md:rounded-tl-[3rem] m-3 md:m-8 opacity-20 ${isDarkMode ? 'border-zinc-100' : 'border-[#e6b149]'}`}></div>
                  <div className={`absolute bottom-0 right-0 w-8 h-8 md:w-24 md:h-24 border-b-2 md:border-b-4 border-r-2 md:border-r-4 rounded-br-[1.5rem] md:rounded-br-[3rem] m-3 md:m-8 opacity-20 ${isDarkMode ? 'border-zinc-100' : 'border-[#e6b149]'}`}></div>
                  
                  <p className="text-[#eba92a] font-black tracking-[0.2em] text-[10px] md:text-lg mb-4 md:mb-10 uppercase">CH {currentVerse.chapter} • VERSE {currentVerse.verse}</p>
                  
                  <div className="space-y-4 md:space-y-10">
                    <h2 className={`font-hindi leading-relaxed whitespace-pre-wrap font-black drop-shadow-sm px-1 md:px-2 transition-colors ${isDarkMode ? 'text-zinc-100' : 'text-[#1a1a1a]'}`} style={{ fontSize: `clamp(1.25rem, 3.5vw + 0.75rem, ${fontSize + 8}px)` }}>{currentVerse.sanskrit}</h2>
                    <p className={`italic font-bold text-base md:text-2xl px-2 md:px-10 opacity-70 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>{currentVerse.transliteration}</p>
                    <div className="flex justify-center gap-4 md:gap-6">
                      <button 
                        onClick={() => audioState === 'stopped' ? playFullVerseSequence(currentVerse, selectedLang) : togglePause()} 
                        className={`w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg border-2 md:border-4 active:scale-95 ${isDarkMode ? 'bg-zinc-800 text-[#eba92a] border-zinc-700' : 'bg-[#fdfcf0] text-[#eba92a] border-[#e6b149]/20'}`}
                      >
                        {audioState === 'playing' ? <ICONS.Pause className="w-6 h-6 md:w-10 md:h-10" /> : <ICONS.Play className="w-6 h-6 md:w-10 md:h-10 translate-x-0.5" />}
                      </button>
                      {audioState !== 'stopped' && (
                        <button 
                          onClick={stopCurrentAudio} 
                          className={`w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg border-2 md:border-4 active:scale-95 ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-900/40' : 'bg-red-50 text-red-400 border-red-100'}`}
                        >
                          <ICONS.Close className="w-5 h-5 md:w-8 md:h-8" />
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                <section className={`rounded-[1.5rem] md:rounded-[3rem] p-5 md:p-20 border-2 md:border-4 shadow-2xl relative overflow-hidden transition-colors ${isDarkMode ? 'bg-zinc-900 border-[#eba92a]/20' : 'bg-white border-[#eba92a]/30'}`}>
                   <div className="inline-flex items-center gap-2 md:gap-3 md:absolute md:-top-1 md:left-12 bg-[#eba92a] text-[#3d2b1f] px-4 md:px-12 py-2 md:py-5 rounded-lg md:rounded-b-[2rem] font-hindi text-base md:text-3xl font-black shadow-lg mb-5 md:mb-0">
                    <ICONS.Krishna className="w-5 h-5 md:w-8 md:h-8" />
                    श्रीकृष्ण वाणी
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:justify-end items-center mb-6 md:mb-8 gap-3 md:gap-4 md:mt-4">
                    <div className={`flex items-center gap-3 p-1.5 md:p-2 rounded-xl border w-full md:w-auto ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-[#fdfcf0] border-orange-50'}`}>
                      <input type="range" min="20" max="64" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="flex-1 md:w-48 accent-[#eba92a] h-3 md:h-4 cursor-pointer"/>
                    </div>
                  </div>

                  <div className="relative min-h-[100px] md:min-h-[300px] flex flex-col justify-center px-1">
                    <p 
                      className={`leading-relaxed font-hindi font-bold transition-all text-center md:text-left ${selectedLang === Language.ENGLISH ? 'font-sans italic' : ''} ${isDarkMode ? 'text-zinc-200' : 'text-[#111]'}`} 
                      style={{ fontSize: `clamp(1rem, 2.5vw + 0.5rem, ${fontSize}px)` }}
                    >
                      {currentVerse.meaning[selectedLang]}
                    </p>
                  </div>

                  <div className="mt-8 md:mt-10 flex flex-col md:flex-row justify-center gap-3 md:gap-6">
                    <div className="flex gap-2 md:gap-6 w-full md:w-auto">
                      <button 
                        onClick={handlePrevVerse}
                        disabled={currentVerse.chapter === 1 && currentVerse.verse === 1}
                        className={`flex-1 md:flex-none px-3 md:px-8 py-3 md:py-5 rounded-xl md:rounded-[3rem] border-2 md:border-4 font-hindi text-base md:text-2xl font-black flex items-center justify-center gap-1 md:gap-2 shadow-lg active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-[#eba92a] hover:bg-zinc-700' : 'bg-white border-orange-100 text-[#eba92a] hover:bg-orange-50'}`}
                      >
                        <ICONS.ChevronLeft className="w-5 h-5 md:w-8 md:h-8" />
                        <span className="hidden xs:inline">पिछला</span>
                      </button>
                      
                      <button 
                        onClick={() => audioState === 'stopped' ? playFullVerseSequence(currentVerse, selectedLang) : togglePause()} 
                        className="flex-[2] md:flex-none px-6 md:px-16 py-3 md:py-5 rounded-xl md:rounded-[3rem] bg-[#eba92a] text-[#3d2b1f] font-hindi text-lg md:text-3xl font-black flex items-center justify-center gap-2 md:gap-4 shadow-xl active:scale-95 hover:bg-[#d89721] transition-all"
                      >
                        {audioState === 'playing' ? <ICONS.Pause className="w-6 h-6 md:w-12 md:h-12" /> : <ICONS.Play className="w-6 h-6 md:w-12 md:h-12 translate-x-0.5" />}
                        <span>{audioState === 'playing' ? 'पॉज' : 'सुनें'}</span>
                      </button>
                      
                      <button 
                        onClick={handleNextVerse}
                        disabled={currentVerse.chapter === 18 && currentVerse.verse === 78}
                        className={`flex-1 md:flex-none px-3 md:px-8 py-3 md:py-5 rounded-xl md:rounded-[3rem] border-2 md:border-4 font-hindi text-base md:text-2xl font-black flex items-center justify-center gap-1 md:gap-2 shadow-lg active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-[#eba92a] hover:bg-zinc-700' : 'bg-white border-orange-100 text-[#eba92a] hover:bg-orange-50'}`}
                      >
                        <span className="hidden xs:inline">अगला</span>
                        <ICONS.ChevronRight className="w-5 h-5 md:w-8 md:h-8" />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
            
            <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-3 md:gap-4 scale-90 md:scale-110">
               {isRecording && <div className="px-4 py-2 bg-red-600 text-white rounded-xl text-base md:text-xl font-bold shadow-2xl animate-bounce border-2 border-white mb-1">बोलिये...</div>}
               {isProcessing && <div className={`px-4 py-2 text-white rounded-xl text-base md:text-xl font-bold shadow-2xl animate-pulse border-2 border-white mb-1 ${isDarkMode ? 'bg-zinc-800' : 'bg-[#eba92a]'}`}>खोज रहा हूँ...</div>}
               <button 
                onClick={handleMicClick} 
                className={`flex items-center justify-center w-14 h-14 md:w-24 md:h-24 rounded-full shadow-2xl transition-all border-4 md:border-[10px] active:scale-90 ${isDarkMode ? 'border-zinc-800' : 'border-white'} ${isRecording ? 'bg-red-500' : 'bg-[#eba92a]'}`}
               >
                 <ICONS.Mic className={`w-7 h-7 md:w-12 md:h-12 text-white ${isRecording ? 'animate-pulse' : ''}`} />
               </button>
            </div>
          </div>
        )}
      </main>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default App;
