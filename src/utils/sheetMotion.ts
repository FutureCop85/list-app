// Shared enter/exit motion for bottom sheets and their backdrops.
// Enter springs up; exit mirrors it with a quick ease-in slide that fades fully
// out, so the sheet never lingers at the bottom and pops out of existence
// (on wider screens the sheet is centred, so sliding alone doesn't clear it).
const EXIT_DURATION = 0.24;
const EXIT_EASE = [0.4, 0, 1, 1] as const;

export const sheetMotion = {
  initial: { y: '100%', opacity: 0.9 },
  animate: { y: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 320 } },
  exit: { y: '100%', opacity: 0, transition: { duration: EXIT_DURATION, ease: EXIT_EASE } },
} as const;

export const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: EXIT_DURATION, ease: 'easeIn' } },
} as const;
