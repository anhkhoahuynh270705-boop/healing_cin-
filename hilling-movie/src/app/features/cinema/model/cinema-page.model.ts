export interface PrivateRoomView {
  code: string;
  name: string;
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  kind: 'success' | 'error' | 'info';
}