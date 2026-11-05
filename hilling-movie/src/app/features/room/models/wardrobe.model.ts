export interface WardrobeConfig {
  shirtColorIndex: number;
  accessoryIndex: number;
  hairColorIndex?: number;
  displayName: string;
  gender?: 'male' | 'female';
  characterShirtColorIndex?: number;
  characterShirtColor?: string;
}
