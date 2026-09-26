'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict' | 'locked';
type Result = { ok: true; version: number } | { ok: false; reason: 'conflict' | 'locked' | 'invalid' };

// Debounced autosave with optimistic concurrency: each save sends the version it started from,
// and the server refuses it if someone else saved in between. Saves run one at a time, and keep
// going until the server has the latest value.
export function useAutosave<T>(value: T, initialVersion: number, save: (value: T, version: number) => Promise<Result>, delay = 1200) {
  const [state, setState] = useState<SaveState>('idle');
  const version = useRef(initialVersion);
  const latest = useRef(value);
  const stored = useRef(value); // the value the server last accepted
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Resolves true once the server has everything typed so far, false if a save failed.
  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const run = queue.current.then(async () => {
      while (latest.current !== stored.current) {
        const snapshot = latest.current;
        setState('saving');
        try {
          const res = await saveRef.current(snapshot, version.current);
          if (!res.ok) {
            setState(res.reason === 'invalid' ? 'error' : res.reason);
            return false;
          }
          version.current = res.version;
          stored.current = snapshot;
        } catch {
          setState('error');
          return false;
        }
      }
      setState((s) => (s === 'saving' || s === 'dirty' ? 'saved' : s));
      return true;
    });
    queue.current = run.catch(() => false);
    return run;
  }, []);

  useEffect(() => {
    if (value === latest.current) return; // first render, or nothing changed
    latest.current = value;
    setState('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [value, delay, flush]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (latest.current !== stored.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

  // For a change saved outside the autosave (e.g. a post's address) that moved the version on.
  const setVersion = useCallback((v: number) => {
    version.current = v;
  }, []);

  return { state, flush, version, setVersion };
}

export function SaveIndicator({ state }: { state: SaveState }) {
  const text: Record<SaveState, string> = {
    idle: 'All changes saved',
    dirty: 'Unsaved changes…',
    saving: 'Saving…',
    saved: 'All changes saved',
    error: 'Couldn’t save. Check your connection; we’ll retry when you edit again.',
    conflict: 'Someone else changed this. Reload the page to see their version.',
    locked: 'This has been submitted and can’t be edited.',
  };
  const tone = state === 'error' || state === 'conflict' ? 'red' : state === 'locked' ? 'amber' : state === 'saved' || state === 'idle' ? 'green' : '';
  return (
    <span className={`pill ${tone}`} role="status" aria-live="polite">
      {text[state]}
    </span>
  );
}
