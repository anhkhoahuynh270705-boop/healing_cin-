import * as THREE from 'three';

export interface CinemaCharacterOptions {
  id: string;
  displayName: string;
  gender: 'male' | 'female';
  shirtColorIndex: number;
  shirtColor: string;
  shirtTier?: number;
  accessoryIndex?: number;
  hairColorIndex?: number;
  vipTier?: number;
}

/** Dựng một model dùng chung cho preview profile và avatar trong phòng chiếu. */
export function createCinemaCharacter(options: CinemaCharacterOptions): THREE.Group {
  const seed = [...options.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = [0xb7cc96, 0xd9998a, 0x9fadd9, 0xc9a3d6, 0xddb96e, 0x8cc9c5, 0x865a35];
  const shirtIndex =
    Number.isInteger(options.shirtColorIndex) && options.shirtColorIndex >= 0
      ? options.shirtColorIndex % palette.length
      : seed % palette.length;
  const safeGender = options.gender === 'female' ? 'female' : 'male';
  const displayName = (options.displayName || 'Bạn').slice(0, 10);
  const vipTier = Math.max(0, options.vipTier ?? 0);
  const shirtTier = Math.max(0, Math.min(6, Math.trunc(options.shirtTier ?? 0)));
  const shirtColor = /^#[\da-f]{6}$/i.test(options.shirtColor)
    ? options.shirtColor
    : `#${palette[shirtIndex].toString(16).padStart(6, '0')}`;
  const emperorShirt = shirtTier === 6;
  const shirtHex = emperorShirt ? 0xb3202a : Number.parseInt(shirtColor.slice(1), 16);
  const skin = 0xe6b08a;
  const group = new THREE.Group();
  group.userData = {
    shirtIndex,
    shirtColor,
    shirtTier,
    accessoryIndex: options.accessoryIndex ?? 0,
    hairIndex: options.hairColorIndex ?? 0,
    vipTier,
    gender: safeGender,
    displayName,
  };

  const material = (color: number) => new THREE.MeshLambertMaterial({ color });
  // Thân áo dạng khối hộp rộng, lấy cảm hứng từ dáng nhân vật Minecraft.
  const torsoGeometry = new THREE.BoxGeometry(safeGender === 'female' ? 0.84 : 0.9, 0.68, 0.48);
  const torso = new THREE.Mesh(
    torsoGeometry,
    emperorShirt ? createEmperorBodyMaterial(torsoGeometry, 0.68) : material(shirtHex),
  );
  torso.position.set(0, 0.44, 0);
  torso.castShadow = true;
  group.add(torso);

  const pantsHex = emperorShirt ? 0x4a5048 : 0x3b4238;
  const shoeHex = emperorShirt ? 0xd9dbd0 : 0xd9d6c6;
  for (const side of [-1, 1]) {
    // Tay áo và bàn tay cùng nằm dưới một khớp vai để có thể giơ tay khi nhảy.
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'dance-arm-left' : 'dance-arm-right';
    arm.position.set(side * (safeGender === 'female' ? 0.48 : 0.5), 0.65, 0.025);
    arm.rotation.z = -side * 0.08;

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.5, 0.34), material(shirtHex));
    // Để một khe nhỏ giữa thân và tay áo; hai bên vẫn cân đối như nhân vật khối vuông.
    sleeve.position.set(side * (safeGender === 'female' ? 0.145 : 0.12), -0.27, 0);
    sleeve.castShadow = true;
    arm.add(sleeve);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.28), material(skin));
    hand.name = side < 0 ? 'dance-hand-left' : 'dance-hand-right';
    hand.position.set(side * (safeGender === 'female' ? 0.15 : 0.125), -0.57, 0.105);
    hand.castShadow = true;
    arm.add(hand);
    group.add(arm);

    const legGroup = new THREE.Group();
    legGroup.name = side < 0 ? 'gym-leg-left' : 'gym-leg-right';
    legGroup.position.set(side * 0.12, 0.14, 0.02);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 3, 8), material(pantsHex));
    leg.position.set(0, -0.105, 0);
    leg.rotation.x = Math.PI / 2.2;
    leg.castShadow = true;
    legGroup.add(leg);

    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), material(shoeHex));
    shoe.scale.set(1.15, 0.55, 1.3);
    shoe.position.set(0, -0.21, 0.055);
    shoe.castShadow = true;
    legGroup.add(shoe);
    group.add(legGroup);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.12, 0.16, 12), material(skin));
  neck.position.set(0, 0.79, 0);
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), material(skin));
  head.position.set(0, 1.13, 0);
  head.castShadow = true;
  head.userData['characterPart'] = 'head';
  group.add(head);

  // Tóc gáo dừa là một vòm duy nhất; giới tính đổi nhẹ đường kính và độ phủ.
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.315,
      18,
      10,
      0,
      Math.PI * 2,
      0,
      safeGender === 'female' ? 1.98 : 1.82,
    ),
    new THREE.MeshLambertMaterial({ color: 0x6b4429, flatShading: true }),
  );
  hair.scale.set(safeGender === 'female' ? 1.04 : 1, 1, 1);
  hair.position.set(0, 1.145, 0);
  hair.castShadow = true;
  group.add(hair);

  addShirtDetails(group, shirtTier);
  addBackName(group, displayName, shirtTier);

  // Khán giả ngồi quay lưng về camera và nhìn về màn chiếu.
  group.rotation.y = Math.PI;
  return group;
}

