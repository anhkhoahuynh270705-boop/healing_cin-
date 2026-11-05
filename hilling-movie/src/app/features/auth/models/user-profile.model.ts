export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  shirtColorIndex: number;
  accessoryIndex: number;
  hairColorIndex?: number;
  vipTier?: number;
  gender?: 'male' | 'female';
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
