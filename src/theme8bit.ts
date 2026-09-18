// Retro pixel-UI theme CSS, injected at runtime rather than routed through the
// Tailwind/Vite CSS build pipeline. @layer theme is a Tailwind-owned layer
// reserved for its own @theme tokens: both an unlayered !important override
// and a same-layer override placed in a build-processed .css file were
// silently stripped, or positioned earlier than (and thus lost the cascade
// to) Vite's own injected stylesheet. Appending a plain <style> tag here,
// from code that runs after `import './index.css'` has already executed,
// guarantees it lands later in the DOM and reliably overrides Tailwind's
// generated CSS variables that every bg-zinc-*/font-sans/etc. utility reads
// via var().
const THEME_8BIT_CSS = `
.theme-8bit {
  --font-sans: 'VT323', -apple-system, sans-serif;
  --font-mono: 'Press Start 2P', ui-monospace, monospace;
  --font-serif: 'Press Start 2P', Georgia, serif;
  --font-cursive: 'Press Start 2P', cursive;

  --color-zinc-50: #ffffff;
  --color-zinc-100: #f2f2f2;
  --color-zinc-200: #d9d9d9;
  --color-zinc-300: #b3b3b3;
  --color-zinc-400: #8a8a8a;
  --color-zinc-500: #666666;
  --color-zinc-600: #4d4d4d;
  --color-zinc-700: #333333;
  --color-zinc-800: #1a1a1a;
  --color-zinc-900: #0d0d0d;
  --color-zinc-950: #000000;

  --color-emerald-50: #eafff0;
  --color-emerald-100: #c8ffd9;
  --color-emerald-200: #97ffb8;
  --color-emerald-300: #5cff95;
  --color-emerald-400: #2dff72;
  --color-emerald-500: #00e64d;
  --color-emerald-600: #00b83d;
  --color-emerald-700: #009130;
  --color-emerald-800: #007526;
  --color-emerald-950: #00330f;

  --color-amber-200: #fff3b0;
  --color-amber-300: #ffe066;
  --color-amber-400: #ffd21f;
  --color-amber-500: #ffb800;
  --color-amber-700: #a86a00;

  --color-rose-50: #fff0f2;
  --color-rose-100: #ffd6dc;
  --color-rose-200: #ffadb8;
  --color-rose-300: #ff8093;
  --color-rose-400: #ff4d6d;
  --color-rose-500: #ff1f4d;
  --color-rose-600: #e6003d;
  --color-rose-700: #b80030;
  --color-rose-800: #8a0024;
  --color-rose-900: #5c0019;
  --color-rose-950: #33000e;
}

html.theme-8bit {
  font-size: 148%;
  -webkit-font-smoothing: none;
}
.theme-8bit [class*='rounded'] {
  border-radius: 0 !important;
}
.theme-8bit [class*='shadow'] {
  box-shadow: 3px 3px 0 0 var(--color-zinc-950) !important;
}
.theme-8bit [class*='backdrop-blur'] {
  backdrop-filter: none !important;
}
.theme-8bit .blur-3xl {
  display: none !important;
}
.theme-8bit .italic {
  font-style: normal !important;
}
`;

let injected = false;

export function injectTheme8BitStyles() {
  if (injected || typeof document === 'undefined') return;
  if (document.getElementById('theme-8bit-style')) {
    injected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'theme-8bit-style';
  style.textContent = THEME_8BIT_CSS;
  document.head.appendChild(style);
  injected = true;
}
