/* ==========================================================================
   Tech & fintech creator management — interactions
   No dependencies. Without JavaScript the page is a complete static document.
   ========================================================================== */
(() => {
  'use strict';

  const SITE = window.SITE || {};
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = () => mqReduce.matches;

  /* ---------- One scroll loop for everything ---------- */
  const scrollFns = [];
  const resizeFns = [];
  let ticking = false;
  const runScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    for (const fn of scrollFns) fn(y, vh);
  };
  const requestScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(runScroll); }
  };
  window.addEventListener('scroll', requestScroll, { passive: true });
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resizeFns.forEach((fn) => fn()); requestScroll(); }, 120);
  });

  /* ---------- Name, contact details and year from site.config.js ---------- */
  function hydrate() {
    const name = (SITE.name || '').trim();
    const legal = (SITE.legalName || name).trim();
    const email = (SITE.email || '').trim();
    const handle = (SITE.xHandle || '').replace(/^@/, '').trim();

    root.classList.toggle('has-name', !!name);
    $$('[data-site="name"]').forEach((el) => { el.textContent = name; });
    $$('[data-site="legal"]').forEach((el) => { el.textContent = legal ? legal + '.' : ''; });
    if (name) document.title = name + ' — ' + document.title;

    if (email) {
      $$('[data-site="email"]').forEach((a) => { a.textContent = email; a.href = 'mailto:' + email; });
      $$('[data-if="email"]').forEach((el) => { el.hidden = false; });
    }
    if (handle) {
      $$('[data-site="x"]').forEach((a) => { a.textContent = '@' + handle; a.href = 'https://x.com/' + encodeURIComponent(handle); a.target = '_blank'; });
      $$('[data-if="x"]').forEach((el) => { el.hidden = false; });
    }
    if (email || handle) $$('[data-if="contact"]').forEach((el) => { el.hidden = false; });
    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  }

  /* ---------- Headlines: wrap each word so it can rise into place ---------- */
  function splitHeadlines() {
    const wrapWords = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            const inner = document.createElement('span');
            outer.className = 'w';
            inner.className = 'wi';
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrapWords(child);
        }
      });
    };
    $$('[data-split]').forEach((el) => {
      wrapWords(el);
      $$('.wi', el).forEach((w, i) => w.style.setProperty('--i', i));
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function reveals() {
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Hero intro: wait for fonts, then release ---------- */
  function intro() {
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, 1400));
    Promise.race([fonts, timeout]).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.classList.add('is-ready');
        document.dispatchEvent(new Event('site:ready'));
      }));
    });
  }

  /* ---------- Navigation: page progress along the ruler, current section ---------- */
  function navigation() {
    const bar = $('[data-progress]');
    const links = $$('[data-spy]');
    const byId = new Map(links.map((a) => [a.dataset.spy, a]));

    scrollFns.push((y, vh) => {
      const max = root.scrollHeight - vh;
      if (bar) bar.style.setProperty('--p', max > 0 ? clamp(y / max).toFixed(4) : '0');
    });

    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const link = byId.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    $$('[data-section], [data-hero]').forEach((section) => io.observe(section));
  }

  /* ---------- Mobile menu ---------- */
  function menu() {
    const panel = $('#menu');
    const button = $('[data-menu-toggle]');
    if (!panel || !button) return;
    panel.hidden = false; // CSS keeps it invisible until opened
    $$('.menu__list a', panel).forEach((a, i) => a.style.setProperty('--i', i));
    const outside = [$('#main'), $('.foot')];
    const isOpen = () => root.classList.contains('menu-open');

    const setOpen = (open, returnFocus) => {
      root.classList.toggle('menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      outside.forEach((el) => { if (el) el.inert = open; });
      if (open) { const first = $('a', panel); if (first) first.focus({ preventScroll: true }); }
      else if (returnFocus) button.focus({ preventScroll: true });
    };

    button.addEventListener('click', () => setOpen(!isOpen(), true));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false, true); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && isOpen()) setOpen(false, false); });
  }

  /* ---------- Position statement: words light up as you read down ---------- */
  function statement() {
    const el = $('[data-words]');
    if (!el || reduced()) return;
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const spans = words.map((word, i) => {
      const span = document.createElement('span');
      span.className = 'mw';
      span.textContent = word;
      span.style.opacity = '0.2';
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return span;
    });
    let last = -1;
    scrollFns.push((y, vh) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.32));
      const lit = p * (spans.length + 5);
      if (Math.abs(lit - last) < 0.03) return;
      last = lit;
      for (let i = 0; i < spans.length; i++) spans[i].style.opacity = (0.2 + 0.8 * clamp(lit - i)).toFixed(3);
    });
  }

  /* ---------- Oversized strip: drifts sideways with scroll ---------- */
  function strip() {
    const el = $('[data-strip]');
    if (!el || reduced()) return;
    const track = $('.strip__track', el);
    scrollFns.push((y, vh) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      const p = clamp((vh - r.top) / (vh + r.height));
      const room = Math.max(0, track.scrollWidth - window.innerWidth);
      const travel = Math.min(room, window.innerWidth * 0.85);
      track.style.setProperty('--x', (-p * travel).toFixed(1) + 'px');
    });
  }

  /* ---------- Hero figure: a field of hyperbolas whose asymptotes draw the X ----------
     Every strand is one curve of the family x² − y² = c. Far from the centre the
     strands close in on the two diagonals, so the X appears on its own. Near the
     centre they open into four arcs around a single node. */
  function xfield() {
    const cv = $('[data-xfield]');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const hero = cv.closest('[data-hero]') || cv.parentElement;
    const content = $('.hero__content', hero);

    const N = 10;    // strands per sector
    const SEG = 60;  // samples per strand
    let w = 0, h = 0, cx = 0, cy = 0, R = 1, A = 1, B = 1, C = 1, lw = 0.7, grad = null;
    let phase = 0.35;
    let reveal = reduced() ? 1 : 0;
    let started = reduced();
    let startedAt = 0;
    let rot = 0, rotT = 0, ox = 0, oy = 0, oxT = 0, oyT = 0, depth = 0;
    let visible = true, raf = 0, last = 0;
    const sparks = [];

    const newSpark = (stagger = 0) => ({
      s: (Math.random() * 4) | 0,                 // sector
      k: 1.2 + Math.random() * (N - 4.2),         // which strand it rides
      p: -stagger * 1.4 - Math.random() * 0.5,    // progress; below zero means waiting
      v: 0.07 + Math.random() * 0.05
    });

    // Point on a strand. s picks the sector, a is the semi-axis, u the parameter.
    const point = (s, a, u) => {
      const ch = Math.cosh(u) * a;
      const sh = Math.sinh(u) * a;
      if (s === 0) return [A * ch, B * sh];
      if (s === 1) return [-A * ch, -B * sh];
      if (s === 2) return [-A * sh, B * ch];
      return [A * sh, -B * ch];
    };

    function layout() {
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Two compositions. "Side": the node sits to the right of the headline (desktop,
      // and short landscape screens). "Top": the node is centred in the free space
      // above the headline (phones and tall tablets).
      const navEl = $('.nav');
      const navH = (navEl && navEl.offsetHeight) || 64;
      const free = content ? content.getBoundingClientRect().top - rect.top - navH : h * 0.3;
      const wide = w >= 900 || (w >= 600 && free < 200);
      hero.classList.toggle('hero--side', wide);
      cx = w * (wide ? (w >= 900 ? 0.7 : 0.8) : 0.5);
      cy = wide ? h * (w >= 900 ? 0.44 : 0.42) : navH + Math.max(22, free * 0.56);
      const theta = (wide ? 47 : 57) * Math.PI / 180;  // arm angle from horizontal
      A = Math.cos(theta) * Math.SQRT2;
      B = Math.sin(theta) * Math.SQRT2;
      R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      const q0 = Math.min(w, h) * (wide ? 0.6 : 0.52);  // where along an arm the spacing is measured
      const gap = wide ? 7 : 5.5;                       // spacing between strands there, in px
      C = 2 * q0 * gap;
      lw = dpr >= 2 ? 0.6 : 0.9;

      grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(236,238,242,.86)');
      grad.addColorStop(0.7, 'rgba(196,200,206,.4)');
      grad.addColorStop(1, 'rgba(170,175,182,0)');

      const want = wide ? 4 : 2;
      sparks.length = 0;
      for (let i = 0; i < want; i++) sparks.push(newSpark(i / want));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const zoom = 1 + depth * 0.5;
      const fade = 1 - smooth(depth * 1.2);
      if (fade <= 0.002) return;
      const grow = easeOut(reveal);

      ctx.save();
      ctx.translate(cx + ox, cy + oy);
      ctx.rotate(rot);
      ctx.scale(zoom, zoom);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lw / zoom;
      ctx.lineCap = 'round';

      // Strands
      for (let s = 0; s < 4; s++) {
        for (let i = 0; i < N; i++) {
          const kappa = i + phase;
          const a = Math.sqrt(C * kappa);
          const lim = R / (a * Math.SQRT2);
          if (lim <= 1) continue;
          const U = Math.acosh(lim) * grow;
          const alpha = smooth(kappa / 1.2) * (1 - smooth((kappa - (N - 3)) / 3));
          if (alpha <= 0.003 || U <= 0) continue;
          ctx.globalAlpha = alpha * fade * 0.92;
          ctx.beginPath();
          for (let j = 0; j <= SEG; j++) {
            const p = point(s, a, -U + (2 * U * j) / SEG);
            if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
          }
          ctx.stroke();
        }
      }

      // The two diagonals themselves, interrupted at the node
      const r0 = 15;
      const r1 = R * grow;
      if (r1 > r0) {
        const ux = A / Math.SQRT2;
        const uy = B / Math.SQRT2;
        ctx.globalAlpha = fade;
        ctx.beginPath();
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => {
          ctx.moveTo(sx * ux * r0, sy * uy * r0);
          ctx.lineTo(sx * ux * r1, sy * uy * r1);
        });
        ctx.stroke();
      }

      // Node
      ctx.globalAlpha = fade * smooth(reveal * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // Signals travelling along strands
      ctx.fillStyle = '#fff';
      for (const sp of sparks) {
        if (sp.p <= 0 || sp.p >= 1) continue;
        const a = Math.sqrt(C * sp.k);
        const lim = R / (a * Math.SQRT2);
        if (lim <= 1) continue;
        const U = Math.acosh(lim);
        const edge = smooth(sp.p / 0.14) * (1 - smooth((sp.p - 0.86) / 0.14));
        for (let t = 0; t < 8; t++) {
          const p = point(sp.s, a, U * (2 * (sp.p - t * 0.006) - 1));
          ctx.globalAlpha = fade * grow * edge * (1 - t / 8) * (t ? 0.5 : 1);
          ctx.beginPath();
          ctx.arc(p[0], p[1], (t ? 1.1 : 1.8) / zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      phase += dt * 0.1;
      if (phase >= 1) phase -= 1;
      // The intro runs on the clock, not on frame count, so a slow device still finishes on time.
      if (started && reveal < 1) reveal = clamp((now - startedAt) / 2600);
      rot = lerp(rot, rotT, 0.04);
      ox = lerp(ox, oxT, 0.04);
      oy = lerp(oy, oyT, 0.04);
      for (const sp of sparks) {
        sp.p += dt * sp.v;
        if (sp.p >= 1) Object.assign(sp, newSpark());
      }
      draw();
      if (visible && !reduced()) raf = requestAnimationFrame(frame);
    }
    const play = () => {
      if (reduced()) { draw(); return; }
      if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
    };

    layout();
    draw();

    if ('ResizeObserver' in window) new ResizeObserver(() => { layout(); draw(); }).observe(cv);
    else resizeFns.push(() => { layout(); draw(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; play(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
    document.addEventListener('site:ready', () => { layout(); started = true; startedAt = performance.now(); play(); });
    window.addEventListener('load', () => { layout(); draw(); });
    mqReduce.addEventListener('change', () => { if (reduced()) { reveal = 1; rotT = oxT = oyT = 0; } play(); });

    scrollFns.push((y) => {
      depth = clamp(y / Math.max(1, h));
      if (reduced()) draw();
    });

    if (mqFine.matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rotT = px * 0.06;
        oxT = -px * 22;
        oyT = -py * 16;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { rotT = 0; oxT = 0; oyT = 0; });
    }
  }

  /* ---------- Disciplines figure: four arms, one node ---------- */
  let setArm = () => {};
  function xdiagram() {
    const fig = $('[data-xdiagram]');
    if (!fig) return;
    const NS = 'http://www.w3.org/2000/svg';
    const make = (name, attrs, parent) => {
      const node = document.createElementNS(NS, name);
      Object.keys(attrs || {}).forEach((key) => node.setAttribute(key, attrs[key]));
      if (parent) parent.appendChild(node);
      return node;
    };

    const S = 600, c = S / 2, r0 = 46, r1 = 282, lines = 7, gap = 9, k = Math.SQRT1_2;
    const svg = make('svg', { viewBox: '0 0 ' + S + ' ' + S, focusable: 'false' });
    const defs = make('defs', {}, svg);
    const arms = [['01', 'Brand', -1, -1], ['02', 'Content', 1, -1], ['03', 'Audience', -1, 1], ['04', 'Commerce', 1, 1]];

    make('circle', { class: 'xd-orbit', cx: c, cy: c, r: 26 }, svg);

    const groups = arms.map(([num, label, sx, sy], i) => {
      const g = make('g', { class: 'xd-arm' }, svg);
      const dx = sx * k, dy = sy * k;      // along the arm
      const nx = -dy, ny = dx;             // across it
      const grad = make('linearGradient', {
        id: 'xd-grad-' + i, gradientUnits: 'userSpaceOnUse',
        x1: c + dx * r0, y1: c + dy * r0, x2: c + dx * r1, y2: c + dy * r1
      }, defs);
      make('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '1' }, grad);
      make('stop', { offset: '.65', 'stop-color': '#d6dade', 'stop-opacity': '.7' }, grad);
      make('stop', { offset: '1', 'stop-color': '#c4c8ce', 'stop-opacity': '0' }, grad);

      for (let j = 0; j < lines; j++) {
        const d = (j - (lines - 1) / 2) * gap;
        make('line', {
          x1: (c + dx * r0 + nx * d).toFixed(2), y1: (c + dy * r0 + ny * d).toFixed(2),
          x2: (c + dx * r1 + nx * d).toFixed(2), y2: (c + dy * r1 + ny * d).toFixed(2),
          stroke: 'url(#xd-grad-' + i + ')'
        }, g);
      }
      [0.2, 0.36, 0.52, 0.68].forEach((t, n) => {
        const r = r0 + (r1 - r0) * t;
        const dot = make('circle', { class: 'xd-node', cx: (c + dx * r).toFixed(2), cy: (c + dy * r).toFixed(2), r: 3 }, g);
        dot.style.setProperty('--n', n);
      });
      const text = make('text', {
        class: 'xd-label',
        x: (c + dx * (r1 + 20)).toFixed(1), y: (c + dy * (r1 + 20) + (sy > 0 ? 12 : 0)).toFixed(1),
        'text-anchor': sx > 0 ? 'end' : 'start'
      }, g);
      text.textContent = num + '  ' + label;
      return g;
    });

    make('circle', { class: 'xd-core', cx: c, cy: c, r: 9 }, svg);
    make('circle', { class: 'xd-dot', cx: c, cy: c, r: 2 }, svg);
    fig.appendChild(svg);

    setArm = (index) => {
      const none = index == null || index < 0;
      svg.classList.toggle('is-neutral', none);
      groups.forEach((g, i) => g.classList.toggle('is-on', !none && i === index));
    };
  }

  /* ---------- Accordions ---------- */
  function accordions() {
    $$('[data-acc]').forEach((acc) => {
      const items = $$('.acc__item', acc);
      const drivesArms = acc.hasAttribute('data-arms-target');
      const openIndex = () => {
        const open = items.find((item) => item.classList.contains('is-open'));
        return open && open.dataset.arm != null ? Number(open.dataset.arm) : -1;
      };
      const toggle = (item, open) => {
        item.classList.toggle('is-open', open);
        $('.acc__btn', item).setAttribute('aria-expanded', String(open));
      };

      items.forEach((item) => {
        const button = $('.acc__btn', item);
        button.addEventListener('click', () => {
          const wasOpen = item.classList.contains('is-open');
          items.forEach((other) => toggle(other, false));
          toggle(item, !wasOpen);
          if (drivesArms) setArm(openIndex());
        });
        if (drivesArms) {
          const preview = () => setArm(Number(item.dataset.arm));
          const restore = () => setArm(openIndex());
          button.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') preview(); });
          button.addEventListener('pointerleave', restore);
          button.addEventListener('focus', preview);
          button.addEventListener('blur', restore);
        }
      });
      if (drivesArms) setArm(openIndex());
    });
  }

  /* ---------- Talent pillars: one lit at a time on pointer devices ---------- */
  function pillars() {
    const wrap = $('[data-pillars]');
    if (!wrap) return;
    const items = $$('.pillar', wrap);
    const activate = (target) => items.forEach((item) => item.classList.toggle('is-active', item === target));
    items.forEach((item) => {
      item.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') activate(item); });
      item.addEventListener('click', () => activate(item));
    });
  }

  /* ---------- Process: pinned horizontal chapters on wide, tall screens ---------- */
  function processTrack() {
    const section = $('[data-process]');
    if (!section) return;
    const track = $('[data-track]', section);
    const view = $('.process__view', section);
    const bar = $('[data-bar]', section);
    const chapters = $$('.chapter', section);
    const marks = $$('[data-marks] li', section);
    const mq = window.matchMedia('(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)');
    let pinned = false;
    let travel = 0;

    const measure = () => {
      pinned = mq.matches;
      section.classList.toggle('is-pinned', pinned);
      if (!pinned) {
        section.style.removeProperty('--travel');
        track.style.removeProperty('--tx');
        chapters.forEach((ch) => ch.classList.add('is-active'));
        return;
      }
      travel = Math.max(0, track.scrollWidth - view.clientWidth);
      section.style.setProperty('--travel', travel + 'px');
    };

    const update = () => {
      if (!pinned) return;
      const top = section.getBoundingClientRect().top;
      const p = travel > 0 ? clamp(-top / travel) : 0;
      track.style.setProperty('--tx', (-p * travel).toFixed(1) + 'px');
      if (bar) bar.style.setProperty('--p', p.toFixed(4));
      const index = Math.round(p * (chapters.length - 1));
      chapters.forEach((ch, i) => ch.classList.toggle('is-active', i === index));
      marks.forEach((m, i) => m.classList.toggle('is-active', i === index));
    };

    measure();
    resizeFns.push(measure);
    scrollFns.push(update);
    mq.addEventListener('change', () => { measure(); requestScroll(); });
    window.addEventListener('load', () => { measure(); requestScroll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); requestScroll(); });
  }

  /* ---------- Application form ---------- */
  function applyForm() {
    const form = $('[data-form]');
    if (!form) return;
    const tabs = $$('.seg__btn', form);
    const sets = $$('[data-set]', form);
    const kindInput = $('[data-kind-input]', form);
    const submitLabel = $('[data-submit-label]', form);
    const alertBox = $('[data-form-alert]', form);
    const done = $('[data-form-done]');
    const demo = $('[data-form-demo]');
    const submit = $('button[type="submit"]', form);
    const labels = { creator: 'Send application', brand: 'Send enquiry' };

    const setKind = (kind, focus) => {
      tabs.forEach((tab) => {
        const on = tab.dataset.kind === kind;
        tab.classList.toggle('is-on', on);
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (on && focus) tab.focus();
      });
      sets.forEach((set) => {
        const on = set.dataset.set === kind;
        set.hidden = !on;
        set.disabled = !on;
      });
      kindInput.value = kind;
      submitLabel.textContent = labels[kind] || labels.creator;
      alertBox.hidden = true;
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => setKind(tab.dataset.kind));
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        setKind(next.dataset.kind, true);
      });
    });

    // Any link marked data-apply="brand" or "creator" preselects that tab.
    document.addEventListener('click', (e) => {
      const link = e.target.closest && e.target.closest('[data-apply]');
      if (link) setKind(link.dataset.apply);
    });

    const problem = (el) => {
      const value = el.value.trim();
      if (el.required && !value) return 'This field is required.';
      if (value && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Enter a valid email address.';
      if (value && el.dataset.rule === 'handle' && !/^@?[A-Za-z0-9_]{1,15}$/.test(value)) return 'Enter your X handle, for example @name.';
      return '';
    };
    const mark = (el, text) => {
      const field = el.closest('.field');
      if (!field) return true;
      let note = $('.field__err', field);
      if (text) {
        if (!note) {
          note = document.createElement('p');
          note.className = 'field__err';
          note.id = el.id + '-err';
          field.appendChild(note);
        }
        note.textContent = text;
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', note.id);
        field.classList.add('is-invalid');
      } else {
        if (note) note.remove();
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
        field.classList.remove('is-invalid');
      }
      return !text;
    };
    const activeFields = () => $$('fieldset:not([disabled]) .field :is(input, select, textarea)', form);

    form.addEventListener('focusout', (e) => {
      const el = e.target;
      if (el.matches && el.matches('.field :is(input, select, textarea)') && el.value.trim()) mark(el, problem(el));
    });
    form.addEventListener('input', (e) => {
      const el = e.target;
      if (el.closest && el.closest('.is-invalid')) mark(el, problem(el));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.hidden = true;
      const invalid = activeFields().filter((el) => !mark(el, problem(el)));
      if (invalid.length) {
        invalid[0].focus();
        alertBox.textContent = invalid.length === 1 ? 'One field needs your attention.' : invalid.length + ' fields need your attention.';
        alertBox.hidden = false;
        return;
      }
      const data = new FormData(form);
      if (data.get('_gotcha')) return; // filled only by bots

      submit.disabled = true;
      try {
        if (SITE.formEndpoint) {
          const res = await fetch(SITE.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error('Request failed: ' + res.status);
        } else {
          // Preview mode: nothing is sent, and the confirmation says so.
          if (demo) demo.hidden = false;
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
        form.hidden = true;
        done.hidden = false;
        done.focus();
      } catch (err) {
        alertBox.textContent = 'Something went wrong and your message was not sent. Please try again.';
        alertBox.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* ---------- Cursor dot and magnetic buttons (mouse only) ---------- */
  function cursor() {
    const dot = $('[data-cursor]');
    if (!dot || !mqFine.matches || reduced()) return;
    let shown = false;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) { shown = true; root.classList.add('has-cursor'); }
      dot.style.setProperty('--cx', e.clientX + 'px');
      dot.style.setProperty('--cy', e.clientY + 'px');
      const target = e.target instanceof Element ? e.target : null;
      const field = target && target.closest('input, textarea, select');
      const active = target && target.closest('a, button, label, .pillar');
      dot.classList.toggle('is-hidden', !!field);
      dot.classList.toggle('is-hover', !!active && !field);
    }, { passive: true });
    root.addEventListener('mouseleave', () => dot.classList.add('is-hidden'));
    root.addEventListener('mouseenter', () => dot.classList.remove('is-hidden'));
  }

  function magnetic() {
    if (!mqFine.matches || reduced()) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - (r.left + r.width / 2)) * 0.16).toFixed(1) + 'px');
        el.style.setProperty('--my', ((e.clientY - (r.top + r.height / 2)) * 0.26).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- Start ---------- */
  hydrate();
  splitHeadlines();
  statement();
  reveals();
  navigation();
  menu();
  strip();
  xfield();
  xdiagram();
  accordions();
  pillars();
  processTrack();
  applyForm();
  cursor();
  magnetic();
  intro();
  requestScroll();
})();
