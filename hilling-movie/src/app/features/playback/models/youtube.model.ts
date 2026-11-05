export interface YouTubePlayer {
  loadVideoById(options: { videoId: string; startSeconds: number }): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  getVolume?(): number;
  mute(): void;
  unMute(): void;
  isMuted?(): boolean;
  getVideoData?(): { video_id?: string; title?: string };
  destroy?(): void;
}
export interface YouTubeApi {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; UNSTARTED: number; CUED: number };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
