import * as THREE from 'three';

/** Dựng cặp loa hai bên màn chiếu, hướng về phía khán giả. */
export function addSpeakers(scene: THREE.Scene): void {
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x140e1c });
  const grillMat = new THREE.MeshLambertMaterial({ color: 0x1c1424 });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x3d2850 });
  const driverMat = new THREE.MeshLambertMaterial({ color: 0x221830 });
  const goldMat = new THREE.MeshBasicMaterial({ color: 0xc49a45 });

  // Hai loa vẫn đứng sát hai góc tường; mặt loa chĩa chéo vào giữa khán giả.
  for (const sx of [-16.7, 16.7]) {
    const g = new THREE.Group();
    const wallCorner = new THREE.Vector3(sx, 4.3, -6.8);
    const audienceTarget = new THREE.Vector3(0, 4.3, 2);
    g.position.copy(wallCorner);
    // Các mặt lưới dùng trục +Z làm hướng phát âm thanh.
    g.rotation.y = Math.atan2(audienceTarget.x - wallCorner.x, audienceTarget.z - wallCorner.z);

    // Thân thùng loa to và cao (Hộp 2.8m x 9.6m x 1.4m)
    const spk = new THREE.Mesh(new THREE.BoxGeometry(2.8, 9.6, 1.4), bodyMat);
    g.add(spk);

    // Khung viền kim loại sang trọng
    const rim = new THREE.Mesh(new THREE.BoxGeometry(2.9, 9.7, 1.3), rimMat);
    rim.position.z = -0.02;
    g.add(rim);

    // Mặt màng loa lưới phía trước (Grill)
    const grill = new THREE.Mesh(new THREE.BoxGeometry(2.5, 9.2, 0.15), grillMat);
    grill.position.z = 0.68;
    g.add(grill);

    // ── Dàn củ loa chuyên nghiệp bên trong ──
    // 1. Củ Loa Bass/Sub 1 (Cực to – tầng đáy)
    const sub1 = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), driverMat);
    sub1.position.set(0, -2.8, 0.77);
    g.add(sub1);
    const sub1Rim = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.94, 24), goldMat);
    sub1Rim.position.set(0, -2.8, 0.78);
    g.add(sub1Rim);
    const sub1Cone = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 16),
      new THREE.MeshBasicMaterial({ color: 0x4a2e58 }),
    );
    sub1Cone.position.set(0, -2.8, 0.79);
    g.add(sub1Cone);

    // 2. Củ Loa Bass/Sub 2 (To – tầng giữa dưới)
    const sub2 = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), driverMat);
    sub2.position.set(0, -0.9, 0.77);
    g.add(sub2);
    const sub2Rim = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.94, 24), rimMat);
    sub2Rim.position.set(0, -0.9, 0.78);
    g.add(sub2Rim);
    const sub2Cone = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 16),
      new THREE.MeshBasicMaterial({ color: 0x3d2547 }),
    );
    sub2Cone.position.set(0, -0.9, 0.79);
    g.add(sub2Cone);

    // 3. Củ Loa Mid-range (Tầng giữa trên)
    const mid = new THREE.Mesh(new THREE.CircleGeometry(0.65, 20), driverMat);
    mid.position.set(0, 1.1, 0.77);
    g.add(mid);
    const midRim = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 20), goldMat);
    midRim.position.set(0, 1.1, 0.78);
    g.add(midRim);
    const midCone = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 14),
      new THREE.MeshBasicMaterial({ color: 0x4a2e58 }),
    );
    midCone.position.set(0, 1.1, 0.79);
    g.add(midCone);

    // 4. Loa Treble Horn
    const tweet = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), driverMat);
    tweet.position.set(0, 2.7, 0.77);
    g.add(tweet);
    const tweetRim = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.48, 16), rimMat);
    tweetRim.position.set(0, 2.7, 0.78);
    g.add(tweetRim);

    // 5. Cặp Tweeter phụ nhỏ đỉnh loa
    for (const tox of [-0.65, 0.65]) {
      const miniTweet = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 12),
        new THREE.MeshBasicMaterial({ color: 0x221830 }),
      );
      miniTweet.position.set(tox, 3.8, 0.77);
      g.add(miniTweet);
      const miniRim = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 12), goldMat);
      miniRim.position.set(tox, 3.8, 0.78);
      g.add(miniRim);
    }

    // 6. Dải đèn LED neon trên đỉnh loa
    const topLed = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.1, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x55ffcc }),
    );
    topLed.position.set(0, 4.45, 0.77);
    g.add(topLed);

    // 7. Huy hiệu thương hiệu loa ánh vàng ở chân loa
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xc49a45, transparent: true, opacity: 0.9 }),
    );
    badge.position.set(0, -4.2, 0.78);
    g.add(badge);

    scene.add(g);

    // Đèn loa – chiếu sáng từ loa ra khán giả
    const speakerLight = new THREE.PointLight(0x8855ff, 2.0, 18);
    speakerLight.position.set(sx - Math.sign(sx) * 0.6, 4.3, -5.9);
    scene.add(speakerLight);
  }
}
