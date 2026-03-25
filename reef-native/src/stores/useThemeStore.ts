/**
 * Theme store — manages dark/light theme preference with Zustand.
 *
 * Default is 'dark'. Persisted to AsyncStorage.
 */

import {create} from 'zustand';
import {getValue, setValue} from '../services/StorageService';
import {StorageKey} from '../types';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  loadFromStorage: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark', // dark by default

  setTheme: (mode: ThemeMode) => {
    setValue(StorageKey.THEME, mode);
    set({theme: mode});
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    setValue(StorageKey.THEME, next);
    set({theme: next});
  },

  loadFromStorage: () => {
    const stored = getValue(StorageKey.THEME) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      set({theme: stored});
    }
    // else keep default 'dark'
  },
}));
