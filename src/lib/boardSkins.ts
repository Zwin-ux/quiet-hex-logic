/**
 * Board skin configuration for Hex game
 * Defines color themes and visual styles
 */

export type BoardSkin = {
  id: string;
  name: string;
  description: string;
  preview: string;
  isPremium?: boolean;
  colors: {
    background: string;
    empty: string;
    emptyHover: string;
    emptyBorder: string;
    player1: string;
    player1Glow: string;
    player1Winning: string;
    player2: string;
    player2Glow: string;
    player2Winning: string;
    edgePlayer1: string;
    edgePlayer2: string;
  };
  animationType?: 'galaxy' | 'aurora' | 'none';
};

export const boardSkins: BoardSkin[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional Indigo and Ochre',
    preview: '🎨',
    colors: {
      background: 'hsl(40 33% 98%)',
      empty: 'hsl(40 33% 96%)',
      emptyHover: 'hsl(40 60% 85%)',
      emptyBorder: 'hsl(39 13% 71%)',
      player1: 'hsl(223 45% 29%)',
      player1Glow: '#818cf8',
      player1Winning: 'hsl(223 45% 35%)',
      player2: 'hsl(40 76% 43%)',
      player2Glow: '#f59e0b',
      player2Winning: 'hsl(40 76% 50%)',
      edgePlayer1: 'hsl(223 45% 29% / 0.5)',
      edgePlayer2: 'hsl(40 76% 43% / 0.5)',
    },
  },
  {
    id: 'neon',
    name: 'Neon Night',
    description: 'Cyberpunk glow',
    preview: '⚡',
    colors: {
      background: 'hsl(260 40% 8%)',
      empty: 'hsl(260 30% 12%)',
      emptyHover: 'hsl(260 40% 18%)',
      emptyBorder: 'hsl(260 30% 25%)',
      player1: 'hsl(280 100% 50%)',
      player1Glow: '#e879f9',
      player1Winning: 'hsl(280 100% 60%)',
      player2: 'hsl(180 100% 45%)',
      player2Glow: '#06b6d4',
      player2Winning: 'hsl(180 100% 55%)',
      edgePlayer1: 'hsl(280 100% 50% / 0.6)',
      edgePlayer2: 'hsl(180 100% 45% / 0.6)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural earth tones',
    preview: '🌲',
    colors: {
      background: 'hsl(120 25% 95%)',
      empty: 'hsl(120 20% 90%)',
      emptyHover: 'hsl(120 25% 80%)',
      emptyBorder: 'hsl(120 15% 60%)',
      player1: 'hsl(160 60% 25%)',
      player1Glow: '#34d399',
      player1Winning: 'hsl(160 60% 35%)',
      player2: 'hsl(30 80% 40%)',
      player2Glow: '#fb923c',
      player2Winning: 'hsl(30 80% 50%)',
      edgePlayer1: 'hsl(160 60% 25% / 0.5)',
      edgePlayer2: 'hsl(30 80% 40% / 0.5)',
    },
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Calm blue depths',
    preview: '🌊',
    colors: {
      background: 'hsl(210 40% 15%)',
      empty: 'hsl(210 35% 20%)',
      emptyHover: 'hsl(210 40% 28%)',
      emptyBorder: 'hsl(210 30% 35%)',
      player1: 'hsl(200 95% 45%)',
      player1Glow: '#38bdf8',
      player1Winning: 'hsl(200 95% 55%)',
      player2: 'hsl(340 75% 55%)',
      player2Glow: '#f472b6',
      player2Winning: 'hsl(340 75% 65%)',
      edgePlayer1: 'hsl(200 95% 45% / 0.6)',
      edgePlayer2: 'hsl(340 75% 55% / 0.6)',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean monochrome',
    preview: '⚪',
    colors: {
      background: 'hsl(0 0% 100%)',
      empty: 'hsl(0 0% 96%)',
      emptyHover: 'hsl(0 0% 90%)',
      emptyBorder: 'hsl(0 0% 80%)',
      player1: 'hsl(0 0% 10%)',
      player1Glow: '#737373',
      player1Winning: 'hsl(0 0% 20%)',
      player2: 'hsl(0 0% 60%)',
      player2Glow: '#a3a3a3',
      player2Winning: 'hsl(0 0% 70%)',
      edgePlayer1: 'hsl(0 0% 10% / 0.5)',
      edgePlayer2: 'hsl(0 0% 60% / 0.5)',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm evening hues',
    preview: '🌅',
    colors: {
      background: 'hsl(30 60% 95%)',
      empty: 'hsl(30 50% 90%)',
      emptyHover: 'hsl(30 60% 80%)',
      emptyBorder: 'hsl(30 40% 70%)',
      player1: 'hsl(340 80% 50%)',
      player1Glow: '#f87171',
      player1Winning: 'hsl(340 80% 60%)',
      player2: 'hsl(50 95% 50%)',
      player2Glow: '#fbbf24',
      player2Winning: 'hsl(50 95% 60%)',
      edgePlayer1: 'hsl(340 80% 50% / 0.5)',
      edgePlayer2: 'hsl(50 95% 50% / 0.5)',
    },
  },
  // Premium skins
  {
    id: 'galaxy',
    name: 'Galaxy',
    description: 'Cosmic space theme',
    preview: '🌌',
    isPremium: true,
    animationType: 'galaxy',
    colors: {
      background: 'hsl(270 50% 8%)',
      empty: 'hsl(270 40% 12%)',
      emptyHover: 'hsl(270 50% 18%)',
      emptyBorder: 'hsl(270 30% 25%)',
      player1: 'hsl(200 100% 60%)',
      player1Glow: '#60a5fa',
      player1Winning: 'hsl(200 100% 70%)',
      player2: 'hsl(320 100% 60%)',
      player2Glow: '#f472b6',
      player2Winning: 'hsl(320 100% 70%)',
      edgePlayer1: 'hsl(200 100% 60% / 0.6)',
      edgePlayer2: 'hsl(320 100% 60% / 0.6)',
    },
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Gold and purple luxury',
    preview: '👑',
    isPremium: true,
    animationType: 'galaxy',
    colors: {
      background: 'hsl(280 50% 12%)',
      empty: 'hsl(280 40% 18%)',
      emptyHover: 'hsl(280 50% 25%)',
      emptyBorder: 'hsl(280 30% 35%)',
      player1: 'hsl(45 100% 50%)',
      player1Glow: '#fbbf24',
      player1Winning: 'hsl(45 100% 60%)',
      player2: 'hsl(280 80% 60%)',
      player2Glow: '#a855f7',
      player2Winning: 'hsl(280 80% 70%)',
      edgePlayer1: 'hsl(45 100% 50% / 0.6)',
      edgePlayer2: 'hsl(280 80% 60% / 0.6)',
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Pixel art nostalgia',
    preview: '🕹️',
    isPremium: true,
    animationType: 'galaxy',
    colors: {
      background: 'hsl(220 15% 15%)',
      empty: 'hsl(220 15% 22%)',
      emptyHover: 'hsl(220 20% 30%)',
      emptyBorder: 'hsl(220 10% 40%)',
      player1: 'hsl(120 80% 45%)',
      player1Glow: '#4ade80',
      player1Winning: 'hsl(120 80% 55%)',
      player2: 'hsl(0 90% 55%)',
      player2Glow: '#f87171',
      player2Winning: 'hsl(0 90% 65%)',
      edgePlayer1: 'hsl(120 80% 45% / 0.6)',
      edgePlayer2: 'hsl(0 90% 55% / 0.6)',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights magic',
    preview: '✨',
    isPremium: true,
    animationType: 'galaxy',
    colors: {
      background: 'hsl(210 35% 10%)',
      empty: 'hsl(210 30% 15%)',
      emptyHover: 'hsl(210 35% 22%)',
      emptyBorder: 'hsl(210 25% 30%)',
      player1: 'hsl(160 90% 50%)',
      player1Glow: '#2dd4bf',
      player1Winning: 'hsl(160 90% 60%)',
      player2: 'hsl(280 90% 60%)',
      player2Glow: '#c084fc',
      player2Winning: 'hsl(280 90% 70%)',
      edgePlayer1: 'hsl(160 90% 50% / 0.6)',
      edgePlayer2: 'hsl(280 90% 60% / 0.6)',
    },
  },
];

export const freeSkins = boardSkins.filter(s => !s.isPremium);
export const premiumSkins = boardSkins.filter(s => s.isPremium);

export const getDefaultSkin = (): BoardSkin => boardSkins[0];

export const getMonoBoardSkin = (): BoardSkin => {
  return boardSkins.find((skin) => skin.id === "minimal") || getDefaultSkin();
};

export const getSkinById = (id: string): BoardSkin => {
  return boardSkins.find(s => s.id === id) || getDefaultSkin();
};
