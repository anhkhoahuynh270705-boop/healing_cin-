import * as THREE from 'three';
import { StallMenuItem } from './outdoor-stall.model';

export interface OutdoorStallScene {
  stalls: THREE.Group[];
  targets: THREE.Mesh[];
}

/** Dựng các quầy và hitbox tương tác cho không gian ngoài trời. */
export function buildOutdoorStalls(root: THREE.Group): OutdoorStallScene {
  const stalls: THREE.Group[] = [];
  const targets: THREE.Mesh[] = [];

  const wood = new THREE.MeshLambertMaterial({ color: 0x604335 });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x342722 });
  const counterTop = new THREE.MeshLambertMaterial({ color: 0x9a6946 });
  const cream = new THREE.MeshLambertMaterial({ color: 0xf0dfbd });
  const menuColors = [0x9c4d45, 0x49725d, 0x536b9a, 0x9a7044, 0x78558d, 0xb45b43];
  const stallNames = ['BẮP NÓNG', 'TRÀ CHANH', 'BÁNH MÌ', 'XIÊN NƯỚNG', 'KHOAI NƯỚNG', 'CÀ PHÊ'];
  const canopyColors = [0xc96755, 0xe6bf7c, 0x527f6a, 0xe3d2b4];
  const snackColors = [0xe9b94f, 0xc95443, 0x7ea45e, 0xe6d09b];

  for (const side of [-1, 1]) {
    for (let stallIndex = 0; stallIndex < 3; stallIndex++) {
      const stall = new THREE.Group();
      const menuId = stallIndex + (side > 0 ? 3 : 0);
      stall.userData['stallId'] = menuId;
      stall.position.set(side * 14.1, -0.5, -3.8 + stallIndex * 4.9);
      // Quầy mở về phía các hàng ghế.
      stall.rotation.y = -side * Math.PI * 0.5;

      // Một hitbox cho cả quầy giúp nhận click nhanh
      const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 3.1, 2.0),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          colorWrite: false,
          depthWrite: false,
        }),
      );
      hitbox.position.copy(stall.position);
      hitbox.position.y += 1.05;
      hitbox.rotation.y = stall.rotation.y;
      hitbox.userData['stallId'] = menuId;
      root.add(hitbox);
      targets.push(hitbox);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.02, 1.28), wood);
      body.position.y = 0.57;
      body.castShadow = true;
      stall.add(body);
      const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.64, 0.035), darkWood);
      frontPanel.position.set(0, 0.54, 0.665);
      stall.add(frontPanel);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.13, 1.52), counterTop);
      counter.position.y = 1.15;
      counter.castShadow = true;
      stall.add(counter);

      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x211b1a });
      for (const x of [-1.05, 1.05]) {
        for (const z of [-0.56, 0.56]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 12), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.13, z);
          stall.add(wheel);
        }
      }

      // Mái bạt sọc và diềm vải tạo dáng quầy hàng rong quen thuộc.
      for (let stripe = 0; stripe < 7; stripe++) {
        const x = -1.2 + stripe * 0.4;
        const color = canopyColors[(stripe + stallIndex) % canopyColors.length];
        const canopyPanel = new THREE.Mesh(
          new THREE.BoxGeometry(0.41, 0.11, 1.78),
          new THREE.MeshLambertMaterial({ color }),
        );
        canopyPanel.position.set(x, 2.55, 0);
        canopyPanel.castShadow = true;
        stall.add(canopyPanel);
        const valance = new THREE.Mesh(
          new THREE.BoxGeometry(0.41, 0.28, 0.12),
          new THREE.MeshLambertMaterial({ color }),
        );
        valance.position.set(x, 2.35, 0.88);
        stall.add(valance);
      }
      for (const x of [-1.25, 1.25]) {
        for (const z of [-0.59, 0.59]) {
          const support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.25, 0.1), darkWood);
          support.position.set(x, 1.83, z);
          stall.add(support);
        }
      }

      // Bảng tên tự vẽ trên canvas, không phụ thuộc ảnh hay dịch vụ ngoài.
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const context = signCanvas.getContext('2d');
      if (context) {
        context.fillStyle = `#${menuColors[menuId].toString(16).padStart(6, '0')}`;
        context.fillRect(0, 0, signCanvas.width, signCanvas.height);
        context.strokeStyle = '#f2d8a2';
        context.lineWidth = 8;
        context.strokeRect(8, 8, signCanvas.width - 16, signCanvas.height - 16);
        context.fillStyle = '#fff1d3';
        context.font = '800 48px system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(stallNames[menuId], 256, 66, 460);
      }
      const signTexture = new THREE.CanvasTexture(signCanvas);
      signTexture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 0.45),
        new THREE.MeshBasicMaterial({ map: signTexture }),
      );
      sign.position.set(0, 2.05, 0.79);
      stall.add(sign);

      // Khay và món ăn cách điệu để quầy có chiều sâu khi nhìn từ xa.
      for (let trayIndex = 0; trayIndex < 3; trayIndex++) {
        const x = -0.82 + trayIndex * 0.82;
        const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.07, 12), cream);
        tray.position.set(x, 1.27, 0.05);
        stall.add(tray);
        for (let snack = 0; snack < 3; snack++) {
          const bite = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 8, 7),
            new THREE.MeshLambertMaterial({
              color: snackColors[(snack + stallIndex) % snackColors.length],
            }),
          );
          bite.position.set(x - 0.1 + snack * 0.1, 1.39, 0.02 + (snack % 2) * 0.08);
          stall.add(bite);
        }
      }

      const warmLamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd58a }),
      );
      warmLamp.position.set(0, 2.34, 0.75);
      stall.add(warmLamp);
      const stallGlow = new THREE.PointLight(0xffbf72, 1.15, 7, 2);
      stallGlow.position.set(0, 2.05, 0.95);
      stall.add(stallGlow);

      root.add(stall);
      stalls.push(stall);
    }
  }

  return { stalls, targets };
}

