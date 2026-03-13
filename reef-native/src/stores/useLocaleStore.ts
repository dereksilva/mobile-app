import {create} from 'zustand';
import * as Storage from '../services/StorageService';
import {StorageKey} from '../types';

export type SupportedLanguage = 'en' | 'hi' | 'it';

interface LocaleState {
  selectedLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  loadFromStorage: () => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  selectedLanguage: 'en',

  setLanguage: (lang: SupportedLanguage) => {
    Storage.setValue(StorageKey.LANGUAGE, lang);
    set({selectedLanguage: lang});
  },

  loadFromStorage: () => {
    const stored = Storage.getValue(StorageKey.LANGUAGE) as
      | SupportedLanguage
      | undefined;
    if (stored) set({selectedLanguage: stored});
  },
}));
