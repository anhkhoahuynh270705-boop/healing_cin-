export interface Playback {
  /** Phòng sở hữu timeline này; dùng để loại bỏ dữ liệu đến muộn từ phòng trước. */
  roomId: string;
  videoId: string;
  title: string;
  source: 'lofi' | 'queue' | 'personal-image' | 'personal-video';
  position: number;
  playing: boolean;
  updatedAt: number;
  serverNow: number;
  durationSeconds: number;
}

export interface VideoItem {
  videoId: string;
  title: string;
  requestedBy: string;
  votes: number;
}
