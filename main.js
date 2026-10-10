// Lien de téléchargement : toujours la dernière Release GitHub
const DOWNLOAD_URL = 'https://github.com/clocloRA35132125/reticle/releases/latest/download/Reticle-Setup.exe';

gsap.registerPlugin(ScrollTrigger);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const dpr = window.devicePixelRatio || 1;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine) and (min-width: 901px)').matches;

$('#dlBtn').href = DOWNLOAD_URL;

/* ---------- Défilement fluide ---------- */

let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: .09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else if (typeof target === 'number') window.scrollTo(0, target);
  else $(target).scrollIntoView();
};
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  e.preventDefault();
  scrollTo(id === '#top' ? 0 : id);
}));

/* ---------- Règle graduée + repères de sections ---------- */

// La règle affiche la position réelle de la page en pixels, comme une mire
const ticks = $('#ticks'), rLabels = $('#rulerLabels'), rY = $('#rulerY');
const STEP = 160;
const labelEls = Array.from({ length: Math.ceil(innerHeight / STEP) + 2 }, () => rLabels.appendChild(document.createElement('span')));
function updateRuler() {
  const y = window.scrollY, off = y % STEP;
  ticks.style.backgroundPositionY = `${-(y % 80)}px, ${-(y % 8)}px`;
  const first = Math.floor(y / STEP);
  labelEls.forEach((el, k) => {
    el.style.top = (k * STEP - off) + 'px';
    el.textContent = (first + k) * STEP;
  });
  rY.textContent = Math.round(y + innerHeight / 2);
}
updateRuler();
addEventListener('scroll', updateRuler, { passive: true });

const secLinks = $$('#sections a');
$$('[data-sec-id]').forEach((sec) => ScrollTrigger.create({
  trigger: sec, start: 'top 50%', end: 'bottom 50%',
  onToggle: (s) => s.isActive && secLinks.forEach((a) => a.classList.toggle('on', a.dataset.sec === sec.dataset.secId)),
}));

/* ---------- Découpage des titres en mots ---------- */

function splitWords(el) {
  const out = [];
  const frag = document.createDocumentFragment();
  [...el.childNodes].forEach((n) => {
    const cls = n.nodeType === 1 ? n.className : '';
    n.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'word';
      const i = document.createElement('span');
      if (cls) i.className = cls;
      i.textContent = part;
      w.appendChild(i);
      frag.appendChild(w);
      out.push(i);
    });
  });
  el.replaceChildren(frag);
  return out;
}
$$('[data-split]').forEach((h) => {
  gsap.from(splitWords(h), {
    yPercent: 110, rotate: 4, duration: 1, stagger: .06, ease: 'power4.out',
    scrollTrigger: { trigger: h, start: 'top 85%' },
  });
});

/* ---------- Intro + hero ---------- */

const W1 = $('.w1 .wi'), W2 = $('.w2 .wi');
const centerTxt = () => `x ${Math.round(innerWidth * dpr / 2)} · y ${Math.round(innerHeight * dpr / 2)}`;
$('#heroCoord').textContent = centerTxt();
addEventListener('resize', () => ($('#heroCoord').textContent = centerTxt()));

gsap.set([W1, W2], { xPercent: (i) => (i ? -110 : 110) });
gsap.set('#heroXh', { scale: 2.6, rotate: 90, autoAlpha: 0 });
gsap.set('#ruleH', { scaleX: 0 });
gsap.set('#ruleV', { scaleY: 0 });
gsap.set('#heroSub', { xPercent: -50 });
gsap.set(['#heroSub', '#scrollHint', '#hudR'], { y: 30, autoAlpha: 0 });
gsap.set(['#nav', '.ruler', '.sections'], { autoAlpha: 0 });

