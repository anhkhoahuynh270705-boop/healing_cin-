import { ChatMessage } from '../../chat/models/chat-message.model';
import { Guest } from './guest.model';
import { Playback, VideoItem } from './playback.model';

export interface RoomState {
  roomId: string;
  roomName: string;
  playback: Playback;
  queue: VideoItem[];
  guests: Guest[];
  hostId: string | null;
  seatCount: number;
  skipVotes: number;
  requiredSkipVotes: number;
  chatHistory?: ChatMessage[];
}
