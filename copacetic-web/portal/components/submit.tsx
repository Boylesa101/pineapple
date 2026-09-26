'use client';
import { useFormStatus } from 'react-dom';

// A submit button that disables itself while its form's server action runs.
export function Submit({ children, className = 'btn', pending }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={busy} aria-busy={busy}>
      {busy && pending ? pending : children}
    </button>
  );
}
