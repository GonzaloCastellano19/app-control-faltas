import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { createInitialData } from '../lib/seed';
import { DATA_KEY, THEME_KEY, loadData, parseData, safeStorage, saveData, type StorageIssue } from '../lib/storage';
import type { Absence, AppData, Settings } from '../lib/types';

type Action =
  | { type: 'upsertAbsence'; absence: Absence }
  | { type: 'deleteAbsence'; id: string }
  | { type: 'setModuleHours'; moduleId: string; totalHours: number | null }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'replace'; data: AppData };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'upsertAbsence': {
      const exists = state.absences.some((a) => a.id === action.absence.id);
      return {
        ...state,
        absences: exists
          ? state.absences.map((a) => (a.id === action.absence.id ? action.absence : a))
          : [...state.absences, action.absence],
      };
    }
    case 'deleteAbsence':
      return { ...state, absences: state.absences.filter((a) => a.id !== action.id) };
    case 'setModuleHours':
      return {
        ...state,
        modules: state.modules.map((m) => (m.id === action.moduleId ? { ...m, totalHours: action.totalHours } : m)),
      };
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return action.data;
  }
}

export type ThemeChoice = 'system' | 'light' | 'dark';

function readTheme(): ThemeChoice {
  try {
    const t = safeStorage()?.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface StoreValue {
  data: AppData;
  dispatch: (action: Action) => void;
  storageIssue: StorageIssue;
  saveFailed: boolean;
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  toast: Toast | null;
  showToast: (message: string, undo?: () => void) => void;
  dismissToast: () => void;
  resetData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadData());
  const [data, dispatch] = useReducer(reducer, initial.data);
  const [saveFailed, setSaveFailed] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>(readTheme);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);
  const firstRun = useRef(true);

  useEffect(() => {
    // Con datos dañados no se sobrescribe nada hasta que la persona haga un cambio.
    if (firstRun.current) {
      firstRun.current = false;
      if (initial.issue === 'damaged') return;
    }
    setSaveFailed(!saveData(data));
  }, [data, initial.issue]);

  // Mantiene sincronizadas varias pestañas abiertas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DATA_KEY || !e.newValue) return;
      try {
        const next = parseData(JSON.parse(e.newValue));
        if (next) dispatch({ type: 'replace', data: next });
      } catch {
        // Un valor ilegible de otra pestaña se ignora.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    const root = document.documentElement;
    try {
      if (t === 'system') safeStorage()?.removeItem(THEME_KEY);
      else safeStorage()?.setItem(THEME_KEY, t);
    } catch {
      // El tema se aplica igualmente durante la sesión.
    }
    if (t === 'system') delete root.dataset.theme;
    else root.dataset.theme = t;
  }, []);

  const showToast = useCallback((message: string, undo?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, undo });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 9000 : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const resetData = useCallback(() => dispatch({ type: 'replace', data: createInitialData() }), []);

  const value = useMemo(
    () => ({ data, dispatch, storageIssue: initial.issue, saveFailed, theme, setTheme, toast, showToast, dismissToast, resetData }),
    [data, initial.issue, saveFailed, theme, setTheme, toast, showToast, dismissToast, resetData],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore debe usarse dentro de StoreProvider');
  return value;
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
