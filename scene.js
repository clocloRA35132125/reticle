// Décor du hero : un stand d'entraînement au tir en 3D, vu depuis le poste de tir.
// La cible centrale est pile derrière le réticule ; les autres tombent quand elles sont « touchées ».
import * as THREE from './vendor/three.module.min.js';

const canvas = document.getElementById('heroGL');
const hero = document.querySelector('.hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeCanvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return; // pas de WebGL : le fond uni du hero reste affiché
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const BG = 0x0b0c0d;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 20, 75);

  const camera = new THREE.PerspectiveCamera(46, 1, .1, 200);
  const EYE = new THREE.Vector3(0, 1.6, 9);
  const LOOK = new THREE.Vector3(0, 1.6, -26);

  /* ---------- Matériaux ---------- */
  const std = (color, roughness = .85, metalness = .05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mFloor = std(0x2a2f32, .62, .2);
  const mWall = std(0x2b2f32, .9);
  const mPanel = std(0x3a4044, .7, .1);
  const mDark = std(0x1a1d1f, .85);
  const mMetal = std(0x3b4044, .38, .75);
  const mCrate = std(0x4a473a, .85);
  const mLine = std(0x50575c, .6, .1);
  const mLime = new THREE.MeshStandardMaterial({ color: 0xc6ff3d, emissive: 0xc6ff3d, emissiveIntensity: 1.4 });
  const mLamp = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeef3ea, emissiveIntensity: 2.4 });

  const box = (w, h, d, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  /* ---------- Structure du stand ---------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 120), mFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -40;
  floor.receiveShadow = true;
  scene.add(floor);

  // Séparations de couloirs et ligne de tir
  [-10.5, -3.5, 3.5, 10.5].forEach((x) => box(.06, .02, 56, mLine, x, .011, -22, false));
  box(24, .02, .08, mLime, 0, .012, 4.6, false);

  // Comptoir du poste de tir, au premier plan
  box(26, .86, .5, mPanel, 0, .43, 6.6);
  box(26, .05, .64, mMetal, 0, .885, 6.6);
  box(26, .022, .022, mLime, 0, .9, 6.27, false);

  // Murs latéraux, piliers, plafond et rampes lumineuses
  [-12.6, 12.6].forEach((x) => box(.5, 9.4, 72, mWall, x, 4.7, -18, false));
  for (let z = 2; z >= -50; z -= 8) {
    [-12.1, 12.1].forEach((x) => box(.8, 9, .8, mPanel, x, 4.5, z));
    box(25, .35, .5, mDark, 0, 8.7, z, false);
    [-5, 5].forEach((x) => box(5.5, .05, .22, mLamp, x, 8.48, z, false));
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 80), mDark);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 9, -18);
  scene.add(ceil);

  // Mur du fond : talus pare-balles et lames acoustiques
  box(26, 10, .5, mWall, 0, 5, -52.5, false);
  for (let x = -12; x <= 12; x += 1) box(.5, 7.6, .3, mPanel, x, 4.6, -52.1, false);
  const berm = box(25, 2.6, 4, mDark, 0, .9, -50);
  berm.rotation.x = -.45;

  // Marquages de distance au sol
  const marker = (txt, z) => {
    const tex = makeCanvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = 'rgba(210,215,205,.55)';
      g.font = '500 64px "Geist Mono", monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, w / 2, h / 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(-7, .014, z);
    scene.add(m);
  };
  marker('10 M', -2); marker('25 M', -17); marker('50 M', -42);

  // Caisses et fûts pour la profondeur
  const edge = new THREE.LineBasicMaterial({ color: 0x45443a, transparent: true, opacity: .5 });
  const crate = (s, x, y, z, ry = 0) => {
    const m = box(s, s, s, mCrate, x, y, z);
    m.rotation.y = ry;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edge));
  };
  crate(1.3, -9.4, .65, -3.5, .2); crate(1, -9.2, 1.8, -3.7, -.15); crate(1.2, 9.6, .6, -9, -.3); crate(1.1, -9.8, .55, -15, .5);
  const barrel = (x, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 1.1, 24), std(0x2f3438, .5, .5));
    m.position.set(x, .55, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  };
  barrel(10.1, -2.6); barrel(9.2, -1.9);

  /* ---------- Cibles ---------- */
  const targetTex = makeCanvasTexture(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#e8eae4';
    g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#141617';
    for (let r = c - 14; r > 40; r -= 44) { g.lineWidth = 6; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#141617'; g.beginPath(); g.arc(c, c, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c6ff3d'; g.beginPath(); g.arc(c, c, 34, 0, Math.PI * 2); g.fill();
  });

  const targets = [];
  const makeTarget = (x, z, s = 1) => {
    const base = box(.7, .28, .45, mMetal, x, .14, z);
    base.scale.setScalar(s);
    const pivot = new THREE.Group();
    pivot.position.set(x, .3, z);
    scene.add(pivot);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.06, 1, .06), mMetal);
    post.position.y = .5;
    post.castShadow = true;
    const face = new THREE.MeshStandardMaterial({ map: targetTex, roughness: .9, emissive: 0xc6ff3d, emissiveIntensity: 0 });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.5, 48), face);
    disc.position.set(0, 1.3, .03);
    disc.castShadow = true;
    const back = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .05, 48), mDark);
    back.rotation.x = Math.PI / 2;
    back.position.y = 1.3;
    back.castShadow = true;
    pivot.add(post, back, disc);
    pivot.scale.setScalar(s);
    targets.push({ pivot, face, down: false });
  };
  makeTarget(0, -26, 1.15); // pile derrière le réticule
  [[-5, -11], [4.6, -15], [-8.4, -23], [8.2, -30], [-3.4, -37], [5.6, -43], [-7, -45]].forEach(([x, z]) => makeTarget(x, z));

  function hit(t) {
    if (t.down) return;
    t.down = true;
    window.dispatchEvent(new Event('target:hit'));
    gsap.timeline({ onComplete: () => (t.down = false) })
      .fromTo(t.face, { emissiveIntensity: 1.2 }, { emissiveIntensity: 0, duration: .5 }, 0)
      .to(t.pivot.rotation, { x: -Math.PI / 2 * .96, duration: .24, ease: 'power2.in' }, 0)
      .to(t.pivot.rotation, { x: 0, duration: 1.1, ease: 'elastic.out(1,.55)' }, '+=1.4');
  }
  // Tirs réguliers sur les cibles, la centrale est touchée à la fin de l'intro
  const loop = () => {
    const pool = targets.filter((t, i) => !t.down && (i > 0 || Math.random() < .2));
    if (pool.length) hit(pool[Math.floor(Math.random() * pool.length)]);
    gsap.delayedCall(1.5 + Math.random() * 1.8, loop);
  };
  window.addEventListener('hero:ready', () => { hit(targets[0]); gsap.delayedCall(2.2, loop); }, { once: true });

  /* ---------- Lumières ---------- */
  scene.add(new THREE.HemisphereLight(0xc8d2d6, 0x1a1c1e, 1.6));
  const spot = (z, tz, intensity, shadow) => {
    const l = new THREE.SpotLight(0xeef3ea, intensity, 0, .62, .75, 1.6);
    l.position.set(0, 8.3, z);
    l.target.position.set(0, 0, tz);
    if (shadow) {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -.0004;
    }
    scene.add(l, l.target);
  };
  spot(-6, -9, 700, true);
  spot(-22, -26, 900, true);
  spot(-38, -42, 800, false);
  const wallLight = new THREE.SpotLight(0xdfe6e0, 700, 0, .7, .8, 1.6);
  wallLight.position.set(0, 8.6, -42);
  wallLight.target.position.set(0, 3, -52);
  scene.add(wallLight, wallLight.target);
  const limeGlow = new THREE.PointLight(0xc6ff3d, 14, 9, 2);
  limeGlow.position.set(0, .4, 5);
  scene.add(limeGlow);

  /* ---------- Poussière dans les faisceaux ---------- */
  const N = 420, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 20;
    pos[i * 3 + 1] = .5 + Math.random() * 7.5;
    pos[i * 3 + 2] = -48 + Math.random() * 52;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xdfe6dc, size: .035, transparent: true, opacity: .4, depthWrite: false }));
  scene.add(dust);

  /* ---------- Caméra, souris, scroll ---------- */
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX / innerWidth * 2 - 1;
    mouse.y = e.clientY / innerHeight * 2 - 1;
  });

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    const p = Math.min(1, Math.max(0, scrollY / hero.offsetHeight));
    mouse.sx += (mouse.x - mouse.sx) * .04;
    mouse.sy += (mouse.y - mouse.sy) * .04;
    const idle = reduce ? 0 : 1;

    // La caméra bouge autour du poste mais vise toujours la cible centrale
    camera.position.set(
      EYE.x + Math.sin(t * .23) * .14 * idle + mouse.sx * .45,
      EYE.y + Math.sin(t * .37) * .04 * idle - mouse.sy * .18,
      EYE.z - p * 12,
    );
    camera.fov = 46 - p * 16;
    camera.updateProjectionMatrix();
    camera.lookAt(LOOK);

    dust.position.y = Math.sin(t * .2) * .15;
    dust.rotation.y = t * .004;
    renderer.render(scene, camera);
  });
}

init();
