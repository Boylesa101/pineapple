'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict' | 'locked';
type Result = { ok: true; version: number } | { ok: false; reason: 'conflict' | 'locked' | 'invalid' };

// Debounced autosave with optimistic concurrency: each save sends the version it started from,
// and the server refuses it if someone else saved in between.
export function useAutosave<T>(value: T, initialVersion: number, save: (value: T, version: number) => Promise<Result>, delay = 1200) {
  const [state, setState] = useState<SaveState>('idle');
  const version = useRef(initialVersion);
  const latest = useRef(value);
  const first = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inFlight.current) await inFlight.current;
    const run = (async () => {
      setState('saving');
      try {
        const res = await save(latest.current, version.current);
        if (res.ok) {
          version.current = res.version;
          setState('saved');
        } else setState(res.reason === 'invalid' ? 'error' : res.reason);
      } catch {
        setState('error');
      }
    })();
    inFlight.current = run;
    await run;
    inFlight.current = null;
  }, [save]);

  useEffect(() => {
    latest.current = value;
    if (first.current) {
      first.current = false;
      return;
    }
    setState('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [value, delay, flush]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (timer.current || inFlight.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

  return { state, flush, version };
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
