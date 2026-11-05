import { VipTierInfo } from '../../payment/models/vip-tier.model';

export const AVATARS = [
  '🧸',
  '🐈',
  '🐸',
  '🦊',
  '🐼',
  '🐰',
  '🐻',
  '🦉',
  '🐱',
  '🐣',
  '🦦',
  '🐹',
  '🐨',
  '🦋',
  '🐧',
  '🦝',
  '🐢',
  '🦔',
];

export const SHIRT_COLORS = [
  { label: 'Xanh sage', hex: '#B7CC96', value: 0 },
  { label: 'Cam đất', hex: '#D9998A', value: 1 },
  { label: 'Xanh periwinkle', hex: '#9FADD9', value: 2 },
  { label: 'Tím lilac', hex: '#C9A3D6', value: 3 },
  { label: 'Vàng mù tạt', hex: '#DDB96E', value: 4 },
  { label: 'Xanh ngọc', hex: '#8CC9C5', value: 5 },
  { label: 'Hoàng đế', hex: '#865A35', value: 6 },
];

export const HAIR_COLORS = [
  { label: 'Đen tuyền', hex: '#211c27', value: 0 },
  { label: 'Nâu ấm', hex: '#4a3224', value: 1 },
  { label: 'Vàng mật', hex: '#d4a359', value: 2 },
  { label: 'Bạch kim', hex: '#e6e0f0', value: 3 },
  { label: 'Hồng khói', hex: '#d97d99', value: 4 },
  { label: 'Xanh ngọc', hex: '#5e8b9e', value: 5 },
  { label: 'Tím galaxy', hex: '#8a5ea6', value: 6 },
];

export const ACCESSORIES = [
  { label: 'Tai nghe', value: 0 },
  { label: 'Mũ phớt', value: 1 },
  { label: 'Bê rê', value: 2 },
  { label: 'Tóc tự nhiên', value: 3 },
];