function addShirtDetails(group: THREE.Group, tier: number): void {
  if (tier === 6) {
    addEmperorShirtDetails(group);
    return;
  }
  addRoyalShirtDetails(group, tier);
  if (tier <= 0) return;

  const trimColors = [0, 0xf2c46d, 0x6cb4ff, 0xff8b6f, 0xb79cff, 0x5fe3c0, 0xffc45c];
  const trim = new THREE.MeshLambertMaterial({ color: trimColors[tier] });
  const rear = -0.252;

  // Cổ áo, đường may lưng và bo tay tạo chi tiết riêng cho từng bộ trang phục.
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.055, 0.025), trim);
  collar.position.set(0, 0.715, rear);
  group.add(collar);
  const backSeam = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.25, 0.018), trim);
  backSeam.position.set(0, 0.39, rear);
  group.add(backSeam);
  const shoulderSeam = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.025, 0.018), trim);
  shoulderSeam.position.set(0, 0.61, rear);
  group.add(shoulderSeam);

  if (tier < 5) {
    const crest = new THREE.Mesh(
      new THREE.OctahedronGeometry(tier === 4 ? 0.065 : 0.05, 0),
      new THREE.MeshLambertMaterial({ color: trimColors[tier] }),
    );
    crest.position.set(0, 0.29, rear - 0.01);
    group.add(crest);
    return;
  }

  const capeColor = tier === 5 ? 0x237965 : 0x7c1d36;
  const emperorCape = tier === 6;
  const capeHemY = emperorCape ? -0.16 : -0.095;
  const capeBottomY = capeHemY - 0.075;
  const capeSideHeight = emperorCape ? 0.92 : 0.79;
  const capeSideCenterY = emperorCape ? 0.23 : 0.255;
  // Hai vạt áo choàng tách nhẹ ở giữa để lộ áo bên trong, giống áo đang khoác.
  const capeShape = new THREE.Shape();
  capeShape.moveTo(0.035, 0.69);
  capeShape.lineTo(0.3, 0.69);
  capeShape.lineTo(0.39, 0.34);
  capeShape.lineTo(0.52, capeBottomY + 0.08);
  capeShape.lineTo(0.34, capeBottomY);
  capeShape.lineTo(0.035, capeBottomY + 0.05);
  capeShape.closePath();

  const cape = new THREE.Mesh(
    new THREE.ShapeGeometry(capeShape),
    new THREE.MeshLambertMaterial({ color: capeColor, side: THREE.DoubleSide }),
  );
  cape.position.z = -0.27;
  cape.castShadow = true;
  group.add(cape);
  const oppositeCape = cape.clone();
  oppositeCape.scale.x = -1;
  group.add(oppositeCape);
  const frontCape = cape.clone();
  frontCape.position.z = 0.27;
  group.add(frontCape);
  const frontOppositeCape = oppositeCape.clone();
  frontOppositeCape.position.z = 0.27;
  group.add(frontOppositeCape);

  const capeDetailMaterial = new THREE.MeshBasicMaterial({ color: trimColors[tier] });

  for (const faceZ of [-0.282, 0.282]) {
    for (const side of [-1, 1]) {
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, capeSideHeight, 0.014),
        capeDetailMaterial,
      );
      border.position.set(side * 0.405, capeSideCenterY, faceZ);
      border.rotation.z = side * 0.16;
      group.add(border);

      const clasp = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.06, 0),
        capeDetailMaterial,
      );
      clasp.position.set(side * 0.29, 0.66, faceZ + Math.sign(faceZ) * 0.01);
      group.add(clasp);
    }

    for (const side of [-1, 1]) {
      const hem = new THREE.Mesh(
        new THREE.BoxGeometry(emperorCape ? 0.42 : 0.38, 0.04, 0.014),
        capeDetailMaterial,
      );
      hem.position.set(side * (emperorCape ? 0.235 : 0.22), capeHemY, faceZ);
      group.add(hem);
    }
  }

  const crownShape = new THREE.Shape();
  crownShape.moveTo(-0.1, 0.23);
  crownShape.lineTo(-0.1, 0.31);
  crownShape.lineTo(-0.045, 0.275);
  crownShape.lineTo(0, 0.34);
  crownShape.lineTo(0.045, 0.275);
  crownShape.lineTo(0.1, 0.31);
  crownShape.lineTo(0.1, 0.23);
  crownShape.closePath();
  const crown = new THREE.Mesh(
    new THREE.ShapeGeometry(crownShape),
    new THREE.MeshBasicMaterial({ color: trimColors[tier], side: THREE.DoubleSide }),
  );
  crown.position.z = -0.291;
  group.add(crown);
  const frontCrown = crown.clone();
  frontCrown.position.z = 0.291;
  group.add(frontCrown);
}

