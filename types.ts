
export enum Language {
  HINDI = 'hi',
  ENGLISH = 'en',
  BHOJPURI = 'bhojpuri'
}

export type UserEmotion = 'tension' | 'anger' | 'confusion' | 'loss' | 'motivation';

export interface Verse {
  chapter: number;
  verse: number;
  sanskrit: string;
  transliteration: string;
  meaning: {
    [key in Language]: string;
  };
}

export interface Chapter {
  id: number;
  name: string;
  translation: string;
  verses_count: number;
}

export interface UserVoiceIntent {
  type: 'VERSE_SEARCH' | 'NAVIGATION' | 'LANGUAGE_CHANGE' | 'EMOTION_SEARCH' | 'UNKNOWN';
  chapter?: number;
  verse?: number;
  direction?: 'next' | 'previous';
  language?: Language;
  emotion?: UserEmotion;
}