function heroIn() {
  return gsap.timeline({ onComplete: () => window.dispatchEvent(new Event('hero:ready')) })
    .to('#ruleH', { scaleX: 1, duration: 1.2, ease: 'expo.inOut' })
    .to('#ruleV', { scaleY: 1, duration: 1.2, ease: 'expo.inOut' }, '<.1')
    .to('#heroXh', { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.1, ease: 'back.out(1.4)' }, '<.35')
    .to([W1, W2], { xPercent: 0, duration: 1.3, ease: 'expo.out' }, '<.25')
    .to('#heroSub', { y: 0, autoAlpha: 1, duration: .9, ease: 'power3.out' }, '<.4')
    .to(['#nav', '.ruler', '.sections'], { autoAlpha: 1, duration: .8, ease: 'power3.out' }, '<.1')
    .to(['#scrollHint', '#hudR'], { y: 0, autoAlpha: 1, duration: .8, ease: 'power3.out' }, '<.1');
}

function intro() {
  const count = { v: 0 };
  return gsap.timeline({ onComplete: () => { $('#loader').remove(); lenis?.start(); } })
    .from('.ld-l', { scale: 0, duration: .8, stagger: .08, ease: 'expo.out' })
    .to(count, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => ($('#ldCount').textContent = String(Math.round(count.v)).padStart(3, '0')) }, 0)
    .to('.ld-t', { y: -26, duration: .6, ease: 'back.in(2)' }, 1.1)
    .to('.ld-b', { y: 26, duration: .6, ease: 'back.in(2)' }, 1.1)
    .to('.ld-lf', { x: -26, duration: .6, ease: 'back.in(2)' }, 1.1)
    .to('.ld-r', { x: 26, duration: .6, ease: 'back.in(2)' }, 1.1)
    .to('.ld-l', { autoAlpha: 0, duration: .3 }, 1.6)
    .to('#loader', { clipPath: 'inset(50% 0% 50% 0%)', duration: .9, ease: 'expo.inOut' }, 1.5)
    .add(heroIn(), 1.85);
}

Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  if (reduce) { $('#loader').remove(); heroIn().progress(1); return; }
  intro();
});

gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
  .to('.w1', { x: () => -innerWidth * .28, ease: 'none' }, 0)
  .to('.w2', { x: () => innerWidth * .28, ease: 'none' }, 0)
  .to('#heroXh svg', { scale: 2.4, rotate: 45, opacity: 0, ease: 'none' }, 0)
  .to('#heroCoord', { opacity: 0, ease: 'none' }, 0)
  .to(['#ruleH', '#ruleV'], { opacity: 0, ease: 'none' }, 0)
  .to('#heroSub > *', { y: -60, opacity: 0, ease: 'none' }, 0);

ScrollTrigger.create({ start: 40, end: 'max', onToggle: (s) => $('#nav').classList.toggle('solid', s.isActive) });

// Compteur de cibles touchées, alimenté par la scène 3D
let hits = 0;
window.addEventListener('target:hit', () => {
  hits++;
  const el = $('#hitCount');
  el.textContent = String(hits).padStart(2, '0');
  gsap.fromTo(el, { color: '#c6ff3d', y: -4 }, { color: '#ececee', y: 0, duration: .8, ease: 'power3.out' });
});

/* ---------- Éditeur : onglets avec lecture automatique ---------- */

const shots = $$('.shot'), tabs = $$('.sct'), spots = $('#spots');
// Points d'intérêt posés sur chaque capture (coordonnées en % de la fenêtre)
const SPOTS = [
  [{ x: 39, y: 46, t: 'Couches en relief' }, { x: 55, y: 5, t: 'Bascule 2D / 3D' }, { x: 86, y: 12, t: '4 onglets de réglages', l: true }],
  [{ x: 39, y: 46, t: '1 case = 1 pixel' }, { x: 87, y: 24, t: 'Contour et halo', l: true }, { x: 40, y: 93, t: 'Valeurs en direct' }],
  [{ x: 24, y: 30, t: '12 préréglages' }, { x: 38, y: 5, t: 'Import CS2 / Valorant' }, { x: 62, y: 5, t: 'Partage par code' }],
];
const SHOW_TIME = 6;
let current = -1, bar;
const autoplay = { active: false, hover: false };
const syncPlay = () => bar && (autoplay.active && !autoplay.hover ? bar.play() : bar.pause());

