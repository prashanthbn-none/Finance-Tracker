// App-wide preferences that aren't financial data: theme and display currency.
//
// Kept separate from auth and data so it can load instantly (before a user
// signs in) and persist independently. Theme is applied to <html data-theme>
// so the CSS variable swap in global.css does all the visual work.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SettingsContext = createContext(null);
const KEY = 'pft:settings';

const DEFAULTS = { theme: 'system', currency: 'INR' };

function load() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}), currency: 'INR' };
  } catch {
    return { ...DEFAULTS };
  }
}

function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Resolve 'system' to an actual light/dark value.
function effectiveTheme(theme) {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return prefersDark() ? 'dark' : 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  const eff = effectiveTheme(theme);
  if (eff === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);

  // Apply theme on mount and whenever it changes.
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // If the user follows the system theme, react to OS changes live.
  useEffect(() => {
    if (settings.theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const persist = useCallback((next) => {
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  // Briefly enable a transition class so the switch glides instead of snapping.
  const setTheme = useCallback((theme) => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 280);
    persist({ ...settings, theme });
  }, [settings, persist]);

  const toggleTheme = useCallback(() => {
    const eff = effectiveTheme(settings.theme);
    setTheme(eff === 'dark' ? 'light' : 'dark');
  }, [settings.theme, setTheme]);

  const setCurrency = useCallback(() => {
    persist({ ...settings, currency: 'INR' });
  }, [settings, persist]);

  return (
    <SettingsContext.Provider value={{
      ...settings,
      resolvedTheme: effectiveTheme(settings.theme),
      setTheme, toggleTheme, setCurrency,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
