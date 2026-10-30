/**
 * Family Survivors — Art Demo v0.00017
 * Mobile fix: CSS 16:9; hard portrait gate; fullscreen button
 * P1 left stick/WASD = 女兒 · P2 right stick/Arrows = 爸爸
 */
(function () {
  'use strict';

  const VERSION = 'v0.00017';
  const W = 1920;
  const H = 1080;
  const TILE = 40;
  const WORLD_W = 96;
  const WORLD_H = 64;
  // TODO(later): trees should also block bullets when combat exists

  const canvas = document.getElementById('game');
  if (!canvas) return;
  // Prefer opaque buffer; fall back if options unsupported (older WebViews)
  var ctx = null;
  try { ctx = canvas.getContext('2d', { alpha: false }); } catch (e1) { ctx = null; }
  if (!ctx) ctx = canvas.getContext('2d');
  if (!ctx) {
    var fail = document.getElementById('openHelp');
    if (fail) {
      fail.style.display = 'block';
      fail.innerHTML = '<h1 style="color:#ff6">Canvas 開唔到</h1><p>呢個瀏覽器／預覽器唔支援 canvas。請改用 Chrome 或 Safari 開啟呢個 HTML 檔。</p>';
    } else {
      document.body.innerHTML = '<p style="color:#fff;padding:20px;font-size:20px">Canvas 2D unavailable — 請用 Chrome/Safari 開</p>';
    }
    return;
  }
  // Mark JS alive ASAP (hides the "open in browser" gate)
  var gate = document.getElementById('openHelp');
  if (gate) gate.style.display = 'none';
  var stage = document.getElementById('stage');
  if (stage) stage.style.display = 'flex';
  canvas.style.display = 'block';
  var badge = document.getElementById('verBadge');
  if (badge) badge.style.display = 'block';
  var hintEl = document.getElementById('hint');
  if (hintEl) hintEl.style.display = 'block';
  ctx.imageSmoothingEnabled = false;

  // Immediate paint so phone never shows empty CSS-green with no JS feedback
  function bootPaint(msg) {
    try {
      ctx.fillStyle = '#3d7a2e';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff8e0';
      ctx.font = '28px sans-serif';
      ctx.fillText(msg || ('Art Demo ' + VERSION + ' loading…'), 40, 80);
    } catch (_) {}
  }
  bootPaint();

  // —— Layout: CSS owns display size (dvw/dvh 16:9). JS only keeps bitmap 1920×1080. ——
  function layoutCanvas() {
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    // Do NOT set style.width/height from JS — CSS min(dvw, …) updates on rotate.
    // Fallback only if computed size is 0 (very broken WebViews).
    try {
      var cs = window.getComputedStyle(canvas);
      var cw = parseFloat(cs.width) || 0;
      var ch = parseFloat(cs.height) || 0;
      if (cw < 2 || ch < 2) {
        var iw = window.innerWidth || 320;
        var ih = window.innerHeight || 180;
        var scale = Math.min(iw / W, ih / H);
        canvas.style.width = Math.max(1, Math.floor(W * scale)) + 'px';
        canvas.style.height = Math.max(1, Math.floor(H * scale)) + 'px';
      } else {
        // Clear any leftover inline sizes from older builds / caches
        canvas.style.width = '';
        canvas.style.height = '';
      }
    } catch (_) {
      canvas.style.width = '';
      canvas.style.height = '';
    }
    ctx.imageSmoothingEnabled = false;
  }

  // Soft tip: matchMedia orientation (more reliable than innerWidth after rotate)
  var portraitMq = null;
  try {
    portraitMq = window.matchMedia('(orientation: portrait)');
  } catch (_) {
    portraitMq = null;
  }

  var rotateModal = document.getElementById('rotateModal');

  function isTouchDevice() {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  }

  function isPortrait() {
    if (portraitMq && typeof portraitMq.matches === 'boolean') {
      return portraitMq.matches;
    }
    return (window.innerHeight || 0) > (window.innerWidth || 0);
  }

  function updateSoftTip() {
    var tip = document.getElementById('softTip');
    var touch = isTouchDevice();
    var portrait = isPortrait();
    // Hard gate: touch + portrait → full overlay, no dismiss; landscape hides it
    var showModal = !!(rotateModal && touch && portrait);
    if (rotateModal) {
      rotateModal.style.display = showModal ? 'flex' : 'none';
    }
    // soft tip unused under hard gate (modal covers message)
    if (tip) tip.style.display = 'none';
  }

  function layoutAndTip() {
    layoutCanvas();
    updateSoftTip();
  }

  if (rotateModal) {
    rotateModal.addEventListener('touchstart', function (e) {
      // block sticks through overlay while gated
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
    rotateModal.addEventListener('touchmove', function (e) {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
  }

  layoutAndTip();

  window.addEventListener('resize', layoutAndTip);
  window.addEventListener('orientationchange', layoutAndTip);
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', layoutAndTip);
  }
  if (portraitMq) {
    try {
      if (typeof portraitMq.addEventListener === 'function') {
        portraitMq.addEventListener('change', layoutAndTip);
      } else if (typeof portraitMq.addListener === 'function') {
        portraitMq.addListener(layoutAndTip);
      }
    } catch (_) {}
  }

  // —— Fullscreen button ——
  var fsBtn = document.getElementById('fsBtn');
  var fsFailTip = document.getElementById('fsFailTip');
  var fsFailTimer = null;
  if (fsBtn) fsBtn.style.display = 'block';

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function syncFsBtnLabel() {
    if (!fsBtn) return;
    fsBtn.textContent = isFullscreen() ? '退出' : '全螢幕';
  }

  function showFsFailTip() {
    if (!fsFailTip) return;
    fsFailTip.style.display = 'block';
    if (fsFailTimer) clearTimeout(fsFailTimer);
    fsFailTimer = setTimeout(function () {
      fsFailTip.style.display = 'none';
      fsFailTimer = null;
    }, 3500);
  }

  function tryLockLandscape() {
    try {
      var o = screen.orientation || screen.mozOrientation || screen.msOrientation;
      if (o && typeof o.lock === 'function') {
        var p = o.lock('landscape');
        if (p && typeof p.catch === 'function') {
          p.catch(function () {
            try { o.lock('landscape-primary'); } catch (_) {}
          });
        }
      }
    } catch (_) {
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape-primary').catch(function () {});
        }
      } catch (_2) {}
    }
  }

  function requestFsOn(el) {
    if (!el) return Promise.reject(new Error('no el'));
    if (typeof el.requestFullscreen === 'function') return el.requestFullscreen();
    if (typeof el.webkitRequestFullscreen === 'function') return el.webkitRequestFullscreen();
    if (typeof el.webkitRequestFullScreen === 'function') return el.webkitRequestFullScreen();
    return Promise.reject(new Error('no fullscreen API'));
  }

  function exitFs() {
    if (typeof document.exitFullscreen === 'function') return document.exitFullscreen();
    if (typeof document.webkitExitFullscreen === 'function') return document.webkitExitFullscreen();
    if (typeof document.webkitCancelFullScreen === 'function') return document.webkitCancelFullScreen();
    return Promise.reject(new Error('no exit'));
  }

  function onFsChange() {
    syncFsBtnLabel();
    // Clear inline sizes so CSS contain (dvw/dvh) applies after fullscreen
    try {
      canvas.style.width = '';
      canvas.style.height = '';
    } catch (_) {}
    layoutAndTip();
    // Delayed refresh — iOS/Android often update viewport after transition
    setTimeout(layoutAndTip, 80);
    setTimeout(layoutAndTip, 250);
    setTimeout(layoutAndTip, 500);
  }

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  function toggleFullscreen(ev) {
    if (ev) {
      try { ev.preventDefault(); } catch (_) {}
      try { ev.stopPropagation(); } catch (_) {}
    }
    if (isFullscreen()) {
      exitFs().catch(function () {});
      return;
    }
    // Prefer documentElement so overlay UI (全螢幕 button) stays visible;
    // fall back to #stage for odd WebViews.
    var targets = [document.documentElement];
    if (stage) targets.push(stage);
    function tryNext(i) {
      if (i >= targets.length) {
        showFsFailTip();
        return;
      }
      var p;
      try {
        p = requestFsOn(targets[i]);
      } catch (err) {
        tryNext(i + 1);
        return;
      }
      if (!p || typeof p.then !== 'function') {
        setTimeout(function () {
          if (isFullscreen()) {
            tryLockLandscape();
            onFsChange();
          } else {
            tryNext(i + 1);
          }
        }, 100);
        return;
      }
      p.then(function () {
        tryLockLandscape();
        onFsChange();
      }).catch(function () {
        tryNext(i + 1);
      });
    }
    tryNext(0);
  }

  if (fsBtn) {
    fsBtn.addEventListener('click', toggleFullscreen);
    fsBtn.addEventListener('touchend', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen(e);
    }, { passive: false });
    fsBtn.addEventListener('touchstart', function (e) {
      e.stopPropagation();
    }, { passive: true });
  }
  syncFsBtnLabel();


  function clientToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    return {
      x: ((clientX - rect.left) / rw) * W,
      y: ((clientY - rect.top) / rh) * H,
    };
  }

  // —— World ——
  const GRASS_A = ['#4a9038', '#458834', '#3f8030', '#529a3e'];
  const GRASS_B = ['#3d7a2e', '#386e2a', '#427f32', '#356628'];
  const DETAIL = [];
  function hash(x, y) {
    let n = x * 374761393 + y * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return (n ^ (n >> 16)) >>> 0;
  }
  for (let ty = 0; ty < WORLD_H; ty++) {
    for (let tx = 0; tx < WORLD_W; tx++) {
      const h = hash(tx, ty);
      if (h % 19 === 0) DETAIL.push({ x: tx, y: ty, kind: 'flower', c: h % 2 ? '#ff8ab8' : '#ffe066' });
      else if (h % 29 === 0) DETAIL.push({ x: tx, y: ty, kind: 'pebble', c: '#6a7a50' });
      else if (h % 37 === 0) DETAIL.push({ x: tx, y: ty, kind: 'tuft', c: '#2e6a24' });
    }
  }

  const TREES = [];
  const spawnX = (WORLD_W * TILE) / 2;
  const spawnY = (WORLD_H * TILE) / 2;
  for (let i = 0; i < 70; i++) {
    const h = hash(i * 11 + 3, i * 17 + 5);
    const x = ((h % (WORLD_W - 6)) + 3) * TILE + TILE / 2;
    const y = (((h >> 9) % (WORLD_H - 6)) + 3) * TILE + TILE / 2;
    if (Math.hypot(x - spawnX, y - spawnY) < 160) continue;
    TREES.push({ x, y, s: 0.9 + (h % 5) * 0.08, r: 16 });
  }

  function drawGrass(g, camX, camY) {
    const x0 = Math.floor(camX / TILE) - 1, y0 = Math.floor(camY / TILE) - 1;
    const x1 = Math.ceil((camX + W) / TILE) + 1, y1 = Math.ceil((camY + H) / TILE) + 1;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) {
          g.fillStyle = '#2a4a20';
          g.fillRect(tx * TILE - camX, ty * TILE - camY, TILE, TILE);
          continue;
        }
        const h = hash(tx, ty);
        g.fillStyle = ((tx + ty) & 1 ? GRASS_A : GRASS_B)[h % 4];
        g.fillRect(tx * TILE - camX, ty * TILE - camY, TILE, TILE);
      }
    }
    for (const d of DETAIL) {
      const sx = d.x * TILE - camX + 14, sy = d.y * TILE - camY + 14;
      if (sx < -16 || sy < -16 || sx > W + 16 || sy > H + 16) continue;
      if (d.kind === 'flower') {
        g.fillStyle = d.c; g.fillRect(sx, sy, 5, 5);
        g.fillStyle = '#fff8c0'; g.fillRect(sx + 1, sy + 1, 2, 2);
      } else if (d.kind === 'pebble') {
        g.fillStyle = d.c; g.fillRect(sx, sy + 2, 7, 3);
      } else {
        g.fillStyle = d.c; g.fillRect(sx, sy, 2, 7); g.fillRect(sx + 4, sy + 2, 2, 5);
      }
    }
  }

  function oval(g, x, y, rx, ry) {
    g.beginPath();
    if (g.ellipse) g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    else { g.save(); g.translate(x, y); g.scale(rx, ry); g.arc(0, 0, 1, 0, Math.PI * 2); g.restore(); }
  }

  function drawTree(g, t, camX, camY) {
    const sx = t.x - camX, sy = t.y - camY;
    if (sx < -90 || sy < -120 || sx > W + 90 || sy > H + 90) return;
    const s = t.s;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    oval(g, sx, sy + 3, 20 * s, 9 * s); g.fill();
    g.fillStyle = '#5a3a18'; g.fillRect(sx - 5 * s, sy - 26 * s, 10 * s, 26 * s);
    g.fillStyle = '#3a2410'; g.fillRect(sx - 5 * s, sy - 26 * s, 3 * s, 26 * s);
    for (const L of [{ y: -46, r: 26, c: '#2e6e28' }, { y: -56, r: 22, c: '#3a8a32' }, { y: -64, r: 16, c: '#4aa03c' }]) {
      g.fillStyle = L.c; g.beginPath(); g.arc(sx, sy + L.y * s, L.r * s, 0, Math.PI * 2); g.fill();
    }
  }

  function collidesTree(x, y, radius) {
    for (const t of TREES) {
      const rr = t.r + radius;
      const ddx = x - t.x, ddy = y - t.y;
      if (ddx * ddx + ddy * ddy < rr * rr) return true;
    }
    return false;
  }

  const worldBounds = { w: WORLD_W * TILE, h: WORLD_H * TILE };

  let p1, p2;
  try {
    if (!window.ArtChars || !ArtChars.createDaughter || !ArtChars.createDad) {
      throw new Error('character modules missing');
    }
    p1 = ArtChars.createDaughter({ x: spawnX - 40, y: spawnY });
    p2 = ArtChars.createDad({ x: spawnX + 40, y: spawnY });
  } catch (err) {
    bootPaint('Init error: ' + (err && err.message ? err.message : err));
    console.error(err);
    return;
  }

  // —— Keyboard ——
  const keys = Object.create(null);
  window.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space') {
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  function axisFromKeys(map) {
    let dx = 0, dy = 0;
    if (keys[map.l]) dx -= 1;
    if (keys[map.r]) dx += 1;
    if (keys[map.u]) dy -= 1;
    if (keys[map.d]) dy += 1;
    if (dx && dy) { const inv = 1 / Math.SQRT2; dx *= inv; dy *= inv; }
    return { dx: dx, dy: dy };
  }

  // —— Virtual sticks (bigger on phone) ——
  function stickMetrics() {
    // ~18% of short canvas side in logical px
    const base = Math.min(W, H);
    return {
      radius: Math.max(110, Math.floor(base * 0.14)),
      knobMax: Math.max(78, Math.floor(base * 0.10)),
      knobR: Math.max(44, Math.floor(base * 0.055)),
    };
  }

  const sticks = {
    p1: { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, active: false },
    p2: { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, active: false },
  };

  function whichStick(canvasX) {
    return canvasX < W / 2 ? sticks.p1 : sticks.p2;
  }

  function defaultBase(stick) {
    const m = stickMetrics();
    return {
      x: stick === sticks.p1 ? W * 0.20 : W * 0.80,
      y: H * 0.78,
      m: m,
    };
  }

  function setStickFromTouch(stick, cx, cy, origin) {
    const m = stickMetrics();
    if (origin) { stick.ox = cx; stick.oy = cy; }
    stick.x = cx; stick.y = cy;
    let dx = (stick.x - stick.ox) / m.knobMax;
    let dy = (stick.y - stick.oy) / m.knobMax;
    const len = Math.hypot(dx, dy) || 1;
    if (len > 1) { dx /= len; dy /= len; }
    stick.dx = dx; stick.dy = dy;
    stick.active = true;
  }

  function clearStick(stick) {
    stick.id = null; stick.active = false; stick.dx = 0; stick.dy = 0;
  }

  function onPointerDown(clientX, clientY, pointerId) {
    const p = clientToCanvas(clientX, clientY);
    const stick = whichStick(p.x);
    if (stick.id != null && stick.id !== pointerId) return;
    stick.id = pointerId;
    const def = defaultBase(stick);
    // Always anchor to comfortable default base; drag from finger
    stick.ox = def.x; stick.oy = def.y;
    setStickFromTouch(stick, p.x, p.y, false);
  }

  function onPointerMove(clientX, clientY, pointerId) {
    const p = clientToCanvas(clientX, clientY);
    if (sticks.p1.id === pointerId) setStickFromTouch(sticks.p1, p.x, p.y, false);
    if (sticks.p2.id === pointerId) setStickFromTouch(sticks.p2, p.x, p.y, false);
  }

  function onPointerUp(pointerId) {
    if (sticks.p1.id === pointerId) clearStick(sticks.p1);
    if (sticks.p2.id === pointerId) clearStick(sticks.p2);
  }

  function bindTouchTarget(el) {
    el.addEventListener('touchstart', function (e) {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        onPointerDown(t.clientX, t.clientY, t.identifier);
      }
    }, { passive: false });
    el.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        onPointerMove(t.clientX, t.clientY, t.identifier);
      }
    }, { passive: false });
    el.addEventListener('touchend', function (e) {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) onPointerUp(e.changedTouches[i].identifier);
    }, { passive: false });
    el.addEventListener('touchcancel', function (e) {
      for (let i = 0; i < e.changedTouches.length; i++) onPointerUp(e.changedTouches[i].identifier);
    }, { passive: false });
  }

  canvas.style.touchAction = 'none';
  document.body.style.touchAction = 'none';
  bindTouchTarget(canvas);
  bindTouchTarget(document.body);

  // Mouse for desktop stick testing
  let mouseStick = null;
  canvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    mouseStick = whichStick(clientToCanvas(e.clientX, e.clientY));
    onPointerDown(e.clientX, e.clientY, 'mouse');
  });
  window.addEventListener('mousemove', function (e) {
    if (mouseStick) onPointerMove(e.clientX, e.clientY, 'mouse');
  });
  window.addEventListener('mouseup', function () {
    if (mouseStick) { onPointerUp('mouse'); mouseStick = null; }
  });

  function mergeInput(keyAxis, stick) {
    if (stick.active) return { dx: stick.dx, dy: stick.dy };
    return keyAxis;
  }

  function drawStick(g, stick, label, color) {
    const def = defaultBase(stick);
    const m = def.m;
    const baseX = stick.active ? stick.ox : def.x;
    const baseY = stick.active ? stick.oy : def.y;
    g.beginPath();
    g.arc(baseX, baseY, m.radius, 0, Math.PI * 2);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.stroke();
    const kx = stick.active ? stick.ox + stick.dx * m.knobMax : baseX;
    const ky = stick.active ? stick.oy + stick.dy * m.knobMax : baseY;
    g.beginPath();
    g.arc(kx, ky, m.knobR, 0, Math.PI * 2);
    g.fillStyle = stick.active ? color : 'rgba(255,255,255,0.28)';
    g.fill();
    g.fillStyle = 'rgba(255,255,240,0.9)';
    g.font = '600 26px sans-serif';
    g.textAlign = 'center';
    g.fillText(label, baseX, baseY - m.radius - 16);
    g.textAlign = 'left';
  }

  let camX = spawnX - W / 2, camY = spawnY - H / 2;
  function clampCam() {
    camX = Math.max(0, Math.min(WORLD_W * TILE - W, camX));
    camY = Math.max(0, Math.min(WORLD_H * TILE - H, camY));
  }

  let last = performance.now();
  let frames = 0;
  function frame(now) {
    try {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const in1 = mergeInput(
        axisFromKeys({ l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' }),
        sticks.p1
      );
      const in2 = mergeInput(
        axisFromKeys({ l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }),
        sticks.p2
      );

      p1.update(dt, in1, collidesTree, worldBounds);
      p2.update(dt, in2, collidesTree, worldBounds);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      camX += (midX - W / 2 - camX) * Math.min(1, 7 * dt);
      camY += (midY - H / 2 - 24 - camY) * Math.min(1, 7 * dt);
      clampCam();

      ctx.imageSmoothingEnabled = false;
      // opaque clear (alpha:false) — never leave CSS-green "empty" look
      ctx.fillStyle = '#2a4a20';
      ctx.fillRect(0, 0, W, H);
      drawGrass(ctx, camX, camY);

      const drawables = TREES.map(function (t) { return { type: 'tree', y: t.y, t: t }; });
      drawables.push({ type: 'char', y: p1.y, c: p1 });
      drawables.push({ type: 'char', y: p2.y, c: p2 });
      drawables.sort(function (a, b) { return a.y - b.y; });
      for (let i = 0; i < drawables.length; i++) {
        const d = drawables[i];
        if (d.type === 'tree') drawTree(ctx, d.t, camX, camY);
        else d.c.draw(ctx, camX, camY);
      }

      drawStick(ctx, sticks.p1, 'P1 女兒', 'rgba(100,220,160,0.9)');
      drawStick(ctx, sticks.p2, 'P2 爸爸', 'rgba(100,160,255,0.9)');

      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(16, 16, 460, 52);
      ctx.strokeStyle = 'rgba(255,255,220,0.25)';
      ctx.strokeRect(16.5, 16.5, 459, 51);
      ctx.fillStyle = '#fff8e0';
      ctx.font = '600 20px sans-serif';
      ctx.fillText('Art Demo  ' + VERSION, 28, 48);
      ctx.fillStyle = 'rgba(255,255,240,0.8)';
      ctx.font = '16px sans-serif';
      ctx.fillText('左搖桿/WASD=女兒 · 右搖桿/方向鍵=爸爸', 28, 88);

      frames++;
    } catch (err) {
      console.error(err);
      bootPaint('Runtime error: ' + (err && err.message ? err.message : err));
      return; // stop loop to show error
    }
    requestAnimationFrame(frame);
  }

  clampCam();
  window.__ART_DEMO_RUNNING__ = true;
  var hint = document.getElementById('hint');
  if (hint) hint.style.display = 'block';
  requestAnimationFrame(frame);
})();
