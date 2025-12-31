
import React from 'react';
import { Chapter } from './types';

export const GITA_CHAPTERS: Chapter[] = [
  { id: 1, name: "Arjuna Visada Yoga", translation: "Arjuna's Dilemma", verses_count: 47 },
  { id: 2, name: "Sankhya Yoga", translation: "The Path of Knowledge", verses_count: 72 },
  { id: 3, name: "Karma Yoga", translation: "The Path of Action", verses_count: 43 },
  { id: 4, name: "Jnana Karma Sanyasa Yoga", translation: "The Path of Knowledge & Discipline", verses_count: 42 },
  { id: 5, name: "Karma Sanyasa Yoga", translation: "The Path of Renunciation", verses_count: 29 },
  { id: 6, name: "Dhyana Yoga", translation: "The Path of Meditation", verses_count: 47 },
  { id: 7, name: "Jnana Vijnana Yoga", translation: "The Path of Knowledge & Realization", verses_count: 30 },
  { id: 8, name: "Akshara Brahma Yoga", translation: "The Path of the Eternal God", verses_count: 28 },
  { id: 9, name: "Raja Vidya Raja Guhya Yoga", translation: "The Most Confidential Knowledge", verses_count: 34 },
  { id: 10, name: "Vibhuti Yoga", translation: "The Infinite Glories of God", verses_count: 42 },
  { id: 11, name: "Vishwarupa Darshana Yoga", translation: "The Vision of the Universal Form", verses_count: 55 },
  { id: 12, name: "Bhakti Yoga", translation: "The Path of Devotion", verses_count: 20 },
  { id: 13, name: "Kshetra Kshetrajna Vibhaga Yoga", translation: "The Field & the Knower of the Field", verses_count: 35 },
  { id: 14, name: "Gunatraya Vibhaga Yoga", translation: "The Three Modes of Material Nature", verses_count: 27 },
  { id: 15, name: "Purushottama Yoga", translation: "The Yoga of the Supreme Person", verses_count: 20 },
  { id: 16, name: "Daivasura Sampad Vibhaga Yoga", translation: "Divine & Demoniac Natures", verses_count: 24 },
  { id: 17, name: "Shraddhatraya Vibhaga Yoga", translation: "The Three Divisions of Faith", verses_count: 28 },
  { id: 18, name: "Moksha Sanyasa Yoga", translation: "Final Revelations of Ultimate Truth", verses_count: 78 },
];

export const ICONS = {
  Mic: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  ),
  Share: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  ),
  Music: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Play: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  Menu: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronLeft: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Moon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Sun: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  ),
  Krishna: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12,2C11.5,2 11,2.1 10.5,2.3C10.7,2.5 10.9,2.7 11.1,3C11.6,3.6 12,4.3 12.3,5.1C12.6,5.8 12.8,6.6 12.9,7.5C13.1,9.3 12.8,11.1 12.1,12.8C11.4,14.5 10.3,16 9,17.2C7.7,18.4 6.2,19.3 4.5,19.8C2.8,20.3 1,20.4 -0.8,20.1C-0.3,20.7 0.3,21.2 1,21.6C2.7,22.3 4.6,22.5 6.5,22.2C8.4,21.9 10.2,21.1 11.7,19.8C13.2,18.5 14.4,16.8 15.1,14.9C15.8,13 16,11 15.6,9C15.2,7 14.3,5.1 12.9,3.6C12.7,3.3 12.4,3.1 12.1,2.9C12.1,2.6 12.1,2.3 12,2M13.5,2C13.5,2 14,3 15,4C16,5 18,6 18,6C18,6 17,7 16,7C15,7 13.5,6 13.5,6L13.5,2M12,1.5C12,1.5 12.5,0.5 13.5,0.5C14.5,0.5 15,1.5 15,1.5L12,1.5Z" />
    </svg>
  )
};
