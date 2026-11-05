export interface Guest {
  id: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
  face: number;
  seat: number | null;
  shirtColorIndex?: number;
  accessoryIndex?: number;
  hairColorIndex?: number;
  vipTier?: number;
  gender?: 'male' | 'female';
  shirtColor?: string;
  shirtTier?: number;
  action?: 'idle' | 'sway' | 'bounce' | 'spin' | 'groove';
}
