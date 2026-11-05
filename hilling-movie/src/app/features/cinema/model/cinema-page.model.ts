export interface GameState {
  phase: 'idle' | 'waiting' | 'ready' | 'result';
  reactionTime: number;
  bestTime: number;
  waitTimeout?: ReturnType<typeof setTimeout>;
  startAt?: number;
  fakeStart: boolean;
}

export interface PrivateRoomView {
  code: string;
  name: string;
}
    