export const VIP_TIERS: VipTierInfo[] = [
  {
    tier: 1,
    name: 'Đồng Cỏ May',
    price: 20000,
    priceFormatted: '20.000đ',
    badge: 'VIP Đồng',
    themeColor: '#4ade80',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glowEffect: '0 0 16px rgba(16, 185, 129, 0.45)',
    borderClass: 'chat-frame--emerald',
    description: 'Viền khung chat ngọc bích thư thái, huy hiệu Đồng Cỏ may mắn',
    features: ['Khung viền Neon Xanh Ngọc', 'Huy hiệu VIP Đồng', 'Bong bóng chat tỏa sáng nhẹ'],
  },
  {
    tier: 2,
    name: 'Ánh Trăng Bạc',
    price: 50000,
    priceFormatted: '50.000đ',
    badge: 'VIP Bạc',
    themeColor: '#cbd5e1',
    gradient: 'linear-gradient(135deg, #94a3b8, #e2e8f0)',
    glowEffect: '0 0 20px rgba(226, 232, 240, 0.6)',
    borderClass: 'chat-frame--silver',
    description: 'Ánh trăng huyền bí, hiệu ứng gradient chuyển động kim loại',
    features: [
      'Khung viền Ánh Trăng Bạc',
      'Huy hiệu VIP Bạc',
      'Hiệu ứng Shimmer chuyển động',
      'Hào quang nhân vật 3D',
    ],
  },
  {
    tier: 3,
    name: 'Hoàng Kim Vương Giả',
    price: 70000,
    priceFormatted: '70.000đ',
    badge: 'VIP Vàng',
    themeColor: '#fbbf24',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    glowEffect: '0 0 24px rgba(251, 191, 36, 0.65)',
    borderClass: 'chat-frame--gold',
    description: 'Khung mạ vàng hoàng kim rực rỡ, lấp lánh như vương miện hoàng gia',
    features: [
      'Khung viền Vàng Gold lấp lánh',
      'Huy hiệu VIP Vàng',
      'Hiệu ứng ánh kim chuyển sắc',
      'Vòng hào quang vàng trong rạp',
    ],
  },
  {
    tier: 4,
    name: 'Tinh Vân Kim Cương',
    price: 100000,
    priceFormatted: '100.000đ',
    badge: 'VIP Kim Cương',
    themeColor: '#c084fc',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899, #38bdf8)',
    glowEffect: '0 0 30px rgba(192, 132, 252, 0.8)',
    borderClass: 'chat-frame--diamond',
    description: 'Cực phẩm tối thượng! Hiệu ứng cầu vồng Hologram và hạt bụi sao tinh vân',
    features: [
      'Khung viền Hologram 7 màu cực phẩm',
      'Huy hiệu VIP Kim Cương',
      'Bụi sao lấp lánh (Nebula Sparkles)',
      'Vòng hào quang kim cương cực quang',
    ],
  },
  {
    tier: 5,
    name: 'Hỏa Long Bảo Châu',
    price: 200000,
    priceFormatted: '200.000đ',
    badge: 'VIP Hỏa Long',
    themeColor: '#fb7185',
    gradient: 'linear-gradient(135deg, #be123c, #f97316, #fbbf24)',
    glowEffect: '0 0 32px rgba(249, 115, 22, 0.75)',
    borderClass: 'chat-frame--fire-dragon',
    description: 'Khung rồng lửa viền đồng đỏ, điểm vảy ánh kim và ngọc báu.',
    features: [
      'Khung chat Hỏa Long ánh đồng đỏ',
      'Biểu tượng rồng lớn hơn các bậc trước',
      'Huy hiệu VIP Hỏa Long',
      'Hiệu ứng lửa ấm quanh tin nhắn',
    ],
  },
  {
    tier: 6,
    name: 'Thần Long Hoàng Gia',
    price: 500000,
    priceFormatted: '500.000đ',
    badge: 'VIP Thần Long',
    themeColor: '#67e8f9',
    gradient: 'linear-gradient(135deg, #0891b2, #7c3aed, #f0abfc)',
    glowEffect: '0 0 38px rgba(103, 232, 249, 0.8)',
    borderClass: 'chat-frame--celestial-dragon',
    description: 'Khung Thần Long bạch kim, họa tiết vảy ngọc và viền cực quang.',
    features: [
      'Khung chat Thần Long bạch kim',
      'Biểu tượng rồng lớn nhất bộ sưu tập',
      'Huy hiệu VIP Thần Long Hoàng Gia',
      'Hiệu ứng cực quang quanh tin nhắn',
    ],
  },
];

export const DEFAULT_CHAT_FRAME: VipTierInfo = {
  tier: 0,
  name: 'Mặc định',
  price: 0,
  priceFormatted: 'Miễn phí',
  badge: 'Ciné',
  themeColor: '#d6c4a3',
  gradient: 'linear-gradient(135deg, #76634f, #c8ad83)',
  glowEffect: 'none',
  borderClass: 'chat-frame--default',
  description: 'Khung trò chuyện ấm áp, miễn phí cho mọi khán giả.',
  features: ['Nhắn tin miễn phí', 'Không cần mua VIP', 'Có thể chọn bất cứ lúc nào'],
};

export const WARDROBE_KEY = 'healing_wardrobe';
export const REACTIONS = ['❤️', '🔥', '🎵', '👏', '😂', '😍', '🥺', '✨'];

/**
 * Biểu tượng ĐẦU CON RỒNG độc quyền trên đỉnh khung chat theo từng phân khúc giá VIP:
 * Tier 1 (20k): Thanh Long Ngọc Bích (Sừng ngọc, ánh sáng emerald)
 * Tier 2 (50k): Ngân Long Ánh Trăng (Sừng bạc lưỡi liềm, ánh trăng bạc)
 * Tier 3 (70k): Kim Long Hoàng Đế (Sừng hoàng kim, vương miện đế vương)
 * Tier 4 (100k): Huyễn Long Kim Cương (Sừng pha lê, hologram 7 màu tinh vân)
 * Tier 5 (200k): Xích Long Hỏa Diễm (Sừng dung nham, mắt rực lửa, lửa bập bùng)
 * Tier 6 (500k): Thần Long Bạch Kim Tối Thượng (Sừng thần thánh, cực quang thiên giới)
 */
