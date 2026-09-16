// Curated list of friendly, memorable 4-letter English words
const FOUR_LETTER_WORDS = [
  'acorn', // will be filtered
  'bear', 'bell', 'bird', 'blue', 'boat', 'book', 'calm', 'camp', 'cave',
  'clay', 'coin', 'cold', 'cone', 'cool', 'cove', 'cozy', 'dawn', 'deer',
  'dock', 'drop', 'dune', 'fair', 'farm', 'fern', 'fine', 'fire', 'fish',
  'flag', 'flow', 'ford', 'free', 'frog', 'gate', 'glad', 'glow', 'gold',
  'good', 'glen', 'hawk', 'hill', 'iris', 'jade', 'keen', 'lake', 'lamp',
  'leaf', 'lime', 'lion', 'lush', 'mint', 'moon', 'moss', 'neat', 'nest',
  'node', 'noon', 'opal', 'park', 'path', 'peak', 'pear', 'pine', 'plum',
  'pond', 'pure', 'rain', 'rare', 'reed', 'reef', 'rich', 'ring', 'ripe',
  'road', 'rock', 'rose', 'rust', 'safe', 'sail', 'sand', 'seed', 'ship',
  'silk', 'slim', 'snow', 'soft', 'song', 'star', 'surf', 'tide', 'tree',
  'vale', 'view', 'warm', 'wave', 'wild', 'wind', 'wise', 'wolf', 'wood',
  'wool', 'zeal'
].filter((w) => w.length === 4);

/**
 * Generates a sync key consisting of two random 4-letter words separated by a hyphen.
 * Example: 'mint-leaf', 'blue-bird', 'warm-sand', 'star-glow'
 */
export function generateFourLetterSyncKey(): string {
  const words = FOUR_LETTER_WORDS;
  const word1 = words[Math.floor(Math.random() * words.length)];
  let word2 = words[Math.floor(Math.random() * words.length)];

  // Ensure two distinct words
  let attempts = 0;
  while (word2 === word1 && attempts < 10) {
    word2 = words[Math.floor(Math.random() * words.length)];
    attempts++;
  }

  return `${word1}-${word2}`;
}
