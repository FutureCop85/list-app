export type PastelColorId = 'sand' | 'peach' | 'mint' | 'sky' | 'lavender' | 'rose' | 'coral' | 'lemon';

export interface PastelPalette {
  id: PastelColorId;
  label: string;
  dotColor: string; // for color picker preview
  // Tab styling - solid, bright happy pastel pills
  tabActiveBg: string;
  tabActiveText: string;
  tabActiveBorder: string;
  tabActiveBadgeBg: string;
  tabActiveBadgeText: string;
  tabActiveMenuBtn: string;
  // Tab inactive styling
  tabInactiveBg: string;
  tabInactiveText: string;
  tabInactiveBorder: string;
  tabInactiveBadgeBg: string;
  tabInactiveBadgeText: string;
  // Card / accent tinting
  cardTint: string;
  subtleTint: string;
  accentBorder: string;
  pillBg: string;
  pillText: string;
}

export const PASTEL_PALETTES: Record<PastelColorId, PastelPalette> = {
  sand: {
    id: 'sand',
    label: 'Warm Sand',
    dotColor: '#fde68a', // Bright sunny warm sand
    tabActiveBg: 'bg-[#fde68a]',
    tabActiveText: 'text-[#451a03]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#451a03]/15',
    tabActiveBadgeText: 'text-[#451a03]',
    tabActiveMenuBtn: 'text-[#451a03]/60 hover:text-[#451a03]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#fefce8] dark:bg-[#1c1808]',
    subtleTint: 'bg-[#fef3c7] dark:bg-[#2c240b]',
    accentBorder: 'border-[#fcd34d]',
    pillBg: 'bg-[#fde68a]',
    pillText: 'text-[#451a03]',
  },
  peach: {
    id: 'peach',
    label: 'Bright Peach',
    dotColor: '#fdba74', // Bright happy candy peach
    tabActiveBg: 'bg-[#fdba74]',
    tabActiveText: 'text-[#431407]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#431407]/15',
    tabActiveBadgeText: 'text-[#431407]',
    tabActiveMenuBtn: 'text-[#431407]/60 hover:text-[#431407]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#fff7ed] dark:bg-[#1f1008]',
    subtleTint: 'bg-[#ffedd5] dark:bg-[#32170c]',
    accentBorder: 'border-[#fb923c]',
    pillBg: 'bg-[#fdba74]',
    pillText: 'text-[#431407]',
  },
  mint: {
    id: 'mint',
    label: 'Bright Mint',
    dotColor: '#86efac', // Fresh luminous happy mint
    tabActiveBg: 'bg-[#86efac]',
    tabActiveText: 'text-[#064e3b]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#064e3b]/15',
    tabActiveBadgeText: 'text-[#064e3b]',
    tabActiveMenuBtn: 'text-[#064e3b]/60 hover:text-[#064e3b]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#f0fdf4] dark:bg-[#071f16]',
    subtleTint: 'bg-[#dcfce7] dark:bg-[#0d3424]',
    accentBorder: 'border-[#4ade80]',
    pillBg: 'bg-[#86efac]',
    pillText: 'text-[#064e3b]',
  },
  sky: {
    id: 'sky',
    label: 'Bright Sky',
    dotColor: '#7dd3fc', // Clear vivid sky blue
    tabActiveBg: 'bg-[#7dd3fc]',
    tabActiveText: 'text-[#082f49]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#082f49]/15',
    tabActiveBadgeText: 'text-[#082f49]',
    tabActiveMenuBtn: 'text-[#082f49]/60 hover:text-[#082f49]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#f0f9ff] dark:bg-[#081e2b]',
    subtleTint: 'bg-[#e0f2fe] dark:bg-[#0d2f44]',
    accentBorder: 'border-[#38bdf8]',
    pillBg: 'bg-[#7dd3fc]',
    pillText: 'text-[#082f49]',
  },
  lavender: {
    id: 'lavender',
    label: 'Bright Lilac',
    dotColor: '#c4b5fd', // Sweet candy lilac
    tabActiveBg: 'bg-[#c4b5fd]',
    tabActiveText: 'text-[#3b0764]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#3b0764]/15',
    tabActiveBadgeText: 'text-[#3b0764]',
    tabActiveMenuBtn: 'text-[#3b0764]/60 hover:text-[#3b0764]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#faf5ff] dark:bg-[#1a082c]',
    subtleTint: 'bg-[#f3e8ff] dark:bg-[#280d44]',
    accentBorder: 'border-[#a78bfa]',
    pillBg: 'bg-[#c4b5fd]',
    pillText: 'text-[#3b0764]',
  },
  rose: {
    id: 'rose',
    label: 'Blossom Pink',
    dotColor: '#f472b6', // Sweet cheerful blossom
    tabActiveBg: 'bg-[#f9a8d4]',
    tabActiveText: 'text-[#500724]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#500724]/15',
    tabActiveBadgeText: 'text-[#500724]',
    tabActiveMenuBtn: 'text-[#500724]/60 hover:text-[#500724]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#fdf2f8] dark:bg-[#240613]',
    subtleTint: 'bg-[#fce7f3] dark:bg-[#38091f]',
    accentBorder: 'border-[#f472b6]',
    pillBg: 'bg-[#f9a8d4]',
    pillText: 'text-[#500724]',
  },
  coral: {
    id: 'coral',
    label: 'Bright Melon',
    dotColor: '#fb7185', // Radiant tropical watermelon
    tabActiveBg: 'bg-[#fda4af]',
    tabActiveText: 'text-[#4c0519]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#4c0519]/15',
    tabActiveBadgeText: 'text-[#4c0519]',
    tabActiveMenuBtn: 'text-[#4c0519]/60 hover:text-[#4c0519]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#fff1f2] dark:bg-[#23040c]',
    subtleTint: 'bg-[#ffe4e6] dark:bg-[#380714]',
    accentBorder: 'border-[#fb7185]',
    pillBg: 'bg-[#fda4af]',
    pillText: 'text-[#4c0519]',
  },
  lemon: {
    id: 'lemon',
    label: 'Sunny Lemon',
    dotColor: '#fde047', // Radiant zesty pastel yellow
    tabActiveBg: 'bg-[#fef08a]',
    tabActiveText: 'text-[#422006]',
    tabActiveBorder: 'border-transparent',
    tabActiveBadgeBg: 'bg-[#422006]/15',
    tabActiveBadgeText: 'text-[#422006]',
    tabActiveMenuBtn: 'text-[#422006]/60 hover:text-[#422006]',
    tabInactiveBg: 'bg-zinc-200/60 dark:bg-zinc-800/80',
    tabInactiveText: 'text-zinc-700 dark:text-zinc-300',
    tabInactiveBorder: 'border-transparent',
    tabInactiveBadgeBg: 'bg-zinc-300/60 dark:bg-zinc-700/80',
    tabInactiveBadgeText: 'text-zinc-700 dark:text-zinc-300',
    cardTint: 'bg-[#fefce8] dark:bg-[#1a1405]',
    subtleTint: 'bg-[#fef9c3] dark:bg-[#2d2208]',
    accentBorder: 'border-[#facc15]',
    pillBg: 'bg-[#fef08a]',
    pillText: 'text-[#422006]',
  },
};

export const PASTEL_ORDER: PastelColorId[] = [
  'sand',
  'peach',
  'mint',
  'sky',
  'lavender',
  'rose',
  'coral',
  'lemon',
];

export function getPastelPalette(color?: string | null): PastelPalette {
  if (color && color in PASTEL_PALETTES) {
    return PASTEL_PALETTES[color as PastelColorId];
  }
  return PASTEL_PALETTES.sand;
}

export function getDefaultColorForIndex(index: number): PastelColorId {
  return PASTEL_ORDER[index % PASTEL_ORDER.length];
}

export function getColorForList(list: { id: string; name: string; color?: string }, index = 0): PastelPalette {
  if (list.color && list.color in PASTEL_PALETTES) {
    return PASTEL_PALETTES[list.color as PastelColorId];
  }
  // Deterministic color assignment based on list ID and name hash
  let hash = 0;
  const str = (list.id || '') + (list.name || '') + index;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const colorKey = PASTEL_ORDER[Math.abs(hash) % PASTEL_ORDER.length];
  return PASTEL_PALETTES[colorKey];
}
