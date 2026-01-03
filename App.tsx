
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, Verse, UserVoiceIntent, UserEmotion } from './types';
import { GITA_CHAPTERS, ICONS } from './constants';
import { parseVoiceIntent, generateSpeech, decodeBase64Audio, fetchVerseContent, fetchVerseByEmotion } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'verse'>('home');
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [selectedLang, setSelectedLang] = useState<Language>(Language.HINDI);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fontSize, setFontSize] = useState(24); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [audioState, setAudioState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('gita-theme') === 'dark');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const shankhAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSequencePlayingRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('gita-theme', isDarkMode ? 'dark' : 'light');
    document.body.classList.toggle('dark-mode-active', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3'); 
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.1;
    }
    if (!shankhAudioRef.current) {
      shankhAudioRef.current = new Audio('https://www.myinstants.com/media/sounds/shankh.mp3');
      shankhAudioRef.current.volume = 0.3;
    }
    
    if (isMusicOn) {
      bgMusicRef.current.play().catch(() => setIsMusicOn(false));
    } else {
      bgMusicRef.current.pause();
    }
  }, [isMusicOn]);

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
      try { currentSourceRef.current.stop(); } catch (e) {}
      currentSourceRef.current = null;
    }
    if (shankhAudioRef.current) {
      shankhAudioRef.current.pause();
      shankhAudioRef.current.currentTime = 0;
    }
    setAudioState('stopped');
    if (bgMusicRef.current) bgMusicRef.current.volume = 0.1;
  }, []);

  const togglePause = async () => {
    const ctx = initAudio();
    if (ctx.state === 'running') {
      await ctx.suspend();
      setAudioState('paused');
    } else {
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
              if (currentSourceRef.current === source) setAudioState('stopped');
              resolve();
            };
            source.start(0);
            currentSourceRef.current = source;
          }).catch(resolve);
        });
      }
    } catch (err) {
      setAudioState('stopped');
    }
  }, [initAudio]);

  const playFullVerseSequence = useCallback(async (verse: Verse, lang: Language, emotionIntro?: string) => {
    stopCurrentAudio();
    isSequencePlayingRef.current = true;
    
    if (bgMusicRef.current) bgMusicRef.current.volume = 0.02;

    if (shankhAudioRef.current) {
      shankhAudioRef.current.currentTime = 0;
      shankhAudioRef.current.play().catch(() => {});
    }

    if (!isSequencePlayingRef.current) return;
    await playAudio(verse.sanskrit, Language.HINDI);
    
    if (shankhAudioRef.current) {
      const fadeOut = setInterval(() => {
        if (shankhAudioRef.current && shankhAudioRef.current.volume > 0.05) {
          shankhAudioRef.current.volume -= 0.05;
        } else {
          clearInterval(fadeOut);
          if (shankhAudioRef.current) {
            shankhAudioRef.current.pause();
            shankhAudioRef.current.volume = 0.3;
          }
        }
      }, 100);
    }

    if (!isSequencePlayingRef.current) return;
    await new Promise(r => setTimeout(r, 1000)); 
    
    const intros = {
      [Language.HINDI]: emotionIntro ? `${emotionIntro}, हे पार्थ... ` : "हे पार्थ, ",
      [Language.ENGLISH]: emotionIntro ? `${emotionIntro}, Hey Parth... ` : "Hey Parth, ",
      [Language.BHOJPURI]: emotionIntro ? `${emotionIntro}, ए पार्थ... ` : "ए पार्थ, ",
    };
    
    const explanationText = `${intros[lang] || intros[Language.HINDI]} ${verse.meaning[lang]}`;
    await playAudio(explanationText, lang);
    
    if (bgMusicRef.current) bgMusicRef.current.volume = 0.1;
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

  const handleEmotionSelect = async (emotion: UserEmotion) => {
    stopCurrentAudio();
    setIsProcessing(true);
    const verseData = await fetchVerseByEmotion(emotion);
    
    const emotionContexts: Record<UserEmotion, string> = {
      tension: "जब मन चिंता से भरा हो (When the mind is full of anxiety)",
      anger: "क्रोध की अग्नि में (In the fire of anger)",
      confusion: "जब राह न सूझे (When the path is unclear)",
      loss: "दुःख और शोक के क्षणों में (In moments of sorrow)",
      motivation: "नये उत्साह के लिए (For new inspiration)"
    };

    if (verseData) {
      setCurrentVerse(verseData);
      setView('verse');
      setIsProcessing(false);
      playFullVerseSequence(verseData, selectedLang, emotionContexts[emotion]);
    } else {
      setIsProcessing(false);
    }
  };

  const handleNextVerse = useCallback(() => {
    if (!currentVerse) return;
    const { chapter, verse } = currentVerse;
    const chData = GITA_CHAPTERS.find(c => c.id === chapter);
    if (!chData) return;
    if (verse < chData.verses_count) loadVerse(chapter, verse + 1);
    else if (chapter < 18) loadVerse(chapter + 1, 1);
  }, [currentVerse, loadVerse]);

  const handlePrevVerse = useCallback(() => {
    if (!currentVerse) return;
    const { chapter, verse } = currentVerse;
    if (verse > 1) loadVerse(chapter, verse - 1);
    else if (chapter > 1) {
      const prev = GITA_CHAPTERS.find(c => c.id === chapter - 1);
      if (prev) loadVerse(chapter - 1, prev.verses_count);
    }
  }, [currentVerse, loadVerse]);

  const handleShare = async () => {
    if (!currentVerse) return;
    const text = `श्रीमद्भगवद्गीता (Ch ${currentVerse.chapter}, Verse ${currentVerse.verse})\n\n${currentVerse.sanskrit}\n\nMeaning (${selectedLang.toUpperCase()}): ${currentVerse.meaning[selectedLang]}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Bhagavad Gita', text }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied!');
    }
  };

  const handleMicClick = async () => {
    initAudio();
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => e.data.size > 0 && audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          const intent = await parseVoiceIntent(base64Data);
          if (intent.type === 'EMOTION_SEARCH' && intent.emotion) handleEmotionSelect(intent.emotion);
          else if (intent.type === 'VERSE_SEARCH' && intent.chapter && intent.verse) loadVerse(intent.chapter, intent.verse);
          else if (intent.type === 'NAVIGATION') intent.direction === 'next' ? handleNextVerse() : handlePrevVerse();
          else if (intent.type === 'LANGUAGE_CHANGE' && intent.language) {
            setSelectedLang(intent.language);
            if (currentVerse) playFullVerseSequence(currentVerse, intent.language);
            setIsProcessing(false);
          } else setIsProcessing(false);
        };
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) { alert("Mic permission needed."); }
  };

  const EmotionCard = ({ type, emoji, label, color }: { type: UserEmotion, emoji: string, label: string, color: string }) => (
    <button 
      onClick={() => handleEmotionSelect(type)}
      className={`flex flex-col items-center justify-center p-2.5 md:p-4 rounded-2xl border transition-all active:scale-95 hover:shadow-lg ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-orange-100 shadow-sm'}`}
    >
      <span className="text-2xl md:text-4xl mb-1.5">{emoji}</span>
      <span className={`font-hindi font-black text-[9px] md:text-xs leading-tight text-center ${color}`}>{label}</span>
    </button>
  );

  const LangButton = ({ lang, label }: { lang: Language, label: string }) => (
    <button
      onClick={() => { setSelectedLang(lang); if (currentVerse) playFullVerseSequence(currentVerse, lang); }}
      className={`flex flex-col items-center justify-center px-4 md:px-6 py-2 rounded-xl border-2 transition-all active:scale-95 ${
        selectedLang === lang ? 'bg-[#f8d48b] dark:bg-[#eba92a] border-[#eba92a] text-[#3d2b1f] shadow-md font-bold' : 'bg-white/50 dark:bg-zinc-800/50 border-orange-100 dark:border-zinc-700 text-gray-700 dark:text-zinc-400'
      }`}
    >
      <span className="text-lg md:text-xl font-hindi leading-none">{label}</span>
      <span className="text-[9px] font-bold uppercase mt-1 tracking-widest">{lang}</span>
    </button>
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-[#fdfcf0] text-[#3d2b1f]'} paper-texture overflow-x-hidden pb-32`}>
      <div className={`sticky md:fixed top-0 left-0 right-0 z-[60] p-3 md:p-4 flex gap-2 justify-between items-center ${isDarkMode ? 'bg-zinc-950/90' : 'bg-[#fdfcf0]/90'} backdrop-blur-md md:bg-transparent`}>
        <div className="flex gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className={`p-3 rounded-xl md:hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}>
            <ICONS.Menu className="w-5 h-5 text-[#eba92a]" />
          </button>
          <button onClick={() => setIsMusicOn(!isMusicOn)} className={`p-3 rounded-xl border shadow-lg transition-all ${isMusicOn ? 'bg-[#eba92a] text-white border-[#eba92a]' : 'bg-white dark:bg-zinc-800 border-orange-100 dark:border-zinc-700 text-zinc-400'}`}>
            <ICONS.Music className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 bg-white/40 dark:bg-zinc-900/40 p-1 rounded-2xl border border-orange-100 dark:border-zinc-800 shadow-sm">
          <LangButton lang={Language.HINDI} label="हिंदी" />
          <LangButton lang={Language.BHOJPURI} label="भोजपुरी" />
          <LangButton lang={Language.ENGLISH} label="En" />
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-3 rounded-xl border shadow-lg transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-yellow-400' : 'bg-white border-orange-100 text-zinc-800'}`}>
          {isDarkMode ? <ICONS.Sun className="w-5 h-5" /> : <ICONS.Moon className="w-5 h-5" />}
        </button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-orange-100'} w-full max-w-xs md:max-w-md shadow-2xl flex flex-col border-r`}>
        <div className="p-6 bg-[#eba92a] text-[#3d2b1f] flex justify-between items-center shadow-md border-b-4 border-[#d89721]">
          <div className="flex items-center gap-3">
            <ICONS.Krishna className="w-8 h-8" />
            <h2 className="text-2xl font-hindi font-black">श्रीमद्भगवद्गीता</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 bg-white/40 rounded-full"><ICONS.Close className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
          {GITA_CHAPTERS.map(ch => (
            <div key={ch.id} className={`rounded-xl overflow-hidden border-2 ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-orange-50 shadow-sm'}`}>
              <button onClick={() => setActiveChapterId(activeChapterId === ch.id ? null : ch.id)} className={`w-full text-left p-4 flex justify-between items-center ${activeChapterId === ch.id ? (isDarkMode ? 'bg-zinc-700/50' : 'bg-orange-50') : ''}`}>
                <div>
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Chapter {ch.id}</p>
                  <p className="font-hindi text-lg font-black">{ch.name}</p>
                  <p className="text-xs opacity-60">{ch.translation}</p>
                </div>
                <ICONS.ChevronRight className={`w-5 h-5 transition-transform ${activeChapterId === ch.id ? 'rotate-90' : ''}`} />
              </button>
              {activeChapterId === ch.id && (
                <div className={`grid grid-cols-5 gap-1.5 p-4 border-t-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-orange-50/20 border-orange-50'}`}>
                  {Array.from({ length: ch.verses_count }, (_, i) => i + 1).map(v => (
                    <button key={v} onClick={() => loadVerse(ch.id, v)} className={`h-10 rounded-lg text-sm font-black border transition-all ${currentVerse?.chapter === ch.id && currentVerse?.verse === v ? 'bg-[#eba92a] text-white border-[#eba92a] scale-110 shadow-md' : (isDarkMode ? 'bg-zinc-700 border-zinc-600 text-zinc-300' : 'bg-white border-orange-100 text-orange-800')}`}>{v}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center min-h-screen relative px-4 py-16 md:py-10">
        {view === 'home' ? (
          <div className="w-full max-w-5xl flex flex-col items-center text-center animate-in fade-in duration-700">
            <div className="relative mb-6 scale-90 md:scale-110">
               <div className={`absolute inset-0 rounded-full animate-pulse opacity-40 scale-150 ${isDarkMode ? 'bg-zinc-800' : 'bg-[#f8eecd]'}`}></div>
               <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-zinc-800' : 'bg-[#f8eecd]'}`}>
                <ICONS.Krishna className={`w-10 h-10 md:w-12 md:h-12 ${isDarkMode ? 'text-zinc-600' : 'text-[#e6b149]'}`} />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-hindi mb-1 font-black">नमस्ते</h1>
            <p className="text-sm md:text-xl font-hindi opacity-60 mb-8 italic font-bold">श्रीमद्भगवद्गीता - आपका दिव्य मार्गदर्शक</p>

            <div className="w-full max-w-3xl mb-10 px-2">
               <h3 className="text-lg md:text-xl font-hindi font-black mb-4 text-orange-500">आज आप कैसा महसूस कर रहे हैं?</h3>
               <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
                  <EmotionCard type="tension" emoji="😔" label="चिंता / Tension" color="text-blue-500" />
                  <EmotionCard type="anger" emoji="😡" label="क्रोध / Anger" color="text-red-500" />
                  <EmotionCard type="confusion" emoji="😕" label="भ्रम / Confused" color="text-purple-500" />
                  <EmotionCard type="loss" emoji="💔" label="दुःख / Loss" color="text-zinc-500" />
                  <EmotionCard type="motivation" emoji="💪" label="उत्साह / Inspired" color="text-green-600" />
               </div>
            </div>

            <div className={`p-6 md:p-10 rounded-[2rem] border-2 w-full max-w-2xl flex flex-col items-center gap-4 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-orange-100 shadow-xl'}`}>
              <p className="text-lg md:text-xl font-hindi font-black opacity-80">अपना श्लोक बोलकर खोजें</p>
              <p className="text-[#eba92a] font-black border-b-2 border-[#eba92a]/20 text-base md:text-lg font-hindi">"हे पार्थ, अध्याय 2 श्लोक 47"</p>
              <button onClick={handleMicClick} className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95 border-8 ${isDarkMode ? 'border-zinc-800' : 'border-[#fdfcf0]'} ${isRecording ? 'bg-red-500' : 'bg-[#eba92a]'}`}>
                {isProcessing ? <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <ICONS.Mic className={`w-8 h-8 md:w-12 md:h-12 text-white ${isRecording ? 'animate-pulse' : ''}`} />}
              </button>
            </div>
          </div>
        ) : currentVerse && (
          <div className="w-full max-w-4xl flex flex-col gap-6 animate-in slide-in-from-bottom duration-500">
            <button onClick={() => { stopCurrentAudio(); setView('home'); }} className={`self-start font-black flex items-center gap-2 px-6 py-2 rounded-full border shadow-md active:scale-95 ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-orange-50 text-[#3d2b1f]'}`}>
              <ICONS.ChevronLeft className="w-4 h-4" /> <span className="font-hindi">मुख्य द्वार (Home)</span>
            </button>
            <section className={`rounded-[2rem] shadow-2xl p-8 md:p-16 border-2 relative text-center divine-aura ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-orange-50'}`}>
              <div className="absolute top-4 right-4">
                <button onClick={handleShare} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><ICONS.Share className="w-5 h-5" /></button>
              </div>
              <p className="text-[#eba92a] font-black tracking-widest text-xs mb-8 uppercase tracking-[0.3em]">Chapter {currentVerse.chapter} • Verse {currentVerse.verse}</p>
              <h2 className="font-hindi leading-relaxed font-black mb-8" style={{ fontSize: `${fontSize + 8}px` }}>{currentVerse.sanskrit}</h2>
              <p className="italic font-bold text-lg opacity-40 mb-8">{currentVerse.transliteration}</p>
              <div className="flex justify-center gap-4">
                <button onClick={() => audioState === 'playing' ? togglePause() : playFullVerseSequence(currentVerse, selectedLang)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${isDarkMode ? 'bg-zinc-800 text-[#eba92a]' : 'bg-[#fdfcf0] text-[#eba92a]'} ${audioState === 'playing' ? 'animate-pulse' : ''}`}>
                  {audioState === 'playing' ? <ICONS.Pause className="w-8 h-8" /> : <ICONS.Play className="w-8 h-8 translate-x-0.5" />}
                </button>
                <button onClick={stopCurrentAudio} className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 flex items-center justify-center active:scale-95"><ICONS.Close className="w-6 h-6" /></button>
              </div>
            </section>
            <section className={`rounded-[2rem] p-8 md:p-16 border-4 shadow-xl relative overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-[#eba92a]/10' : 'bg-white border-[#eba92a]/20'}`}>
              <div className="bg-[#eba92a] text-[#3d2b1f] px-8 py-3 rounded-b-2xl font-hindi font-black shadow-lg absolute -top-1 left-1/2 -translate-x-1/2 md:left-12 md:translate-x-0">श्रीकृष्ण वाणी</div>
              <div className="flex justify-end mb-6 mt-4 md:mt-0">
                <input type="range" min="16" max="48" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-32 accent-[#eba92a] h-1.5 cursor-pointer"/>
              </div>
              <div className="space-y-4">
                <p className={`leading-relaxed font-hindi font-bold text-center md:text-left ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} style={{ fontSize: `${fontSize}px` }}>
                   <span className="text-[#eba92a]">हे पार्थ, </span>
                   {currentVerse.meaning[selectedLang]}
                </p>
              </div>
              <div className="mt-12 flex flex-wrap justify-center gap-3">
                <button onClick={handlePrevVerse} className="flex-1 min-w-[120px] px-6 py-4 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-orange-100 dark:border-zinc-700 text-[#eba92a] font-hindi font-black shadow-md flex items-center justify-center gap-2 active:scale-95 hover:bg-orange-50"><ICONS.ChevronLeft className="w-5 h-5" /> पिछला</button>
                <button onClick={() => audioState === 'playing' ? togglePause() : playFullVerseSequence(currentVerse, selectedLang)} className="flex-[2] min-w-[150px] px-8 py-4 rounded-2xl bg-[#eba92a] text-[#3d2b1f] font-hindi font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 hover:bg-[#d89721]">{audioState === 'playing' ? <ICONS.Pause className="w-6 h-6" /> : <ICONS.Play className="w-6 h-6" />} सुने</button>
                <button onClick={handleNextVerse} className="flex-1 min-w-[120px] px-6 py-4 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-orange-100 dark:border-zinc-700 text-[#eba92a] font-hindi font-black shadow-md flex items-center justify-center gap-2 active:scale-95 hover:bg-orange-50">अगला <ICONS.ChevronRight className="w-5 h-5" /></button>
              </div>
            </section>
          </div>
        )}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-3 scale-90 md:scale-100">
           {isRecording && <div className="px-6 py-2 bg-red-600 text-white rounded-full text-lg font-bold shadow-2xl animate-bounce border-2 border-white">बोलिये...</div>}
           {isProcessing && <div className={`px-6 py-2 rounded-full text-lg font-bold shadow-2xl animate-pulse border-2 border-white ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-[#eba92a] text-[#3d2b1f]'}`}>दिव्य वाणी खोज रहा हूँ...</div>}
           <button onClick={handleMicClick} className={`w-20 h-20 rounded-full shadow-2xl flex items-center justify-center transition-all border-4 ${isDarkMode ? 'border-zinc-800' : 'border-[#fdfcf0]'} ${isRecording ? 'bg-red-500' : 'bg-[#eba92a]'}`}><ICONS.Mic className="w-8 h-8 text-white" /></button>
        </div>
      </main>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default App;
