export interface DonationTier {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export interface DonationUiConfig {
  bank: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  zaloUrl: string;
  lightAmount: number;
  tiers: DonationTier[];
}

export interface DonationAccount {
  transferCode: string;
  totalConfirmed: number;
  usableBalance: number;
  currentTier: DonationTier | null;
  nextTier: DonationTier | null;
  remainingToNext: number;
  pending: boolean;
  pendingAmount: number;
  latestStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface DonationSubmission {
  request: unknown;
  account: DonationAccount;
}

export type DonationUiStatus = 'idle' | 'pending' | 'approved' | 'rejected';
