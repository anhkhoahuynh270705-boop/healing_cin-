export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  time: Date;
  isMine: boolean;
  vipTier?: number;
}