function addRoyalShirtDetails(group: THREE.Group, tier: number): void {
  const collar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.085, 0.38, 4, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2efe6 }),
  );
  collar.rotation.z = Math.PI / 2;
  collar.scale.z = 1.12;
  collar.position.set(0, 0.755, -0.255);
  group.add(collar);
  const frontCollar = collar.clone();
  frontCollar.position.z = 0.255;
  group.add(frontCollar);

  for (let index = 0; index < 7; index++) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x1e1b1b }),
    );
    spot.position.set(-0.21 + index * 0.07, 0.755, -0.355);
    group.add(spot);
    const frontSpot = spot.clone();
    frontSpot.position.z = 0.355;
    group.add(frontSpot);
  }

  const nameFrameShape = new THREE.Shape();
  appendRoundedRect(nameFrameShape, -0.38, -0.25, 0.38, 0.25, 0.075);
  const frameHole = new THREE.Path();
  appendRoundedRect(frameHole, -0.357, -0.227, 0.357, 0.227, 0.06, true);
  nameFrameShape.holes.push(frameHole);
  const frame = new THREE.Mesh(
    new THREE.ShapeGeometry(nameFrameShape),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, side: THREE.DoubleSide }),
  );
  frame.position.set(0, 0.455, -0.34);
  group.add(frame);

  const placket = new THREE.Mesh(
    new THREE.BoxGeometry(0.105, 0.22, 0.012),
    new THREE.MeshBasicMaterial({ color: 0xf2efe6 }),
  );
  placket.position.set(0, 0.35, -0.35);
  group.add(placket);
  for (let index = 0; index < 4; index++) {
    const button = new THREE.Mesh(
      new THREE.SphereGeometry(0.019, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x1e1b1b }),
    );
    button.position.set(0, 0.44 - index * 0.06, -0.37);
    group.add(button);
  }

  const seams = new THREE.MeshBasicMaterial({
    color: tier === 0 ? 0xa98231 : [0, 0xf2c46d, 0x6cb4ff, 0xff8b6f, 0xb79cff, 0x5fe3c0][tier],
  });
  for (const side of [-1, 1]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.58, 0.012), seams);
    seam.position.set(side * 0.438, 0.44, -0.247);
    group.add(seam);
  }
}