/** Tạo vật thể món ăn/nước uống để nhân vật bưng về bàn. */
export function createStallOrderObject(item: StallMenuItem): THREE.Group {
  const carry = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.27, 0.045, 18),
    new THREE.MeshLambertMaterial({ color: 0xf0e5d0 }),
  );
  plate.castShadow = true;
  carry.add(plate);

  if (item.kind === 'drink') {
    const drinkColors: Record<string, number> = {
      'lemon-water': 0xe7ce69,
      'lemon-tea': 0xc68c45,
      'peach-tea': 0xd68168,
      'milk-coffee': 0x815438,
      'kumquat-tea': 0xc78b39,
      'soy-milk': 0xe4d6ad,
      'iced-coffee': 0x62412e,
      'white-coffee': 0xb78a68,
    };
    const drink = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.075, 0.25, 14),
      new THREE.MeshLambertMaterial({ color: drinkColors[item.id] ?? 0x9c704a }),
    );
    drink.position.set(0.04, 0.16, 0.02);
    drink.castShadow = true;
    carry.add(drink);
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.025, 14),
      new THREE.MeshLambertMaterial({ color: 0xe8dfca }),
    );
    lid.position.set(0.04, 0.295, 0.02);
    carry.add(lid);
    const straw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8),
      new THREE.MeshLambertMaterial({ color: 0xf4eee1 }),
    );
    straw.position.set(0.07, 0.37, 0.02);
    straw.rotation.z = -0.16;
    carry.add(straw);
  } else {
    const foodColors: Record<string, number> = {
      'butter-corn': 0xe3b34e,
      'cheese-corn': 0xf1c957,
      'rice-paper': 0xc96946,
      'grilled-bread': 0xc58a4b,
      'garlic-bread': 0xd4a15d,
      'grilled-skewer': 0xb45c3c,
      'mushroom-skewer': 0x9c8060,
      'roasted-sweet-potato': 0x8d4e73,
      'roasted-corn': 0xe0b748,
      cookie: 0x9c6743,
    };
    const food = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 9),
      new THREE.MeshLambertMaterial({ color: foodColors[item.id] ?? 0xd3a35a }),
    );
    food.scale.set(1.65, 0.75, 1.1);
    food.position.set(0, 0.12, 0.02);
    food.castShadow = true;
    carry.add(food);
    const garnish = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x73905c }),
    );
    garnish.position.set(-0.12, 0.13, 0.05);
    carry.add(garnish);
  }

  carry.scale.setScalar(0.82);
  return carry;
}