function placeSpots(i) {
  const old = [...spots.children];
  gsap.to(old, { scale: .6, autoAlpha: 0, duration: .25, onComplete: () => old.forEach((o) => o.remove()) });
  const els = SPOTS[i].map((s) => {
    const el = document.createElement('div');
    el.className = 'spot' + (s.l ? ' left' : '');
    el.style.left = s.x + '%';
    el.style.top = s.y + '%';
    el.innerHTML = `<i></i><span>${s.t}</span>`;
    spots.appendChild(el);
    return el;
  });
  gsap.fromTo(els, { scale: .4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .6, stagger: .12, delay: .7, ease: 'back.out(2)' });
}

function show(i) {
  if (i === current) return;
  const dir = i > current ? 1 : -1, prev = shots[current], next = shots[i];
  shots.forEach((s) => gsap.set(s, { zIndex: s === next ? 3 : s === prev ? 2 : 1 }));
  // Révélation circulaire depuis le centre du réticule, comme une lunette qui s'ouvre
  gsap.fromTo(next, { clipPath: 'circle(0% at 39% 47%)', scale: 1.08 }, { clipPath: 'circle(130% at 39% 47%)', scale: 1, duration: 1.1, ease: 'expo.inOut' });
  if (prev) gsap.to(prev, { scale: .96, duration: 1.1, ease: 'expo.inOut', onComplete: () => gsap.set(prev, { scale: 1 }) });
  if (current >= 0) gsap.fromTo('#appWindow', { rotationY: -6 * dir }, { rotationY: 0, duration: 1.4, ease: 'expo.out' });

  tabs.forEach((t, k) => t.classList.toggle('on', k === i));
  $$('.sct-bar i').forEach((b, k) => k !== i && gsap.to(b, { scaleX: 0, duration: .3 }));
  bar?.kill();
  bar = gsap.fromTo($('.sct-bar i', tabs[i]), { scaleX: 0 }, {
    scaleX: 1, duration: SHOW_TIME, ease: 'none', paused: true,
    onComplete: () => show((i + 1) % shots.length),
  });
  syncPlay();
  placeSpots(i);
  current = i;
}

tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
$('#tilt').addEventListener('pointerenter', () => { autoplay.hover = true; syncPlay(); });
$('#tilt').addEventListener('pointerleave', () => { autoplay.hover = false; syncPlay(); });
ScrollTrigger.create({ trigger: '.sc-grid', start: 'top 75%', end: 'bottom 20%', onToggle: (s) => { autoplay.active = s.isActive; syncPlay(); } });
gsap.set(shots, { clipPath: 'circle(0% at 39% 47%)' });
show(0);

