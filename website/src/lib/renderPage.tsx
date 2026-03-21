import type { ReactElement } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '../styles.css';

export function renderPage(element: ReactElement) {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Missing root element for Pineapple website.');
  }

  createRoot(container).render(<StrictMode>{element}</StrictMode>);
}
