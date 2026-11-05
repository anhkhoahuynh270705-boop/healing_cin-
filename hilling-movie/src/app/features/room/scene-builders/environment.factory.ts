import * as THREE from 'three';

/** Dựng sàn, tường, trần và đèn viền cho rạp kín. */
export function addIndoorRoom(root: THREE.Group): void {
  const m = (color: number) => new THREE.MeshLambertMaterial({ color, side: THREE.FrontSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 26), m(0x22162a));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.51, 2);
  floor.receiveShadow = true;
  root.add(floor);

  // Chia tường thành các mảng quanh màn hình. Cách này để vùng video thông hoàn toàn,
  // tránh mặt tường tím bị triangulate đè lên mép trên của iframe.
  const wallMaterial = m(0x282038);
  const wallZ = -8.6;
  const wallPieces: Array<[number, number, number, number]> = [
    [-16.45, 5.1, 5.55, 20.1], // mảng trái
    [16.45, 5.1, 5.55, 20.1], // mảng phải
    [0, 27.8, -4.1, 0.8], // chân tường dưới màn
    [0, 27.8, 15.9, 0.6], // dải tường mỏng phía trên khung
  ];
  for (const [x, width, y, height] of wallPieces) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
    panel.position.set(x, y, wallZ);
    root.add(panel);
  }

  for (const [x, rotation] of [
    [-18, Math.PI / 2],
    [18, -Math.PI / 2],
  ] as [number, number][]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), m(0x140d1e));
    wall.rotation.y = rotation;
    wall.position.set(x, 8.5, 2);
    root.add(wall);
  }
  // Nâng trần cao hơn hẳn đỉnh khung màn để không che viền vàng khi nhìn chính diện.
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(38, 26), m(0x0e0a18));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 17.2, 2);
  root.add(ceiling);

  const stripMat = m(0x3d2a45);
  for (let z = -8; z <= 8; z += 3) {
    for (const x of [-17.9, 17.9]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 16, 0.2), stripMat);
      strip.position.set(x, 7.5, z);
      root.add(strip);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x9966cc }),
      );
      lamp.position.set(x, 10.2, z);
      root.add(lamp);
    }
  }

  const stage = new THREE.Mesh(new THREE.BoxGeometry(25.8, 0.12, 0.5), m(0x251838));
  stage.position.set(0, -0.45, -8.32);
  root.add(stage);
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(25.8, 0.035, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x4433aa }),
  );
  edge.position.set(0, -0.39, -8.06);
  root.add(edge);
}

/** Dựng sàn và các chi tiết nền cho rạp ngoài trời. */
export function addOutdoorRoom(root: THREE.Group): void {
  const m = (c: number) => new THREE.MeshLambertMaterial({ color: c, side: THREE.FrontSide });
  // Chừa khoảng thoáng trên nền ngay sau màn: canvas 3D nằm trên iframe,
  // nên mặt đất ở phía sau có thể phủ lên mép dưới video nếu để chạy liên tục.
  const floorMat = m(0x17241e);
  const floorPieces: Array<[number, number, number, number]> = [
    [-28, 8, 2, 50], // bãi cỏ bên trái
    [28, 8, 2, 50], // bãi cỏ bên phải
    [0, 48, 9.5, 35], // bãi cỏ phía trước màn và dưới khu ghế
  ];
  for (const [x, width, z, depth] of floorPieces) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, -0.51, z);
    floor.receiveShadow = true;
    root.add(floor);
  }

  const deck = new THREE.Mesh(new THREE.BoxGeometry(25, 0.045, 25), m(0x29232b));
  // Mép sau sàn dừng trước màn để không đè hình chiếu ở cạnh dưới.
  deck.position.set(0, -0.475, 5);
  deck.receiveShadow = true;
  root.add(deck);

  // Màn chiếu ngoài trời đứng trên hai cột gỗ; để trống phía sau cho bầu trời đêm.
  const postMat = m(0x3a2d2a);
  for (const x of [-16.2, 16.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 15.8, 0.32), postMat);
    post.position.set(x, 7.5, -8.45);
    root.add(post);
  }
  // Gờ sân khấu thấp, đặt sát chân màn chiếu.
  const stage = new THREE.Mesh(new THREE.BoxGeometry(25.8, 0.12, 0.5), m(0x251838));
  stage.position.set(0, -0.45, -8.32);
  root.add(stage);

  // Viền sáng stage
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x4433aa });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(25.8, 0.035, 0.04), edgeMat);
  edge.position.set(0, -0.39, -8.06);
  root.add(edge);
}

/** Dựng các đèn lối đi trong không gian ngoài trời. */
export function addOutdoorLights(root: THREE.Group): void {
  const wood = new THREE.MeshLambertMaterial({ color: 0x49362c });
  const wire = new THREE.MeshBasicMaterial({ color: 0x201b21 });
  const bulb = new THREE.MeshBasicMaterial({ color: 0xffd995 });
  const zPosts = [-7, -1, 5, 11];

  for (const side of [-1, 1]) {
    const x = side * 16.2;
    for (const z of zPosts) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 9.2, 0.2), wood);
      post.position.set(x, 3.95, z);
      root.add(post);
    }

    const cablePoints: THREE.Vector3[] = [];
    for (let index = 0; index < zPosts.length; index++) {
      const z = zPosts[index];
      cablePoints.push(new THREE.Vector3(x, index % 2 === 0 ? 8.45 : 8.8, z));
    }
    const cableCurve = new THREE.CatmullRomCurve3(cablePoints);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 36, 0.018, 5, false), wire));

    for (let index = 0; index < 12; index++) {
      const z = -6.4 + index * 1.55;
      const y = 8.65 - Math.sin((index / 11) * Math.PI * 3) * 0.16;
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 6), wood);
      socket.position.set(x, y - 0.1, z);
      root.add(socket);
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), bulb);
      light.position.set(x, y - 0.23, z);
      root.add(light);
      const glow = new THREE.PointLight(0xffc978, 0.5, 5, 2);
      glow.position.copy(light.position);
      root.add(glow);
    }
  }
}