// Entrée : la fenêtre se redresse en montant
gsap.fromTo('#appWindow', { rotationX: 22, y: 80, scale: .92 }, {
  rotationX: 0, y: 0, scale: 1, ease: 'none',
  scrollTrigger: { trigger: '.sc-grid', start: 'top bottom', end: 'top 35%', scrub: true },
});
gsap.from('.sct', { x: -30, autoAlpha: 0, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.sc-grid', start: 'top 75%' } });

if (fine) {
  const tilt = $('#tilt');
  tilt.addEventListener('pointermove', (e) => {
    const r = tilt.getBoundingClientRect();
    gsap.to(tilt, { rotationY: ((e.clientX - r.left) / r.width - .5) * 5, rotationX: -((e.clientY - r.top) / r.height - .5) * 5, duration: .8, ease: 'power3' });
  });
  tilt.addEventListener('pointerleave', () => gsap.to(tilt, { rotationY: 0, rotationX: 0, duration: 1.2, ease: 'elastic.out(1,.6)' }));
}

/* ---------- Préréglages en bandeau ---------- */

const sizeOf = (s) => Crosshair.extent(s) * 2 + 1;
function drawCrosshair(canvas, c, max) {
  const size = sizeOf(c), z = Math.max(1, Math.min(6, Math.floor(max / size)));
  canvas.width = canvas.height = size;
  canvas.style.width = canvas.style.height = size * z + 'px';
  Crosshair.draw(canvas.getContext('2d'), c);
  canvas.style.opacity = c.opacity / 100;
}
const metaOf = (p) => p.lines ? `${p.length}/${p.gap}/${p.thickness}` : p.circle ? `r${p.circleRadius}` : `${p.dotSize}px`;

const track = $('#track');
[...Crosshair.PRESETS, ...Crosshair.PRESETS].forEach((p) => {
  const el = document.createElement('div');
  el.className = 'pc';
  el.innerHTML = `<div class="tile"><canvas></canvas></div><span class="nm">${p.name}</span><span class="mt">${metaOf(p.c)}</span>`;
  drawCrosshair($('canvas', el), p.c, 120);
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { rotationY: ((e.clientX - r.left) / r.width - .5) * 18, rotationX: -((e.clientY - r.top) / r.height - .5) * 18, y: -6, duration: .4 });
  });
  el.addEventListener('pointerleave', () => gsap.to(el, { rotationY: 0, rotationX: 0, y: 0, duration: 1, ease: 'elastic.out(1,.5)' }));
  track.appendChild(el);
});

// Défilement infini, accéléré par la vitesse du scroll, ralenti au survol
let mx = 0, speed = 1, target = 1;
const marq = $('#marquee');
marq.addEventListener('pointerenter', () => (target = .15));
marq.addEventListener('pointerleave', () => (target = 1));
gsap.ticker.add((t, dt) => {
  if (reduce) return;
  speed += (target - speed) * .06;
  const boost = lenis ? Math.min(Math.abs(lenis.velocity) * .6, 18) : 0;
  const half = track.scrollWidth / 2;
  mx = gsap.utils.wrap(-half, 0, mx - (speed * .9 + boost) * dt / 16.67);
  gsap.set(track, { x: mx });
});

/* ---------- Démo d'import ---------- */

const screenH = Math.round(screen.height * dpr) || 1080;
const codeIn = $('#codeIn');
function checkCode() {
  const raw = codeIn.value, res = Crosshair.importCode(raw, screenH);
  const badge = $('#codeBadge'), cvs = $('#codePrev'), dds = $$('#codeSpecs dd');
  badge.classList.toggle('ok', !!res);
  badge.classList.toggle('err', !res && raw.trim() !== '');
  if (!res) {
    badge.textContent = raw.trim() ? 'Code non reconnu' : "En attente d'un code";
    dds.forEach((d) => (d.textContent = '—'));
    cvs.getContext('2d').clearRect(0, 0, cvs.width, cvs.height);
    return;
  }
  const c = res.c;
  badge.textContent = `Code ${res.type} reconnu · ${screenH}p`;
  dds[0].textContent = c.lines ? `${c.length} px` : '—';
  dds[1].textContent = c.lines ? `${c.gap} px` : '—';
  dds[2].textContent = c.lines ? `${c.thickness} px` : `${c.dotSize} px`;
  dds[3].innerHTML = `<i style="background:${c.color}"></i>${c.color.toUpperCase()}`;
  drawCrosshair(cvs, c, 150);
  gsap.fromTo(cvs, { scale: .5, rotate: -45 }, { scale: 1, rotate: 0, duration: .7, ease: 'back.out(1.8)' });
  gsap.fromTo(dds, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .4, stagger: .05 });
}
codeIn.addEventListener('input', checkCode);

