
export enum Language {
  HINDI = 'hi',
  ENGLISH = 'en',
  BHOJPURI = 'bhojpuri'
}

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
  type: 'VERSE_SEARCH' | 'NAVIGATION' | 'LANGUAGE_CHANGE' | 'UNKNOWN';
  chapter?: number;
  verse?: number;
  direction?: 'next' | 'previous';
  language?: Language;
}
