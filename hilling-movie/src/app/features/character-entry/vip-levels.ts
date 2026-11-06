export interface VipLevelInfo {
  level: number;
  title: string;
  minimumTopUp: number;
  privilege: string;
  color: string;
}

export const VIP_LEVELS: readonly VipLevelInfo[] = [
  { level: 0, title: 'Khách', minimumTopUp: 0, privilege: 'Trò chuyện trong rạp miễn phí, không cần nạp', color: '#b9b6c2' },
  { level: 1, title: 'Tân binh', minimumTopUp: 10_000, privilege: 'Huy hiệu Tân binh trên hồ sơ nhân vật', color: '#c99b72' },
  { level: 2, title: 'Thân quen', minimumTopUp: 20_000, privilege: 'Huy hiệu VIP đồng trên hồ sơ', color: '#d9a46d' },
  { level: 3, title: 'Bạc', minimumTopUp: 50_000, privilege: 'Huy hiệu VIP bạc phát sáng', color: '#c7d0dc' },
  { level: 4, title: 'Vàng', minimumTopUp: 100_000, privilege: 'Huy hiệu VIP vàng nổi bật', color: '#f0ca71' },
  { level: 5, title: 'Bạch kim', minimumTopUp: 200_000, privilege: 'Huy hiệu VIP bạch kim', color: '#8ee3d1' },
  { level: 6, title: 'Kim cương', minimumTopUp: 500_000, privilege: 'Khung chat VIP cấp cao', color: '#8acbff' },
  { level: 7, title: 'Tinh tú', minimumTopUp: 1_000_000, privilege: 'Huy hiệu Tinh tú độc quyền', color: '#b9a1ff' },
  { level: 8, title: 'Huyền thoại', minimumTopUp: 2_000_000, privilege: 'Huy hiệu Huyền thoại', color: '#ff9fbd' },
  { level: 9, title: 'Thượng thần', minimumTopUp: 5_000_000, privilege: 'Huy hiệu Thượng thần', color: '#ffad77' },
  { level: 10, title: 'Tối thượng', minimumTopUp: 10_000_000, privilege: 'Danh hiệu VIP tối thượng', color: '#ffe58a' },
];

export function getVipLevelInfo(level: number): VipLevelInfo {
  return VIP_LEVELS[Math.max(0, Math.min(10, Math.floor(level)))] ?? VIP_LEVELS[0];
}

export function getNextVipLevel(level: number): VipLevelInfo | null {
  return VIP_LEVELS[Math.max(0, Math.min(10, Math.floor(level))) + 1] ?? null;
}

export function formatVipAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}
