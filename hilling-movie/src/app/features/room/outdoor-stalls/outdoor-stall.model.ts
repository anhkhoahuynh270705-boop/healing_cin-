export interface StallMenuItem {
  id: string;
  emoji: string;
  name: string;
  kind: 'food' | 'drink';
}

export interface OutdoorStallMenu {
  id: number;
  name: string;
  items: StallMenuItem[];
}

export const OUTDOOR_STALL_MENUS: OutdoorStallMenu[] = [
  {
    id: 0,
    name: 'Quầy Bắp nóng',
    items: [
      { id: 'butter-corn', emoji: '🍿', name: 'Bắp rang bơ', kind: 'food' },
      { id: 'cheese-corn', emoji: '🧀', name: 'Bắp phô mai', kind: 'food' },
      { id: 'lemon-water', emoji: '🍋', name: 'Nước chanh', kind: 'drink' },
    ],
  },
  {
    id: 1,
    name: 'Quầy Trà chanh',
    items: [
      { id: 'lemon-tea', emoji: '🍋', name: 'Trà chanh', kind: 'drink' },
      { id: 'peach-tea', emoji: '🍑', name: 'Trà đào', kind: 'drink' },
      { id: 'rice-paper', emoji: '🥢', name: 'Bánh tráng', kind: 'food' },
    ],
  },
  {
    id: 2,
    name: 'Quầy Bánh mì',
    items: [
      { id: 'grilled-bread', emoji: '🥖', name: 'Bánh mì nướng', kind: 'food' },
      { id: 'garlic-bread', emoji: '🧈', name: 'Bánh mì bơ tỏi', kind: 'food' },
      { id: 'milk-coffee', emoji: '🧋', name: 'Cà phê sữa', kind: 'drink' },
    ],
  },
  {
    id: 3,
    name: 'Quầy Xiên nướng',
    items: [
      { id: 'grilled-skewer', emoji: '🍢', name: 'Xiên nướng', kind: 'food' },
      { id: 'mushroom-skewer', emoji: '🍄', name: 'Xiên nấm', kind: 'food' },
      { id: 'kumquat-tea', emoji: '🍊', name: 'Trà tắc', kind: 'drink' },
    ],
  },
  {
    id: 4,
    name: 'Quầy Khoai nướng',
    items: [
      { id: 'roasted-sweet-potato', emoji: '🍠', name: 'Khoai lang nướng', kind: 'food' },
      { id: 'roasted-corn', emoji: '🌽', name: 'Bắp nướng', kind: 'food' },
      { id: 'soy-milk', emoji: '🥛', name: 'Sữa đậu nành', kind: 'drink' },
    ],
  },
  {
    id: 5,
    name: 'Quầy Cà phê',
    items: [
      { id: 'iced-coffee', emoji: '☕', name: 'Cà phê sữa đá', kind: 'drink' },
      { id: 'white-coffee', emoji: '🥤', name: 'Bạc xỉu', kind: 'drink' },
      { id: 'cookie', emoji: '🍪', name: 'Bánh quy', kind: 'food' },
    ],
  },
];
