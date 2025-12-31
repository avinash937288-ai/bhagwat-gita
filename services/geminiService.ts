
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Language, UserVoiceIntent, Verse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const parseVoiceIntent = async (audioBase64: string): Promise<UserVoiceIntent> => {
  const prompt = `Intent: SEARCH (chapter/verse) or LANG (hi/en/bhojpuri). Audio is Hindi/English/Bhojpuri. Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType: 'audio/webm' } },
          { text: prompt }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for maximum speed
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['VERSE_SEARCH', 'LANGUAGE_CHANGE', 'UNKNOWN'] },
            chapter: { type: Type.NUMBER },
            verse: { type: Type.NUMBER },
            language: { type: Type.STRING, enum: ['hi', 'en', 'bhojpuri'] }
          },
          required: ['type']
        }
      }
    });

    return JSON.parse(response.text || '{}') as UserVoiceIntent;
  } catch (e) {
    console.error("Voice recognition failed:", e);
    return { type: 'UNKNOWN' };
  }
};

export const fetchVerseContent = async (chapter: number, verse: number): Promise<Verse | null> => {
  const prompt = `Gita Ch ${chapter} V ${verse}. 1st person Krishna Vani. Simple warm hi, en, bhojpuri meanings.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sanskrit: { type: Type.STRING },
            transliteration: { type: Type.STRING },
            meaning: {
              type: Type.OBJECT,
              properties: {
                hi: { type: Type.STRING },
                en: { type: Type.STRING },
                bhojpuri: { type: Type.STRING }
              }
            }
          },
          required: ['sanskrit', 'meaning']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return { chapter, verse, ...data };
  } catch (e) {
    return null;
  }
};

export const generateSpeech = async (text: string, lang: Language): Promise<string | undefined> => {
  const voiceMap = {
    [Language.HINDI]: 'Kore',
    [Language.ENGLISH]: 'Puck',
    [Language.BHOJPURI]: 'Kore',
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Krishna Vani, divine tone: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceMap[lang] || 'Puck' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const decodeBase64Audio = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};
