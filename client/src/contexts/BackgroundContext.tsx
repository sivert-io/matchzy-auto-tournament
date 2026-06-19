import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface MapBackground {
  id: string;
  label: string;
  /** Full-resolution image used for the page background. */
  full: string;
  /** Small image used in the switcher grid. */
  thumb: string;
}

const BG = '/backgrounds';

// CS2 competitive map pool. Maps shipped as optimized JPEGs (with thumbs); a few
// source files were WebP and are used directly (full doubles as thumb).
export const MAP_BACKGROUNDS: MapBackground[] = [
  { id: 'ancient', label: 'Ancient', full: `${BG}/de_ancient.webp`, thumb: `${BG}/de_ancient.webp` },
  { id: 'anubis', label: 'Anubis', full: `${BG}/de_anubis.jpg`, thumb: `${BG}/de_anubis_thumb.jpg` },
  { id: 'dust2', label: 'Dust II', full: `${BG}/de_dust2.jpg`, thumb: `${BG}/de_dust2_thumb.jpg` },
  { id: 'inferno', label: 'Inferno', full: `${BG}/de_inferno.jpg`, thumb: `${BG}/de_inferno_thumb.jpg` },
  { id: 'mirage', label: 'Mirage', full: `${BG}/de_mirage.webp`, thumb: `${BG}/de_mirage.webp` },
  { id: 'nuke', label: 'Nuke', full: `${BG}/de_nuke.jpg`, thumb: `${BG}/de_nuke_thumb.jpg` },
  { id: 'overpass', label: 'Overpass', full: `${BG}/de_overpass.webp`, thumb: `${BG}/de_overpass.webp` },
  { id: 'train', label: 'Train', full: `${BG}/de_train.jpg`, thumb: `${BG}/de_train_thumb.jpg` },
  { id: 'vertigo', label: 'Vertigo', full: `${BG}/de_vertigo.jpg`, thumb: `${BG}/de_vertigo_thumb.jpg` },
];

const DEFAULT_ID = 'mirage';
const STORAGE_KEY = 'fragbase:bg';

interface BackgroundContextValue {
  maps: MapBackground[];
  mapId: string;
  current: MapBackground;
  setMapId: (id: string) => void;
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

function readStoredId(): string {
  if (typeof window === 'undefined') return DEFAULT_ID;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && MAP_BACKGROUNDS.some((m) => m.id === stored)) return stored;
  return DEFAULT_ID;
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [mapId, setMapIdState] = useState<string>(readStoredId);

  const setMapId = useCallback((id: string) => {
    if (!MAP_BACKGROUNDS.some((m) => m.id === id)) return;
    setMapIdState(id);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mapId);
    } catch {
      // Ignore storage failures (private mode, quota) — selection still applies for the session.
    }
  }, [mapId]);

  const value = useMemo<BackgroundContextValue>(() => {
    const current = MAP_BACKGROUNDS.find((m) => m.id === mapId) ?? MAP_BACKGROUNDS[0];
    return { maps: MAP_BACKGROUNDS, mapId, current, setMapId };
  }, [mapId, setMapId]);

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground(): BackgroundContextValue {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error('useBackground must be used within a BackgroundProvider');
  return ctx;
}
