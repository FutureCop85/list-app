import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {injectTheme8BitStyles} from './theme8bit';

// Must run after the './index.css' import above: Vite injects Tailwind's
// compiled stylesheet as a side effect of that import, and this override
// needs to land later in the DOM to win the cascade (see theme8bit.ts).
injectTheme8BitStyles();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
