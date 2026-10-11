// Moteur de rendu partagé (app + overlay) : tout est dessiné en rectangles
// entiers pour rester au pixel près, sans anticrénelage sur les lignes.
(function (root) {
  const DEFAULT = {
    color: '#c6ff3d', opacity: 100,
    lines: true, orient: 'plus', armTop: true, armRight: true, armBottom: true, armLeft: true,
    length: 6, gap: 3, thickness: 2, lineAlpha: 100,
    split: false, vLength: 6, vThickness: 2, // lignes verticales réglées à part
    outer: false, outerLength: 3, outerGap: 12, outerThickness: 2, outerAlpha: 50,
    centerDot: true, dotSize: 2, dotAlpha: 100,
    circle: false, circleRadius: 12, circleThickness: 1,
    outline: true, outlineThickness: 1, outlineAlpha: 100,
    glow: false, glowStrength: 4,
  };

  // Accepte aussi l'ancien format (champ `shape`) des réticules enregistrés
  function normalize(c = {}) {
    const n = { ...DEFAULT, ...c };
    if ('shape' in c) {
      n.lines = c.shape === 'cross' || c.shape === 't';
      n.armTop = c.shape !== 't';
      n.circle = c.shape === 'circle';
      if (n.circle) { n.circleRadius = c.gap + c.length; n.circleThickness = c.thickness; }
      n.centerDot = !!c.centerDot || c.shape === 'dot';
      delete n.shape;
    }
    return n;
  }

  const P = (name, c) => ({ name, c: normalize(c) });
  const PRESETS = [
    P('Classique', {}),
    P('Compétitif', { color: '#3dd6ff', length: 4, gap: 2, centerDot: false }),
    P('Valorant défaut', { color: '#ffffff', length: 6, gap: 3, thickness: 2, lineAlpha: 80, outer: true, outerLength: 2, outerGap: 10, outerThickness: 2, outerAlpha: 35, centerDot: false, outlineAlpha: 50 }),
    P('Point', { color: '#ececee', lines: false, dotSize: 4 }),
    P('Holo', { color: '#ff4d6a', lines: false, circle: true, circleRadius: 13, outline: false }),
    P('T-shape', { color: '#ffb03d', armTop: false, length: 7, gap: 4, centerDot: false }),
    P('Diagonal', { color: '#ececee', orient: 'x', length: 5, gap: 2, thickness: 2, centerDot: true }),
    P('Néon', { color: '#ff4d6a', length: 7, gap: 3, thickness: 2, outline: false, glow: true, glowStrength: 5 }),
    P('Sniper fin', { color: '#ececee', length: 18, gap: 6, thickness: 1, outline: false, dotSize: 1, opacity: 90 }),
    P('Croix + cercle', { color: '#c6ff3d', length: 4, gap: 5, thickness: 1, circle: true, circleRadius: 14, circleThickness: 1, outline: false, dotSize: 2 }),
    P('Gros contraste', { color: '#ff4d6a', length: 8, gap: 2, thickness: 4, outlineThickness: 2, centerDot: false }),
    P('Minimal', { length: 3, gap: 1, thickness: 1, centerDot: false }),
  ];

  /* ---------- Géométrie ---------- */

  // hLen/hT : branches horizontales, vLen/vT : branches verticales
  function armRects(out, s, gap, hLen, hT, vLen = hLen, vT = hT) {
    const ah = -Math.floor(hT / 2), bh = ah + hT - 1;
    const av = -Math.floor(vT / 2), bv = av + vT - 1;
    if (s.orient === 'x') {
      // Diagonales : un carré t×t par pas, branches tournées de 45° dans le sens horaire
      const dirs = [[s.armTop, 1, -1, vLen, vT], [s.armRight, 1, 1, hLen, hT], [s.armBottom, -1, 1, vLen, vT], [s.armLeft, -1, -1, hLen, hT]];
      for (const [on, dx, dy, len, t] of dirs) {
        if (!on) continue;
        const a = -Math.floor(t / 2);
        for (let i = gap + 1; i <= gap + len; i++) out.push({ x: a + i * dx, y: a + i * dy, w: t, h: t });
      }
      return;
    }
    // L'écart est mesuré depuis le bloc central formé par l'épaisseur de l'autre axe
    if (s.armTop) out.push({ x: av, y: ah - gap - vLen, w: vT, h: vLen });
    if (s.armBottom) out.push({ x: av, y: bh + gap + 1, w: vT, h: vLen });
    if (s.armLeft) out.push({ x: av - gap - hLen, y: ah, w: hLen, h: hT });
    if (s.armRight) out.push({ x: bv + gap + 1, y: ah, w: hLen, h: hT });
  }
  const vert = (s) => (s.split ? [s.vLength, s.vThickness] : [s.length, s.thickness]);

  function groups(s) {
    const g = { lines: [], outer: [], dot: [] };
    if (s.lines) armRects(g.lines, s, s.gap, s.length, s.thickness, ...vert(s));
    if (s.outer) armRects(g.outer, s, s.outerGap, s.outerLength, s.outerThickness);
    if (s.centerDot) {
      const d = s.dotSize, h = Math.floor(d / 2);
      g.dot.push({ x: -h, y: -h, w: d, h: d });
    }
    return g;
  }

  // Distance max du centre, utile pour dimensionner un canvas
  function extent(s) {
    let r = 1;
    if (s.lines) {
      const [vl, vt] = vert(s);
      r = Math.max(r, s.gap + Math.max(s.length, vl) + Math.max(s.thickness, vt));
    }
    if (s.outer) r = Math.max(r, s.outerGap + s.outerLength + s.outerThickness);
    if (s.circle) r = Math.max(r, s.circleRadius + s.circleThickness);
    if (s.centerDot) r = Math.max(r, s.dotSize);
    return r + (s.outline ? s.outlineThickness : 0) + (s.glow ? s.glowStrength * 3 : 0) + 2;
  }

  /* ---------- Dessin ---------- */

  // Anneau rasterisé pixel par pixel (pas d'anticrénelage)
  function ring(ctx, cx, cy, r, t) {
    const inner = r - t / 2, outer = r + t / 2, R = Math.ceil(outer) + 1;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y);
      if (d >= inner && d < outer) ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }

  let scratch;
  function scratchCtx(W, H) {
    scratch = scratch || document.createElement('canvas');
    scratch.width = W; scratch.height = H;
    return scratch.getContext('2d');
  }

  // layer : 'all' | 'outline' | 'lines'
  function draw(ctx, raw, layer = 'all', lineColor) {
    const s = normalize(raw);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    ctx.clearRect(0, 0, W, H);
    const g = groups(s);
    const all = [...g.lines, ...g.outer, ...g.dot];
    const fillShapes = (x) => {
      for (const r of all) x.fillRect(cx + r.x, cy + r.y, r.w, r.h);
      if (s.circle) ring(x, cx, cy, s.circleRadius, s.circleThickness);
    };

    // Contour : dessiné à part puis évidé là où passent les traits, pour qu'une
    // opacité partielle ne s'empile pas et ne se voie pas à travers les traits.
    if (s.outline && layer !== 'lines') {
      const o = s.outlineThickness, x = scratchCtx(W, H);
      x.fillStyle = '#000';
      for (const r of all) x.fillRect(cx + r.x - o, cy + r.y - o, r.w + 2 * o, r.h + 2 * o);
      if (s.circle) ring(x, cx, cy, s.circleRadius, s.circleThickness + 2 * o);
      x.globalCompositeOperation = 'destination-out';
      fillShapes(x);
      x.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = s.outlineAlpha / 100;
      ctx.drawImage(x.canvas, 0, 0);
      ctx.globalAlpha = 1;
    }
    if (layer === 'outline') return;

    const col = lineColor || s.color;
    ctx.fillStyle = col;
    if (s.glow && layer === 'all') {
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = s.glowStrength * 3;
      ctx.globalAlpha = .7;
      fillShapes(ctx);
      ctx.restore();
      ctx.fillStyle = col;
    }
    const pass = (rects, alpha) => {
      ctx.globalAlpha = alpha / 100;
      for (const r of rects) ctx.fillRect(cx + r.x, cy + r.y, r.w, r.h);
    };
    pass(g.lines, s.lineAlpha);
    pass(g.outer, s.outerAlpha);
    pass(g.dot, s.dotAlpha);
    if (s.circle) { ctx.globalAlpha = s.lineAlpha / 100; ring(ctx, cx, cy, s.circleRadius, s.circleThickness); }
    ctx.globalAlpha = 1;
  }

  /* ---------- Import / export de codes ---------- */

  const DICT = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
  const hex2 = (n) => n.toString(16).padStart(2, '0');
  const rgbHex = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const px = (v, min = 0) => Math.max(min, Math.round(v));

  function charsToBytes(chars, len) {
    let n = 0n;
    for (const ch of [...chars].reverse()) {
      const i = DICT.indexOf(ch);
      if (i < 0) return null;
      n = n * 57n + BigInt(i);
    }
    const hex = n.toString(16).padStart(len * 2, '0');
    if (hex.length > len * 2) return null;
    const out = [];
    for (let i = 0; i < len; i++) out.push(parseInt(hex.slice(i * 2, i * 2 + 2), 16));
    return out;
  }
  const checksumOk = (b) => b.slice(1).reduce((a, x) => a + x, 0) % 256 === b[0];
  const i8 = (x) => (x << 24) >> 24;

  // Décodage brut des codes CS2 (formats documentés par akiver/csgo-sharecode)
  function decodeCS2Raw(code) {
    if (/^CS[A-Za-z0-9]{44}$/.test(code) && !code.startsWith('CSGO')) {
      const b = charsToBytes(code.slice(2), 32);
      if (!b || !checksumOk(b) || b[1] !== 1) return null;
      return {
        pixel: true, style: Math.min(b[4] & 0x1f, 9), dot: (b[4] & 0x40) > 0, tStyle: (b[4] & 0x80) > 0,
        outline: (b[13] >>> 6) > 0, r: b[5], g: b[6], bl: b[7], a: b[8],
        gap: ((b[14] | (b[15] << 8)) << 16) >> 16, length: b[16], thickness: Math.min(b[13] & 0x3f, 32),
        screenHeight: Math.max(b[2] | (b[3] << 8), 240),
      };
    }
    if (!/^CSGO(-?[A-Za-z0-9]{5}){5}$/.test(code)) return null;
    const b = charsToBytes(code.replace(/CSGO|-/g, ''), 18);
    if (!b || !checksumOk(b)) return null;
    if (b[1] === 1) {
      return {
        pixel: false, style: (b[13] & 0xf) >> 1, dot: ((b[13] >> 4) & 1) === 1, tStyle: ((b[13] >> 4) & 8) === 8,
        outline: (b[10] & 8) === 8, outlineThickness: b[3] / 2, colorIndex: b[10] & 7,
        r: b[4], g: b[5], bl: b[6], a: ((b[13] >> 4) & 4) === 4 ? b[7] : 255,
        gap: i8(b[2]) / 10, length: b[14] / 10, thickness: b[12] / 10,
      };
    }
    if (b[1] === 3 || b[1] === 4) {
      const bits = b[10] | (b[11] << 8) | (b[12] << 16) | (b[13] << 24);
      return {
        pixel: true, style: b[2] & 0xf, dot: (b[2] & 0x40) > 0, tStyle: (b[2] & 0x80) > 0,
        outline: b[1] === 3 ? (b[2] & 0x20) > 0 : ((b[13] >> 4) & 3) > 0,
        r: b[3], g: b[4], bl: b[5], a: b[6], gap: b[7], length: b[8], thickness: (bits >> 23) & 0x1f,
        screenHeight: Math.max(b[14] | (b[15] << 8), 240),
      };
    }
    return null;
  }

  const CS_COLORS = ['#fa3232', '#32fa32', '#fafa32', '#3232fa', '#32fafa'];

  // screenH : hauteur de l'écran cible, les tailles sont converties en pixels réels
  function fromCS2(raw, screenH) {
    const c = { ...DEFAULT, orient: 'plus', outer: false, circle: false, glow: false, outlineAlpha: 100, lineAlpha: 100, dotAlpha: 100 };
    let len, gap, t;
    if (raw.pixel) {
      const f = screenH / raw.screenHeight;
      len = px(raw.length * f); gap = px(raw.gap * f); t = px(raw.thickness * f, 1);
      c.color = rgbHex(raw.r, raw.g, raw.bl);
      c.outlineThickness = 1;
    } else {
      // Ancien format CS:GO : unités du jeu, environ 2 px par unité en 1080p
      const f = screenH / 1080;
      len = px(raw.length * 2 * f); t = px(raw.thickness * 2 * f, 1); gap = px((raw.gap + 4) * f);
      c.color = raw.colorIndex === 5 ? rgbHex(raw.r, raw.g, raw.bl) : CS_COLORS[raw.colorIndex] || '#32fa32';
      c.outlineThickness = clamp(Math.round(raw.outlineThickness), 1, 3);
    }
    c.length = clamp(len, 1, 30); c.gap = clamp(gap, 0, 20); c.thickness = clamp(t, 1, 8);
    c.armTop = !raw.tStyle;
    c.outline = raw.outline;
    c.centerDot = raw.dot;
    c.dotSize = c.thickness;
    c.opacity = clamp(Math.round(raw.a / 255 * 100), 10, 100);
    c.lines = raw.style !== 6;
    if (raw.pixel && (raw.style === 1 || raw.style === 3)) {
      c.lines = false; c.circle = true; c.circleRadius = clamp(c.gap + c.length, 3, 40); c.circleThickness = clamp(c.thickness, 1, 4);
    }
    if (!c.lines && !c.circle) c.centerDot = true;
    return c;
  }

  const VAL_COLORS = ['#ffffff', '#00ff00', '#7fff00', '#dfff00', '#ffff00', '#00ffff', '#ff00ff', '#ff0000'];

  function fromValorant(code, screenH) {
    const t = code.split(';').map((x) => x.trim());
    if (t[0] !== '0') return null;
    const kv = {};
    const pi = t.indexOf('P');
    if (pi >= 0) for (let i = pi + 1; i + 1 < t.length; i += 2) {
      if (t[i] === 'A' || t[i] === 'S') break;
      kv[t[i]] = t[i + 1];
    }
    const num = (k, d) => (k in kv && !isNaN(+kv[k]) ? +kv[k] : d);
    const f = screenH / 1080;
    const color = kv.c === '8' && /^[0-9a-f]{6}/i.test(kv.u || '') ? '#' + kv.u.slice(0, 6).toLowerCase() : VAL_COLORS[num('c', 0)] || '#ffffff';
    return {
      ...DEFAULT, color, opacity: 100, orient: 'plus', glow: false, circle: false,
      outline: num('h', 1) !== 0, outlineThickness: clamp(Math.round(num('t', 1)), 1, 3), outlineAlpha: clamp(Math.round(num('o', .5) * 100), 10, 100),
      centerDot: num('d', 0) === 1, dotSize: clamp(px(num('z', 2) * f, 1), 1, 8), dotAlpha: clamp(Math.round(num('a', 1) * 100), 10, 100),
      lines: num('0b', 1) !== 0, thickness: clamp(px(num('0t', 2) * f, 1), 1, 8), length: clamp(px(num('0l', 6) * f, 1), 1, 30),
      split: num('0g', 0) === 1, vLength: clamp(px(num('0v', num('0l', 6)) * f, 1), 1, 30), vThickness: clamp(px(num('0t', 2) * f, 1), 1, 8),
      gap: clamp(px(num('0o', 3) * f), 0, 20), lineAlpha: clamp(Math.round(num('0a', .8) * 100), 10, 100),
      outer: num('1b', 1) !== 0, outerThickness: clamp(px(num('1t', 2) * f, 1), 1, 8), outerLength: clamp(px(num('1l', 2) * f, 1), 1, 20),
      outerGap: clamp(px(num('1o', 10) * f), 0, 30), outerAlpha: clamp(Math.round(num('1a', .35) * 100), 10, 100),
    };
  }

  // Code Reticle : seules les valeurs différentes du défaut, en base64url
  function exportCode(c) {
    const n = normalize(c), diff = {};
    for (const k of Object.keys(DEFAULT)) if (n[k] !== DEFAULT[k]) diff[k] = n[k];
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(diff))));
    return 'RTCL-' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromReticle(code) {
    try {
      const b64 = code.slice(5).replace(/-/g, '+').replace(/_/g, '/');
      const obj = JSON.parse(decodeURIComponent(escape(atob(b64))));
      if (!obj || typeof obj !== 'object') return null;
      const clean = {};
      for (const k of Object.keys(DEFAULT)) if (k in obj && typeof obj[k] === typeof DEFAULT[k]) clean[k] = obj[k];
      return normalize(clean);
    } catch { return null; }
  }

  // Renvoie { type, c } ou null si le code n'est pas reconnu
  function importCode(input, screenH = 1080) {
    const code = String(input || '').trim().replace(/\s+/g, '');
    if (!code) return null;
    if (code.startsWith('RTCL-')) { const c = fromReticle(code); return c && { type: 'Reticle', c }; }
    if (/^CS/.test(code)) { const raw = decodeCS2Raw(code); return raw && { type: 'CS2', c: fromCS2(raw, screenH) }; }
    if (/^0(;|$)/.test(code)) { const c = fromValorant(code, screenH); return c && { type: 'Valorant', c }; }
    return null;
  }

  root.Crosshair = { DEFAULT, PRESETS, normalize, draw, extent, importCode, exportCode, _decodeCS2Raw: decodeCS2Raw };
})(typeof window !== 'undefined' ? window : globalThis);