function createEmperorBodyMaterial(geometry: THREE.BufferGeometry, height: number): THREE.Material {
  const positions = geometry.getAttribute('position');
  const colors: number[] = [];
  const top = new THREE.Color('#B3202A');
  const bottom = new THREE.Color('#8E1620');
  for (let index = 0; index < positions.count; index++) {
    const blend = THREE.MathUtils.clamp((positions.getY(index) + height / 2) / height, 0, 1);
    const color = bottom.clone().lerp(top, blend);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}

function addEmperorShirtDetails(group: THREE.Group): void {
  const ivory = 0xf2efe6;
  const black = 0x1e1b1b;
  const gold = 0xf2c14e;

  // Cổ ermine bo tròn, hơi phồng, với các đốm đen đều nhau ở mặt lưng.
  const furCollar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.085, 0.38, 4, 10),
    new THREE.MeshLambertMaterial({ color: ivory }),
  );
  furCollar.rotation.z = Math.PI / 2;
  furCollar.scale.z = 1.12;
  furCollar.position.set(0, 0.755, -0.255);
  group.add(furCollar);
  const frontFurCollar = furCollar.clone();
  frontFurCollar.position.z = 0.255;
  group.add(frontFurCollar);
  for (let index = 0; index < 7; index++) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 6),
      new THREE.MeshBasicMaterial({ color: black }),
    );
    spot.position.set(-0.21 + index * 0.07, 0.755, -0.355);
    group.add(spot);
    const frontSpot = spot.clone();
    frontSpot.position.z = 0.355;
    group.add(frontSpot);
  }

  // Hai mảng áo choàng đỏ sẫm xòe chữ A từ vai và có dải ermine ở gấu.
  const panelShape = new THREE.Shape();
  panelShape.moveTo(0.035, 0.69);
  panelShape.lineTo(0.18, 0.67);
  panelShape.lineTo(0.31, 0.45);
  panelShape.lineTo(0.42, 0.18);
  panelShape.lineTo(0.58, -0.055);
  panelShape.lineTo(0.55, -0.105);
  panelShape.lineTo(0.36, -0.14);
  panelShape.lineTo(0.035, -0.09);
  panelShape.closePath();
  const capePanel = new THREE.Mesh(
    new THREE.ShapeGeometry(panelShape),
    new THREE.MeshLambertMaterial({ color: 0x941821, side: THREE.DoubleSide }),
  );
  capePanel.position.z = -0.26;
  capePanel.castShadow = true;
  group.add(capePanel);
  const leftCapePanel = capePanel.clone();
  leftCapePanel.scale.x = -1;
  leftCapePanel.material = new THREE.MeshLambertMaterial({
    color: 0x8e1620,
    side: THREE.DoubleSide,
  });
  group.add(leftCapePanel);
  const frontCapePanel = capePanel.clone();
  frontCapePanel.position.z = 0.26;
  group.add(frontCapePanel);
  const frontLeftCapePanel = leftCapePanel.clone();
  frontLeftCapePanel.position.z = 0.26;
  group.add(frontLeftCapePanel);

  const hemShape = new THREE.Shape();
  hemShape.moveTo(0.58, -0.055);
  hemShape.lineTo(0.55, -0.105);
  hemShape.lineTo(0.36, -0.14);
  hemShape.lineTo(0.035, -0.09);
  hemShape.lineTo(0.035, -0.015);
  hemShape.lineTo(0.37, -0.065);
  hemShape.lineTo(0.53, -0.04);
  hemShape.closePath();
  const capeHem = new THREE.Mesh(
    new THREE.ShapeGeometry(hemShape),
    new THREE.MeshBasicMaterial({ color: ivory, side: THREE.DoubleSide }),
  );
  capeHem.position.z = -0.276;
  group.add(capeHem);
  const leftCapeHem = capeHem.clone();
  leftCapeHem.scale.x = -1;
  group.add(leftCapeHem);
  const frontCapeHem = capeHem.clone();
  frontCapeHem.position.z = 0.276;
  group.add(frontCapeHem);
  const frontLeftCapeHem = leftCapeHem.clone();
  frontLeftCapeHem.position.z = 0.276;
  group.add(frontLeftCapeHem);

  // Khung tên bo góc vàng, đặt nổi phía trên áo choàng và bao trọn huy hiệu ermine.
  const frameShape = new THREE.Shape();
  appendRoundedRect(frameShape, -0.38, -0.25, 0.38, 0.25, 0.075);
  const frameHole = new THREE.Path();
  appendRoundedRect(frameHole, -0.357, -0.227, 0.357, 0.227, 0.06, true);
  frameShape.holes.push(frameHole);
  const frame = new THREE.Mesh(
    new THREE.ShapeGeometry(frameShape),
    new THREE.MeshBasicMaterial({ color: gold, side: THREE.DoubleSide }),
  );
  frame.position.set(0, 0.455, -0.34);
  group.add(frame);

  const erminePlacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.105, 0.22, 0.012),
    new THREE.MeshBasicMaterial({ color: ivory }),
  );
  erminePlacket.position.set(0, 0.35, -0.35);
  group.add(erminePlacket);
  const frontErminePlacket = erminePlacket.clone();
  frontErminePlacket.position.z = 0.35;
  group.add(frontErminePlacket);
  for (let index = 0; index < 4; index++) {
    const button = new THREE.Mesh(
      new THREE.SphereGeometry(0.019, 8, 6),
      new THREE.MeshBasicMaterial({ color: black }),
    );
    button.position.set(0, 0.44 - index * 0.06, -0.37);
    group.add(button);
    const frontButton = button.clone();
    frontButton.position.z = 0.37;
    group.add(frontButton);
  }

  // Đường may sẫm chạy dọc mép thân áo tạo chiều sâu cho lớp áo đỏ.
  const seamMaterial = new THREE.MeshBasicMaterial({ color: 0x76141b });
  for (const side of [-1, 1]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.58, 0.012), seamMaterial);
    seam.position.set(side * 0.438, 0.44, -0.247);
    group.add(seam);
  }
}

