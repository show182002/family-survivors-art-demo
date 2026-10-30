/**
 * Shared pixel sprite helpers (file:// safe, no ES modules)
 */
(function (global) {
  'use strict';
  const cache = new Map();

  function assertFrames(FRAMES) {
    for (const dir of Object.keys(FRAMES)) {
      for (const anim of Object.keys(FRAMES[dir])) {
        const rows = FRAMES[dir][anim];
        const w = rows[0].length;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].length !== w) {
            console.warn('[art-demo] bad frame width', dir, anim, i, rows[i].length, w);
            const pad = w - rows[i].length;
            const L = Math.floor(pad / 2);
            rows[i] = '.'.repeat(Math.max(0, L)) + rows[i] + '.'.repeat(Math.max(0, pad - L));
            if (rows[i].length > w) rows[i] = rows[i].slice(0, w);
          }
        }
      }
    }
  }

  function rowsToCanvas(rows, scale, PAL) {
    const key = rows.join('|') + '@' + scale + '@' + (PAL._id || '');
    if (cache.has(key)) return cache.get(key);
    const w = rows[0].length, h = rows.length;
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (!ch || ch === '.') continue;
        g.fillStyle = PAL[ch] || '#ff00ff';
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    cache.set(key, c);
    return c;
  }

  function drawSprite(g, rows, x, y, scale, flipX, PAL) {
    const img = rowsToCanvas(rows, scale, PAL);
    g.save();
    if (flipX) {
      g.translate(x, y - img.height);
      g.scale(-1, 1);
      g.drawImage(img, -img.width / 2, 0);
    } else {
      g.drawImage(img, x - img.width / 2, y - img.height);
    }
    g.restore();
  }

  function pickFacing(dx, dy, state) {
    if (!dx && !dy) return;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < 0.4 * ay) {
      state.dir = dy < 0 ? 'up' : 'down';
      state.flipX = false;
    } else if (ay < 0.4 * ax) {
      state.dir = 'side';
      state.flipX = dx < 0;
    } else if (dy < 0) {
      state.dir = 'dur';
      state.flipX = dx < 0;
    } else {
      state.dir = 'ddr';
      state.flipX = dx < 0;
    }
  }

  function createWalker(opts) {
    const {
      name, FRAMES, PAL, scale = 3, speed = 190, radius = 10,
      x = 0, y = 0, tint = null,
    } = opts;
    assertFrames(FRAMES);
    PAL._id = name;
    const dust = [];
    const state = {
      name, x, y, speed, radius,
      dir: 'down', flipX: false, moving: false, walkT: 0, dustCD: 0,
    };

    function spawnDust() {
      dust.push({
        x: state.x + (state.flipX ? 8 : -8),
        y: state.y - 2,
        t: 0, life: 0.35, r: 4 + Math.random() * 3,
      });
    }

    function update(dt, input, collidesFn, world) {
      const dx = input.dx || 0, dy = input.dy || 0;
      state.moving = !!(dx || dy);
      if (state.moving) {
        const dist = state.speed * dt;
        let nx = state.x + dx * dist, ny = state.y + dy * dist;
        if (!collidesFn(nx, ny, state.radius)) { state.x = nx; state.y = ny; }
        else {
          nx = state.x + dx * dist;
          if (!collidesFn(nx, state.y, state.radius)) state.x = nx;
          ny = state.y + dy * dist;
          if (!collidesFn(state.x, ny, state.radius)) state.y = ny;
        }
        state.walkT += dt;
        pickFacing(dx, dy, state);
        state.dustCD -= dt;
        if (state.dustCD <= 0) { spawnDust(); state.dustCD = 0.16; }
      } else {
        state.walkT = 0; state.dustCD = 0;
      }
      if (world) {
        const m = 18;
        state.x = Math.max(m, Math.min(world.w - m, state.x));
        state.y = Math.max(m, Math.min(world.h - m, state.y));
      }
      for (let i = dust.length - 1; i >= 0; i--) {
        dust[i].t += dt;
        if (dust[i].t >= dust[i].life) dust.splice(i, 1);
      }
    }

    function draw(g, camX, camY) {
      const sx = state.x - camX, sy = state.y - camY;
      g.fillStyle = 'rgba(0,0,0,0.32)';
      g.beginPath();
      if (g.ellipse) g.ellipse(sx, sy + 1, 14, 6, 0, 0, Math.PI * 2);
      else { g.save(); g.translate(sx, sy + 1); g.scale(14, 6); g.arc(0, 0, 1, 0, Math.PI * 2); g.restore(); }
      g.fill();

      for (const d of dust) {
        const a = 1 - d.t / d.life;
        const dx = d.x - camX, dy = d.y - camY - d.t * 12;
        const r = d.r * (0.7 + d.t / d.life);
        g.fillStyle = 'rgba(255,255,255,' + (0.55 * a) + ')';
        g.beginPath(); g.arc(dx, dy, r, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(dx + r * 0.8, dy + 1, r * 0.55, 0, Math.PI * 2); g.fill();
      }

      const set = FRAMES[state.dir] || FRAMES.down;
      let rows = set.idle, bob = 0;
      if (state.moving) {
        const step = Math.floor(state.walkT * 10) % 4;
        rows = step === 0 ? set.w1 : step === 1 ? set.w2 : step === 2 ? set.w3 : set.w2;
        bob = (step === 0 || step === 2) ? -2 : 0;
      }
      const flip = state.flipX && (state.dir === 'side' || state.dir === 'ddr' || state.dir === 'dur');
      if (tint) {
        g.save();
        drawSprite(g, rows, sx, sy + bob, scale, flip, PAL);
        g.globalCompositeOperation = 'source-atop';
        // soft tint overlay via second pass on a clip — simpler: draw tinted rect not needed
        g.restore();
        // colorize by drawing with modified PAL if tint provided as palette override
      }
      drawSprite(g, rows, sx, sy + bob, scale, flip, tint || PAL);
    }

    return {
      get x() { return state.x; }, set x(v) { state.x = v; },
      get y() { return state.y; }, set y(v) { state.y = v; },
      get radius() { return state.radius; },
      get name() { return state.name; },
      update, draw,
    };
  }

  global.ArtSprite = { assertFrames, rowsToCanvas, drawSprite, pickFacing, createWalker };
})(window);
