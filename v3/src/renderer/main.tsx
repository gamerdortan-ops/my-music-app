import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// @ts-expect-error CSS is handled by the renderer bundler.
import './index.css'; // Make sure this matches your tailwind styles file!

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
