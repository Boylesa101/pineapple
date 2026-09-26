'use client';
import { useFormStatus } from 'react-dom';

// A submit button that asks first (for deletes and other things that can't be undone).
export function ConfirmSubmit({ children, confirm, className = 'btn danger' }: { children: React.ReactNode; confirm: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