function appendRoundedRect(
  path: THREE.Shape | THREE.Path,
  left: number,
  bottom: number,
  right: number,
  top: number,
  radius: number,
  clockwise = false,
): void {
  const r = Math.min(radius, (right - left) / 2, (top - bottom) / 2);
  if (!clockwise) {
    path.moveTo(left + r, bottom);
    path.lineTo(right - r, bottom);
    path.quadraticCurveTo(right, bottom, right, bottom + r);
    path.lineTo(right, top - r);
    path.quadraticCurveTo(right, top, right - r, top);
    path.lineTo(left + r, top);
    path.quadraticCurveTo(left, top, left, top - r);
    path.lineTo(left, bottom + r);
    path.quadraticCurveTo(left, bottom, left + r, bottom);
  } else {
    path.moveTo(left + r, bottom);
    path.lineTo(left, bottom + r);
    path.lineTo(left, top - r);
    path.quadraticCurveTo(left, top, left + r, top);
    path.lineTo(right - r, top);
    path.quadraticCurveTo(right, top, right, top - r);
    path.lineTo(right, bottom + r);
    path.quadraticCurveTo(right, bottom, right - r, bottom);
    path.lineTo(left + r, bottom);
  }
  path.closePath();
}

function addBackName(group: THREE.Group, name: string, shirtTier: number): void {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#F2C14E';
  context.font = '700 72px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(name, 256, 66, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const namePrint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.11),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
  );
  namePrint.position.set(0, 0.575, -0.382);
  namePrint.rotation.y = Math.PI;
  group.add(namePrint);
}