export function getDragonHeadSvg(tier: number): string {
  switch (tier) {
    case 1:
      // Thanh Long Ngọc Bích (20.000đ)
      return `<svg class="dragon-crest-svg dragon-crest-svg--1" viewBox="0 0 76 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dh_jade_horn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
          <linearGradient id="dh_jade_face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
          <filter id="dh_jade_glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="glow"/>
            <feComposite in="SourceGraphic" in2="glow" operator="over"/>
          </filter>
        </defs>
        <!-- Aura wings / fin -->
        <path d="M14 26 C10 18 16 10 24 14 C20 18 18 22 18 28 Z" fill="#059669" opacity="0.6"/>
        <path d="M62 26 C66 18 60 10 52 14 C56 18 58 22 58 28 Z" fill="#059669" opacity="0.6"/>
        <!-- Sừng Thanh Long -->
        <path d="M26 20 C22 10 12 6 4 3 C10 10 16 18 23 23 Z" fill="url(#dh_jade_horn)" filter="url(#dh_jade_glow)"/>
        <path d="M50 20 C54 10 64 6 72 3 C66 10 60 18 53 23 Z" fill="url(#dh_jade_horn)" filter="url(#dh_jade_glow)"/>
        <!-- Sừng phụ nhỏ -->
        <path d="M28 17 C26 12 21 8 16 7 C19 11 23 15 27 19 Z" fill="#6ee7b7"/>
        <path d="M48 17 C50 12 55 8 60 7 C57 11 53 15 49 19 Z" fill="#6ee7b7"/>
        <!-- Khuôn mặt rồng -->
        <path d="M25 18 C25 13 51 13 51 18 L55 27 L51 35 L38 41 L25 35 L21 27 Z" fill="url(#dh_jade_face)" stroke="#34d399" stroke-width="1.2"/>
        <!-- Mõm và sống mũi rồng -->
        <path d="M30 27 L38 38 L46 27 L42 22 L34 22 Z" fill="#065f46" stroke="#10b981" stroke-width="0.8"/>
        <!-- Mắt ngọc tinh anh phát sáng -->
        <path d="M28 23 L33 25 L29 27 Z" fill="#a7f3d0" filter="url(#dh_jade_glow)"/>
        <path d="M48 23 L43 25 L47 27 Z" fill="#a7f3d0" filter="url(#dh_jade_glow)"/>
        <!-- Râu rồng uốn lượn -->
        <path d="M25 33 C18 36 11 41 6 43 C12 41 19 38 24 35 Z" fill="#34d399"/>
        <path d="M51 33 C58 36 65 41 70 43 C64 41 57 38 52 35 Z" fill="#34d399"/>
        <!-- Bảo ngọc trán rồng -->
        <polygon points="38,10 41,15 38,20 35,15" fill="#6ee7b7" stroke="#ffffff" stroke-width="0.8" filter="url(#dh_jade_glow)"/>
      </svg>`;

    case 2:
      // Ngân Long Ánh Trăng (50.000đ)
      return `<svg class="dragon-crest-svg dragon-crest-svg--2" viewBox="0 0 76 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dh_silver_horn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#cbd5e1"/>
            <stop offset="100%" stop-color="#475569"/>
          </linearGradient>
          <linearGradient id="dh_silver_face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e2e8f0"/>
            <stop offset="50%" stop-color="#94a3b8"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
          <filter id="dh_silver_glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="2" result="glow"/>
            <feComposite in="SourceGraphic" in2="glow" operator="over"/>
          </filter>
        </defs>
        <!-- Vầng trăng khuyết phía sau -->
        <path d="M38 4 C44 4 48 8 46 14 C42 10 34 10 30 14 C28 8 32 4 38 4 Z" fill="#f8fafc" opacity="0.8" filter="url(#dh_silver_glow)"/>
        <!-- Bờm ánh trăng vươn cánh -->
        <path d="M16 26 C11 18 14 10 22 13 C18 18 19 23 18 29 Z" fill="#94a3b8" opacity="0.7"/>
        <path d="M60 26 C65 18 62 10 54 13 C58 18 57 23 58 29 Z" fill="#94a3b8" opacity="0.7"/>
        <!-- Sừng Ngân Long lưỡi liềm -->
        <path d="M27 20 C22 9 10 4 2 2 C8 9 16 18 24 23 Z" fill="url(#dh_silver_horn)" filter="url(#dh_silver_glow)"/>
        <path d="M49 20 C54 9 66 4 74 2 C68 9 60 18 52 23 Z" fill="url(#dh_silver_horn)" filter="url(#dh_silver_glow)"/>
        <path d="M29 17 C26 11 20 7 14 6 C18 10 23 15 28 19 Z" fill="#ffffff"/>
        <path d="M47 17 C50 11 56 7 62 6 C58 10 53 15 48 19 Z" fill="#ffffff"/>
        <!-- Khuôn mặt rồng bạc -->
        <path d="M25 18 C25 12 51 12 51 18 L55 27 L50 36 L38 42 L26 36 L21 27 Z" fill="url(#dh_silver_face)" stroke="#f8fafc" stroke-width="1.3"/>
        <path d="M30 27 L38 39 L46 27 L42 22 L34 22 Z" fill="#0f172a" stroke="#cbd5e1" stroke-width="0.8"/>
        <!-- Mắt xanh Lam Ngọc (Sapphire) phát sáng -->
        <path d="M28 23 L33 25 L29 27 Z" fill="#38bdf8" filter="url(#dh_silver_glow)"/>
        <path d="M48 23 L43 25 L47 27 Z" fill="#38bdf8" filter="url(#dh_silver_glow)"/>
        <!-- Râu rồng bạc lượn sóng -->
        <path d="M25 33 C17 37 10 41 5 44 C12 42 19 39 24 35 Z" fill="#e2e8f0"/>
        <path d="M51 33 C59 37 66 41 71 44 C64 42 57 39 52 35 Z" fill="#e2e8f0"/>
        <!-- Viên nguyệt ngọc trán rồng -->
        <circle cx="38" cy="15" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1" filter="url(#dh_silver_glow)"/>
      </svg>`;

    case 3:
      // Kim Long Hoàng Đế (70.000đ)
      return `<svg class="dragon-crest-svg dragon-crest-svg--3" viewBox="0 0 78 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dh_gold_horn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="40%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
          <linearGradient id="dh_gold_face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="45%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#451a03"/>
          </linearGradient>
          <filter id="dh_gold_glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="2.5" result="glow"/>
            <feComposite in="SourceGraphic" in2="glow" operator="over"/>
          </filter>
        </defs>
        <!-- Hào quang hoàng kim đế vương tỏa sáng -->
        <circle cx="39" cy="14" r="12" fill="#fde047" opacity="0.4" filter="url(#dh_gold_glow)"/>
        <!-- Cánh bờm hoàng gia vươn rộng -->
        <path d="M15 28 C9 19 12 10 22 12 C17 18 18 24 17 31 Z" fill="#b45309" opacity="0.8"/>
        <path d="M63 28 C69 19 66 10 56 12 C61 18 60 24 61 31 Z" fill="#b45309" opacity="0.8"/>
        <!-- Đại Sừng Kim Long Hoàng Đế uốn lượn 3 khúc uy nghi -->
        <path d="M28 22 C23 10 11 5 2 2 C8 9 17 19 25 25 Z" fill="url(#dh_gold_horn)" filter="url(#dh_gold_glow)"/>
        <path d="M50 22 C55 10 67 5 76 2 C70 9 61 19 53 25 Z" fill="url(#dh_gold_horn)" filter="url(#dh_gold_glow)"/>
        <!-- Sừng phụ mạ vàng -->
        <path d="M30 18 C27 11 20 6 13 4 C18 9 24 15 29 20 Z" fill="#fde047"/>
        <path d="M48 18 C51 11 58 6 65 4 C60 9 54 15 49 20 Z" fill="#fde047"/>
        <!-- Vương miện hoàng gia trên trán rồng -->
        <path d="M31 16 L31 9 L35 12 L39 7 L43 12 L47 9 L47 16 Z" fill="#fef08a" stroke="#b45309" stroke-width="0.8" filter="url(#dh_gold_glow)"/>
        <circle cx="39" cy="8" r="1.5" fill="#ef4444"/>
        <!-- Khuôn mặt rồng vàng uy nghiêm -->
        <path d="M25 19 C25 13 53 13 53 19 L57 28 L52 38 L39 44 L26 38 L21 28 Z" fill="url(#dh_gold_face)" stroke="#fef08a" stroke-width="1.4"/>
        <path d="M31 28 L39 41 L47 28 L43 23 L35 23 Z" fill="#291203" stroke="#fbbf24" stroke-width="1"/>
        <!-- Mắt rồng hổ phách rực lửa hoàng triều -->
        <path d="M29 24 L34 26 L30 28 Z" fill="#ffffff" filter="url(#dh_gold_glow)"/>
        <path d="M49 24 L44 26 L48 28 Z" fill="#ffffff" filter="url(#dh_gold_glow)"/>
        <!-- Râu rồng vàng hoàng đế dài chạm mây -->
        <path d="M26 34 C17 38 9 43 3 46 C11 44 20 40 25 36 Z" fill="#fbbf24" filter="url(#dh_gold_glow)"/>
        <path d="M52 34 C61 38 69 43 75 46 C67 44 58 40 53 36 Z" fill="#fbbf24" filter="url(#dh_gold_glow)"/>
      </svg>`;

    case 4:
      // Huyễn Long Kim Cương (100.000đ - Hologram Nebula)
      return `<svg class="dragon-crest-svg dragon-crest-svg--4" viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dh_holo_horn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="35%" stop-color="#c084fc"/>
            <stop offset="70%" stop-color="#ec4899"/>
            <stop offset="100%" stop-color="#fbbf24"/>
          </linearGradient>
          <linearGradient id="dh_holo_face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a855f7"/>
            <stop offset="50%" stop-color="#3b0764"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <filter id="dh_holo_glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="glow"/>
            <feComposite in="SourceGraphic" in2="glow" operator="over"/>
          </filter>
        </defs>
        <!-- Hào quang tinh vân 7 màu xoay chuyển -->
        <circle cx="40" cy="15" r="14" fill="#c084fc" opacity="0.4" filter="url(#dh_holo_glow)"/>
        <!-- Cánh tinh vân lấp lánh bụi sao -->
        <path d="M15 28 C8 18 12 8 23 11 C18 17 19 24 17 32 Z" fill="#ec4899" opacity="0.75" filter="url(#dh_holo_glow)"/>
        <path d="M65 28 C72 18 68 8 57 11 C62 17 61 24 63 32 Z" fill="#38bdf8" opacity="0.75" filter="url(#dh_holo_glow)"/>
        <!-- Sừng Huyễn Long pha lê kim cương sắc nét -->
        <path d="M29 22 C23 10 11 4 2 1 C8 8 18 18 26 25 Z" fill="url(#dh_holo_horn)" filter="url(#dh_holo_glow)"/>
        <path d="M51 22 C57 10 69 4 78 1 C72 8 62 18 54 25 Z" fill="url(#dh_holo_horn)" filter="url(#dh_holo_glow)"/>
        <path d="M31 18 C28 10 20 5 13 3 C19 8 25 14 30 20 Z" fill="#ffffff" opacity="0.9"/>
        <path d="M49 18 C52 10 60 5 67 3 C61 8 55 14 50 20 Z" fill="#ffffff" opacity="0.9"/>
        <!-- Viên kim cương Hologram tinh vân trên đỉnh trán -->
        <polygon points="40,5 46,12 40,21 34,12" fill="#ffffff" stroke="#c084fc" stroke-width="1.2" filter="url(#dh_holo_glow)"/>
        <circle cx="40" cy="13" r="2" fill="#38bdf8"/>
        <!-- Khuôn mặt rồng Hologram -->
        <path d="M26 19 C26 13 54 13 54 19 L58 29 L53 39 L40 46 L27 39 L22 29 Z" fill="url(#dh_holo_face)" stroke="url(#dh_holo_horn)" stroke-width="1.6"/>
        <path d="M32 29 L40 43 L48 29 L44 24 L36 24 Z" fill="#1e1035" stroke="#ec4899" stroke-width="1"/>
        <!-- Mắt kim cương cực quang lấp lánh -->
        <path d="M30 25 L35 27 L31 29 Z" fill="#ffffff" filter="url(#dh_holo_glow)"/>
        <path d="M50 25 L45 27 L49 29 Z" fill="#ffffff" filter="url(#dh_holo_glow)"/>
        <!-- Râu rồng ánh sáng 7 màu -->
        <path d="M27 35 C17 39 8 44 2 48 C11 46 21 42 26 38 Z" fill="#38bdf8" filter="url(#dh_holo_glow)"/>
        <path d="M53 35 C63 39 72 44 78 48 C69 46 59 42 54 38 Z" fill="#ec4899" filter="url(#dh_holo_glow)"/>
      </svg>`;

    case 5:
      // Xích Long Hỏa Diễm (200.000đ - Fire Dragon)
      return `<svg class="dragon-crest-svg dragon-crest-svg--5" viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dh_fire_horn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="30%" stop-color="#fb923c"/>
            <stop offset="70%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#7f1d1d"/>
          </linearGradient>
          <linearGradient id="dh_fire_face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#dc2626"/>
            <stop offset="50%" stop-color="#991b1b"/>
            <stop offset="100%" stop-color="#450a0a"/>
          </linearGradient>
          <filter id="dh_fire_glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="glow"/>
            <feComposite in="SourceGraphic" in2="glow" operator="over"/>
          </filter>
        </defs>
        <!-- Ngọn lửa rực cháy quanh đầu rồng -->
        <path d="M40 2 C44 8 48 11 44 17 C41 14 39 12 40 2 Z" fill="#fef08a" filter="url(#dh_fire_glow)"/>
        <path d="M36 6 C32 10 33 15 38 18 C35 15 33 13 36 6 Z" fill="#f97316" filter="url(#dh_fire_glow)"/>
        <!-- Cánh bờm dung nham hừng hực -->
        <path d="M15 28 C7 18 11 8 22 10 C17 17 18 24 16 32 Z" fill="#ea580c" opacity="0.85" filter="url(#dh_fire_glow)"/>
        <path d="M65 28 C73 18 69 8 58 10 C63 17 62 24 64 32 Z" fill="#ea580c" opacity="0.85" filter="url(#dh_fire_glow)"/>
        <!-- Sừng Xích Long cuồn cuộn lửa đỏ -->
        <path d="M29 22 C23 9 10 4 1 1 C7 8 17 19 25 25 Z" fill="url(#dh_fire_horn)" filter="url(#dh_fire_glow)"/>
        <path d="M51 22 C57 9 70 4 79 1 C73 8 63 19 55 25 Z" fill="url(#dh_fire_horn)" filter="url(#dh_fire_glow)"/>
        <path d="M31 18 C28 10 21 5 13 3 C19 8 25 14 30 20 Z" fill="#fef08a"/>
        <path d="M49 18 C52 10 59 5 67 3 C61 8 55 14 50 20 Z" fill="#fef08a"/>
        <!-- Khuôn mặt rồng lửa chiến binh -->
        <path d="M26 19 C26 13 54 13 54 19 L58 29 L53 39 L40 46 L27 39 L22 29 Z" fill="url(#dh_fire_face)" stroke="#fb923c" stroke-width="1.6"/>
        <path d="M32 29 L40 43 L48 29 L44 24 L36 24 Z" fill="#2d0606" stroke="#f87171" stroke-width="1"/>
        <!-- Mắt rực lửa dung nham -->
        <path d="M30 25 L35 27 L31 29 Z" fill="#fef08a" filter="url(#dh_fire_glow)"/>
        <path d="M50 25 L45 27 L49 29 Z" fill="#fef08a" filter="url(#dh_fire_glow)"/>
        <!-- Râu rồng hỏa diễm cháy rực -->
        <path d="M27 35 C17 39 8 44 2 48 C11 46 21 42 26 38 Z" fill="#f97316" filter="url(#dh_fire_glow)"/>
        <path d="M53 35 C63 39 72 44 78 48 C69 46 59 42 54 38 Z" fill="#f97316" filter="url(#dh_fire_glow)"/>
        <!-- Hỏa Châu ngậm lửa trên đỉnh -->
        <circle cx="40" cy="14" r="3.5" fill="#fef08a" stroke="#ea580c" stroke-width="1" filter="url(#dh_fire_glow)"/>
      </svg>`;

    case 6:
      // Thần Long Hoàng Gia (500.000đ - Celestial Supreme Dragon)
      return `<svg class="dragon-crest-svg dragon-crest-svg--6" viewBox="0 0 84 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dh_god_horn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#67e8f9"/>
            <stop offset="70%" stop-color="#c084fc"/>
            <stop offset="100%" stop-color="#0891b2"/>
          </linearGradient>
          <linearGradient id="dh_god_face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#090514"/>
          </linearGradient>
          <filter id="dh_god_glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="3.5" result="glow"/>
            <feComposite in="SourceGraphic" in2="glow" operator="over"/>
          </filter>
        </defs>
        <!-- Đại Luân Hồi Cực Quang Thiên Giới phía sau -->
        <circle cx="42" cy="16" r="16" fill="#67e8f9" opacity="0.35" filter="url(#dh_god_glow)"/>
        <!-- Cánh cực quang Thần Long vươn uy nghi -->
        <path d="M16 29 C7 18 11 7 24 10 C19 18 20 25 18 34 Z" fill="#a855f7" opacity="0.8" filter="url(#dh_god_glow)"/>
        <path d="M68 29 C77 18 73 7 60 10 C65 18 64 25 66 34 Z" fill="#67e8f9" opacity="0.8" filter="url(#dh_god_glow)"/>
        <!-- Song Sừng Thần Long Bạch Kim uy lực vô cực -->
        <path d="M31 23 C24 10 11 4 2 1 C9 8 19 19 28 26 Z" fill="url(#dh_god_horn)" filter="url(#dh_god_glow)"/>
        <path d="M53 23 C60 10 73 4 82 1 C75 8 65 19 56 26 Z" fill="url(#dh_god_horn)" filter="url(#dh_god_glow)"/>
        <!-- Sừng phụ thần thánh phát sáng chói lọi -->
        <path d="M33 19 C30 10 22 5 14 3 C21 8 27 15 32 21 Z" fill="#ffffff"/>
        <path d="M51 19 C54 10 62 5 70 3 C63 8 57 15 52 21 Z" fill="#ffffff"/>
        <!-- Vương miện Thần Long Hoàng Kim Thần Thánh -->
        <path d="M33 16 L33 7 L38 12 L42 4 L46 12 L51 7 L51 16 Z" fill="#ffffff" stroke="#67e8f9" stroke-width="1.2" filter="url(#dh_god_glow)"/>
        <circle cx="42" cy="5" r="2" fill="#67e8f9" filter="url(#dh_god_glow)"/>
        <!-- Khuôn mặt Thần Long Bạch Kim tối thượng -->
        <path d="M28 20 C28 14 56 14 56 20 L60 30 L55 40 L42 48 L29 40 L24 30 Z" fill="url(#dh_god_face)" stroke="url(#dh_god_horn)" stroke-width="1.8"/>
        <path d="M34 30 L42 45 L50 30 L46 25 L38 25 Z" fill="#030712" stroke="#67e8f9" stroke-width="1.2"/>
        <!-- Mắt Thần Long Xanh Băng phát quang cực đại -->
        <path d="M31 26 L37 28 L32 30 Z" fill="#ffffff" filter="url(#dh_god_glow)"/>
        <path d="M53 26 L47 28 L52 30 Z" fill="#ffffff" filter="url(#dh_god_glow)"/>
        <!-- Râu Thần Long thiên cực lượn sóng chạm vũ trụ -->
        <path d="M28 36 C18 41 8 46 2 50 C12 48 22 44 27 39 Z" fill="#67e8f9" filter="url(#dh_god_glow)"/>
        <path d="M56 36 C66 41 76 46 82 50 C72 48 62 44 57 39 Z" fill="#a855f7" filter="url(#dh_god_glow)"/>
      </svg>`;

    default:
      return '';
  }
}

// ── Game types ──
