export interface AdminUserView {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  vipTier: number;
  donationTotalConfirmed: number;
  createdAt: number;
}

export interface AdminUserPage {
  content: AdminUserView[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminUserUpdate {
  username: string;
  displayName: string;
  avatar: string;
  vipTier: number;
}
