export interface VipTierInfo {
  tier: number;
  name: string;
  price: number;
  priceFormatted: string;
  badge: string;
  themeColor: string;
  gradient: string;
  glowEffect: string;
  borderClass: string;
  description: string;
  features: string[];
}

export interface PaymentRequestView {
  id: string;
  username: string;
  tier: number;
  amount: number;
  memo: string;
  createdAt: number;
  type?: 'VIP' | 'PRIVATE_ROOM' | 'DONATION';
  roomCode?: string;
  roomName?: string;
}
