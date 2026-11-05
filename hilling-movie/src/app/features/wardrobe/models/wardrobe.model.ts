export interface WardrobeCatalogItem {
  tier: number;
  name: string;
  price: number;
  frameDescription: string;
  shirtDescription: string;
  accentColor: string;
  softColor: string;
  glowColor: string;
  shirtColor: string;
  sleeveColor: string;
  nameColor: string;
  ornamentColor: string;
  frameLight: string;
  frameMid: string;
  frameDark: string;
  frameBgTop: string;
  frameBgBottom: string;
  frameText: string;
  gemLight: string;
  gemMid: string;
  gemDark: string;
  owned: boolean;
  purchasedAt: number | null;
}

export interface WardrobeAccount {
  displayName: string;
  totalConfirmed: number;
  usableBalance: number;
  ownedThroughTier: number;
  items: WardrobeCatalogItem[];
}