let typing;
function typeCode(code) {
  typing?.kill();
  const o = { n: 0 };
  typing = gsap.to(o, {
    n: code.length, duration: Math.min(1.4, code.length * .035), ease: 'none',
    onUpdate: () => (codeIn.value = code.slice(0, Math.round(o.n))),
    onComplete: checkCode,
  });
}
$$('.chip').forEach((b) => b.addEventListener('click', () => typeCode(b.dataset.code)));
ScrollTrigger.create({ trigger: '#demo', start: 'top 70%', once: true, onEnter: () => !codeIn.value && setTimeout(() => typeCode($('.chip').dataset.code), 500) });

if (fine) {
  const demo = $('#demo');
  demo.addEventListener('pointermove', (e) => {
    const r = demo.getBoundingClientRect();
    gsap.to(demo, { rotationY: ((e.clientX - r.left) / r.width - .5) * 6, rotationX: -((e.clientY - r.top) / r.height - .5) * 6, transformPerspective: 1200, duration: .6 });
  });
  demo.addEventListener('pointerleave', () => gsap.to(demo, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1,.6)' }));
}

/* ---------- Apparitions ---------- */

gsap.set('[data-reveal]', { y: 34, autoAlpha: 0 });
ScrollTrigger.batch('[data-reveal]', {
  start: 'top 88%', once: true,
  onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, duration: 1, stagger: .08, ease: 'power3.out' }),
});

$$('.step').forEach((s, i) => {
  gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 85%' } })
    .from($('.line', s), { scaleX: 0, duration: 1.2, ease: 'expo.inOut', delay: i * .12 })
    .from([...s.children].slice(1), { y: 26, autoAlpha: 0, duration: .8, stagger: .07, ease: 'power3.out' }, '<.3');
});

$$('[data-count]').forEach((el) => {
  const o = { v: 0 };
  gsap.to(o, {
    v: +el.dataset.count, duration: 1.6, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%' },
    onUpdate: () => (el.textContent = Math.round(o.v)),
  });
});

/* ---------- FAQ ---------- */

$$('.qa').forEach((qa) => $('.q', qa).addEventListener('click', () => {
  const open = !qa.classList.contains('open');
  $$('.qa.open').forEach((o) => { if (o !== qa) { o.classList.remove('open'); gsap.to($('.a', o), { height: 0, duration: .5, ease: 'power3.inOut' }); } });
  qa.classList.toggle('open', open);
  gsap.to($('.a', qa), { height: open ? 'auto' : 0, duration: .55, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
}));

/* ---------- Final ---------- */

const chars = $$('.final-title .ft').flatMap((ft) => {
  const letters = [...ft.textContent].map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.display = 'inline-block';
    return s;
  });
  ft.replaceChildren(...letters);
  return letters;
});
gsap.from(chars, {
  yPercent: 120, rotate: 12, opacity: 0, duration: 1.1, stagger: .045, ease: 'expo.out',
  scrollTrigger: { trigger: '.final', start: 'top 60%' },
});
gsap.from('#dlBtn', { scale: .6, autoAlpha: 0, duration: 1, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.final', start: 'top 45%' } });

// Dans la section finale, la mire suit la souris comme une visée
if (fine) {
  const fin = $('.final'), rh = $('.final .rh'), rv = $('.final .rv');
  const qh = gsap.quickTo(rh, 'y', { duration: .5, ease: 'power3' }), qv = gsap.quickTo(rv, 'x', { duration: .5, ease: 'power3' });
  fin.addEventListener('pointermove', (e) => {
    const r = fin.getBoundingClientRect();
    qh(e.clientY - r.top - r.height / 2);
    qv(e.clientX - r.left - r.width / 2);
  });
}

// Boutons magnétiques
if (fine) $$('.magnetic').forEach((b) => {
  b.addEventListener('pointermove', (e) => {
    const r = b.getBoundingClientRect();
    gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4, duration: .4, ease: 'power3' });
  });
  b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.4)' }));
});

addEventListener('load', () => ScrollTrigger.refresh());
