import * as THREE from 'three';

/** Tạo một ghế rạp; vị trí được thiết lập bởi bộ dựng sơ đồ ghế. */
export function createCinemaSeat(row: number, col: number): THREE.Group {
  const g = new THREE.Group();
  // Màu nhung rạp đỏ rượu vang sang trọng, tươi sáng và rõ nét
  const colors = [0x8f3050, 0xa33b60, 0x822946, 0x9a3658];
  const c = colors[(row * 3 + col) % colors.length];
  const mat = new THREE.MeshLambertMaterial({ color: c });
  const armMat = new THREE.MeshLambertMaterial({ color: 0x622c3e });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x221a28 });
  const cupMat = new THREE.MeshLambertMaterial({ color: 0x181822 });

  // Chân ghế to và chắc chắn (Legs)
  for (const [lx, lz] of [
    [-0.36, -0.26],
    [0.36, -0.26],
    [-0.36, 0.26],
    [0.36, 0.26],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), legMat);
    leg.position.set(lx, -0.21, lz);
    g.add(leg);
  }

  // Thu hẹp mặt ghế để tạo khe thoáng giữa các ghế kề nhau.
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.72), mat);
  seat.position.set(0, 0.02, 0.04);
  seat.rotation.x = -0.06;
  g.add(seat);

  // Lưng tựa hẹp theo mặt ghế để không chạm vào hàng bên cạnh.
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.86, 0.14), mat);
  back.position.set(0, 0.48, -0.32);
  back.rotation.x = 0.12;
  g.add(back);

  // Đệm tựa đầu phía trên có viền ánh sáng nổi bật
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 0.16),
    new THREE.MeshLambertMaterial({ color: 0xc45878 }),
  );
  topBar.position.set(0, 0.94, -0.37);
  g.add(topBar);

  // Thẻ số ghế mạ vàng ánh kim ở lưng ghế để user nhìn rõ vị trí ghế từ góc nhìn camera
  const badgeMat = new THREE.MeshBasicMaterial({ color: 0xe5b654 });
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.02), badgeMat);
  badge.position.set(0, 0.72, -0.24);
  g.add(badge);

  // Tay vịn gọn hơn, chừa khe nhìn thấy giữa hai ghế liền nhau.
  for (const ax of [-0.5, 0.5]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.72), armMat);
    arm.position.set(ax, 0.22, 0.04);
    g.add(arm);

    // Chỗ để cốc nước xem phim (Cup holder)
    const cupHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.08, 12), cupMat);
    cupHolder.position.set(ax, 0.38, 0.26);
    g.add(cupHolder);
  }
  // Ghế quay hướng về phía màn hình chiếu phim
  g.rotation.y = Math.PI;
  return g;
}

/** Tạo sofa đôi ở hàng cuối; mỗi nửa sofa nhận một chỉ số ghế riêng. */
export function createCinemaLoveseat(
  row: number,
  pairIndex: number,
  leftSeatIndex: number,
  rightSeatIndex: number,
): THREE.Group {
  const group = new THREE.Group();
  const colors = [0x8f3050, 0xa33b60, 0x822946, 0x9a3658];
  const upholstery = new THREE.MeshLambertMaterial({
    color: colors[(row * 3 + pairIndex) % colors.length],
  });
  const trim = new THREE.MeshLambertMaterial({ color: 0x622c3e });
  const legs = new THREE.MeshLambertMaterial({ color: 0x221a28 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.2, 0.72), trim);
  base.position.y = 0.5;
  group.add(base);

  for (const [x, seatIndex] of [
    [-0.49, leftSeatIndex],
    [0.49, rightSeatIndex],
  ] as const) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.18, 0.68), upholstery);
    cushion.position.set(x, 0.62, 0.03);
    cushion.userData['seatIndex'] = seatIndex;
    cushion.castShadow = true;
    group.add(cushion);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.16), upholstery);
    back.position.set(x, 1.0, -0.28);
    back.userData['seatIndex'] = seatIndex;
    group.add(back);
  }

  for (const x of [-0.98, 0.98]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 0.74), trim);
    arm.position.set(x, 0.78, 0.02);
    group.add(arm);
  }
  for (const [x, z] of [
    [-0.78, -0.24],
    [0.78, -0.24],
    [-0.78, 0.24],
    [0.78, 0.24],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.09), legs);
    leg.position.set(x, 0.21, z);
    group.add(leg);
  }
  group.rotation.y = Math.PI;
  return group;
}

/** Trang trí nâng cấp dùng chung cho ghế rạp và ghế cà phê. */
export function createPremiumSeatDecoration(tier: number, heightOffset = 0): THREE.Group {
  const emperor = tier >= 6;
  const group = new THREE.Group();
  const velvet = new THREE.MeshLambertMaterial({ color: emperor ? 0x9e1723 : 0x14574f });
  const trim = new THREE.MeshStandardMaterial({
    color: emperor ? 0xf2c14e : 0x83dfd0,
    metalness: emperor ? 0.72 : 0.48,
    roughness: 0.28,
  });
  const ermine = new THREE.MeshLambertMaterial({ color: 0xf2efe6 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x211c1d });
  const gem = new THREE.MeshStandardMaterial({
    color: emperor ? 0xffb347 : 0x5fe3c0,
    emissive: emperor ? 0x512008 : 0x07382f,
    metalness: 0.35,
    roughness: 0.2,
  });

  const seatPad = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.075, 0.58), velvet);
  seatPad.position.set(0, 0.13 + heightOffset, 0.04);
  group.add(seatPad);
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.62, 0.065), velvet);
  backPanel.position.set(0, 0.96 + heightOffset, -0.405);
  group.add(backPanel);

  for (const x of [-0.51, 0.51]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.98, 0.085), trim);
    upright.position.set(x, 0.91 + heightOffset, -0.385);
    group.add(upright);
    const armCap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.78), trim);
    armCap.position.set(x, 0.39 + heightOffset, 0.04);
    group.add(armCap);
  }
  const crownRail = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 0.1), trim);
  crownRail.position.set(0, 1.43 + heightOffset, -0.39);
  group.add(crownRail);

  if (emperor) {
    // Hoàng đế: cổ lông ermine, viền vàng và vương miện đỏ vàng.
    const fur = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.09), ermine);
    fur.position.set(0, 1.24 + heightOffset, -0.365);
    group.add(fur);
    for (let dot = 0; dot < 5; dot++) {
      const mark = new THREE.Mesh(new THREE.SphereGeometry(0.025, 7, 6), dark);
      mark.position.set(-0.27 + dot * 0.135, 1.24 + heightOffset, -0.31);
      group.add(mark);
    }
    for (const x of [-0.2, 0, 0.2]) {
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.25, 4), trim);
      point.position.set(x, 1.58 + heightOffset, -0.39);
      group.add(point);
    }
  } else {
    // Huyền thoại: cánh ngọc hai bên và một viên ngọc xanh ở đỉnh tựa lưng.
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.075), trim);
      wing.position.set(side * 0.61, 1.43 + heightOffset, -0.39);
      wing.rotation.z = side * 0.3;
      group.add(wing);
    }
  }
  const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), gem);
  centerGem.position.set(0, 1.53 + heightOffset, -0.47);
  group.add(centerGem);
  return group;
}
