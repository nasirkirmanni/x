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

  /* ---------- Work: a wall of posts, filled from posts.js ----------
     The section stays off the page until posts.js lists real posts. Adding ?wall=sample
     to the address fills it with placeholder cards instead, to check the layout. */
  function wall() {
    const section = $('[data-wall]');
    if (!section) return;
    const list = $('[data-wall-list]', section);
    const note = $('[data-wall-note]', section);
    const links = $$('[data-wall-link]');
    const data = window.POSTS || {};
    const sample = new URLSearchParams(window.location.search).get('wall') === 'sample';

    const onX = (url) => {
      try {
        const u = new URL(url);
        return u.protocol === 'https:' && /^(www\.|mobile\.)?(x|twitter)\.com$/.test(u.hostname);
      } catch (err) { return false; }
    };
    const placeholder = (text) => ({
      name: 'Creator Name', handle: 'handle', verified: true, date: '2026-11-12', text,
      views: '0.0M', replies: '0', reposts: '0', likes: '0', bookmarks: '0'
    });
    const posts = sample
      ? [
        { ...placeholder('The opening lines of the post appear here. Longer posts are cut off after two lines, so every card keeps the same shape.'), frame: true },
        { ...placeholder('A post with a picture or a video shows a still from it, with the view count in the corner.'), frame: true },
        placeholder('A post with no picture is set larger, like a quotation, so the words carry the card. It can run to seven lines before it is cut off.'),
        { ...placeholder('Each card opens the real post on X in a new tab.'), frame: true },
        { ...placeholder('Figures are copied from the post, and the date they were copied is printed under the wall.'), frame: true }
      ]
      : (Array.isArray(data.items) ? data.items : []).filter((p) => p && p.name && p.handle && onX(p.url));

    if (!list || !posts.length) {
      section.remove();
      links.forEach((el) => el.remove());
      return;
    }

    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = text;
      return node;
    };
    const icon = (id) => {
      const svg = document.createElementNS(NS, 'svg');
      const use = document.createElementNS(NS, 'use');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', id === 'mark' ? '0 0 24 24' : id === 'i-arrow' ? '0 0 16 16' : '0 0 20 20');
      use.setAttribute('href', '#' + id);
      svg.appendChild(use);
      return svg;
    };
    const picture = (src, alt) => {
      const img = el('img');
      img.src = src; img.alt = alt || ''; img.loading = 'lazy'; img.decoding = 'async';
      return img;
    };
    const count = (v) => {
      if (typeof v === 'string') return v.trim();
      if (typeof v !== 'number' || !isFinite(v) || v < 0) return '';
      try { return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v); }
      catch (err) { return String(v); }
    };
    const day = (v) => {
      const text = v ? String(v).trim() : '';
      if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return { text, iso: '' };
      const d = new Date(text.slice(0, 10) + 'T00:00:00Z');
      if (isNaN(d)) return { text, iso: '' };
      return {
        text: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d),
        iso: text.slice(0, 10)
      };
    };
    const initials = (name) => String(name).trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase();
    const STATS = [['replies', 'i-reply'], ['reposts', 'i-repost'], ['likes', 'i-like'], ['bookmarks', 'i-save']];
    let figures = false;

    const card = (p, i) => {
      const handle = String(p.handle).replace(/^@/, '').trim();
      const hasMedia = !!(p.image || p.frame);
      const cell = el('li', 'wall__cell');
      const box = el(sample ? 'div' : 'a', 'card' + (hasMedia ? '' : ' card--quote'));
      if (!sample) { box.href = p.url; box.target = '_blank'; box.rel = 'noopener noreferrer'; }
      cell.setAttribute('data-reveal', '');
      cell.style.setProperty('--d', (i % 3) * 90 + 'ms');

      // Who posted it, and when
      const head = el('div', 'card__head');
      const avatar = el('span', 'card__avatar');
      if (p.avatar) {
        const img = picture(p.avatar, '');
        img.addEventListener('error', () => { avatar.textContent = initials(p.name); });
        avatar.appendChild(img);
      } else {
        avatar.textContent = initials(p.name);
      }
      avatar.setAttribute('aria-hidden', 'true');
      const who = el('div', 'card__who');
      const name = el('div', 'card__name');
      name.appendChild(el('span', '', String(p.name)));
      if (p.verified) { name.appendChild(icon('i-check')); name.appendChild(el('span', 'sr-only', 'Verified account.')); }
      const meta = el('div', 'card__meta', '@' + handle);
      const when = day(p.date);
      if (when.text) {
        const time = el('time', '', when.text);
        if (when.iso) time.dateTime = when.iso;
        meta.appendChild(document.createTextNode(' · '));
        meta.appendChild(time);
      }
      who.append(name, meta);
      const end = sample ? el('span', 'card__chip', 'Sample') : el('span', 'card__go');
      if (!sample) end.appendChild(icon('i-arrow'));
      head.append(avatar, who, end);
      box.appendChild(head);

      if (p.text) box.appendChild(el('p', 'card__text', String(p.text).replace(/\s+/g, ' ').trim()));

      // A still from the post, with its view count
      const views = count(p.views);
      if (hasMedia) {
        const media = el('div', 'card__media' + (p.image ? '' : ' card__media--empty'));
        if (p.image) {
          const img = picture(p.image, p.alt);
          img.addEventListener('error', () => { img.remove(); media.classList.add('card__media--empty'); media.prepend(icon('mark')); });
          media.appendChild(img);
        } else {
          media.appendChild(icon('mark'));
        }
        if (views) {
          const badge = el('span', 'card__views');
          badge.append(icon('i-views'), document.createTextNode(views), el('span', 'sr-only', ' views'));
          media.appendChild(badge);
        }
        box.appendChild(media);
      }

      // The post's own figures. Any that were left out are simply not shown.
      const stats = el('ul', 'card__stats');
      const add = (label, id, value) => {
        const li = el('li');
        li.append(icon(id), document.createTextNode(value), el('span', 'sr-only', ' ' + label));
        stats.appendChild(li);
      };
      STATS.forEach(([key, id]) => { const v = count(p[key]); if (v) add(key, id, v); });
      if (!hasMedia && views) add('views', 'i-views', views);
      if (stats.children.length) box.appendChild(stats);
      if (views || stats.children.length) figures = true;

      if (!sample) box.appendChild(el('span', 'sr-only', 'Opens on X in a new tab.'));
      cell.appendChild(box);
      return cell;
    };

    // The last place on the wall is open, and leads to the application form.
    const invite = (i) => {
      const cell = el('li', 'wall__cell wall__cell--invite');
      const box = el('a', 'card card--invite');
      const label = el('span', 'tag');
      const plus = el('span', 'glyph glyph--plus');
      const line = el('p', 'card__line', 'The next post here could be ');
      const cta = el('span', 'card__cta');
      const go = el('span', 'card__go');
      box.href = '#apply';
      cell.setAttribute('data-reveal', '');
      cell.style.setProperty('--d', (i % 3) * 90 + 'ms');
      plus.setAttribute('aria-hidden', 'true');
      label.append(plus, document.createTextNode('Applications open'));
      line.appendChild(el('em', '', 'yours.'));
      go.appendChild(icon('i-arrow'));
      cta.append(el('span', '', 'Apply for representation'), go);
      box.append(label, line, cta);
      cell.appendChild(box);
      return cell;
    };

    posts.forEach((p, i) => list.appendChild(card(p, i)));
    list.appendChild(invite(posts.length));

    const asOf = day(data.asOf).text;
    if (sample) note.textContent = 'Sample layout. These are placeholder cards, not real posts.';
    else if (figures) note.textContent = 'Figures as shown on X' + (asOf ? ' on ' + asOf : '') + '.';
    else note.remove();

    // Show the section and its links, then number every section in page order.
    const two = (n) => String(n).padStart(2, '0');
    section.hidden = false;
    links.forEach((link) => { link.hidden = false; });
    $$('main [data-section]').forEach((sec, i) => {
      const n = $('.sec-head .tag', sec);
      if (n) n.textContent = two(i + 1);
    });
    $$('.menu__n').forEach((n, i) => { n.textContent = two(i + 1); });

    // The section was hidden while the page loaded, so the page has only now reached its
    // full length. A link that points straight at a section is followed again.
    const hash = window.location.hash.slice(1);
    const entry = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    const target = hash && (!entry || entry.type === 'navigate') ? document.getElementById(hash) : null;
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
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
      span.style.opacity = '0.28';
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
      for (let i = 0; i < spans.length; i++) spans[i].style.opacity = (0.28 + 0.72 * clamp(lit - i)).toFixed(3);
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
    // Boost: 0 at rest, 1 while the pointer is on an Apply button. It speeds the
    // flow, brings in more signals as streaks, and makes the node send out rings.
    let boost = 0, boostT = 0, ping = 0, baseSparks = 4;
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
      // Where the text starts, so CSS can fade the figure out before it (top composition).
      hero.style.setProperty('--content-top', Math.round(free + navH) + 'px');
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

      // A few signals are always travelling. The rest of the pool joins in during a boost.
      baseSparks = wide ? 4 : 2;
      const pool = wide ? 26 : 10;
      sparks.length = 0;
      for (let i = 0; i < pool; i++) {
        const sp = newSpark(i / baseSparks);
        if (i >= baseSparks) sp.p = Math.random();   // already spread along their strands
        sparks.push(sp);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const zoom = (1 + depth * 0.5) * (1 + boost * 0.045);
      const fade = 1 - smooth(depth * 1.2);
      if (fade <= 0.002) return;
      const grow = easeOut(reveal);

      ctx.save();
      ctx.translate(cx + ox, cy + oy);
      ctx.rotate(rot);
      ctx.scale(zoom, zoom);
      ctx.strokeStyle = grad;
      ctx.lineWidth = (lw * (1 + boost * 0.55)) / zoom;
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
      ctx.arc(0, 0, 4.5 + boost * 3, 0, Math.PI * 2);
      ctx.stroke();

      // During a boost the node sends out two expanding rings
      if (boost > 0.01) {
        for (let i = 0; i < 2; i++) {
          const f = (ping + i / 2) % 1;
          ctx.globalAlpha = fade * boost * (1 - f) * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, 10 + f * 110, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Signals travelling along strands. The first few are always there;
      // the rest fade in with the boost and are drawn as streaks.
      ctx.fillStyle = '#fff';
      const extra = smooth(boost);
      for (let n = 0; n < sparks.length; n++) {
        const sp = sparks[n];
        const share = n < baseSparks ? 1 : extra;
        if (share <= 0.01 || sp.p <= 0 || sp.p >= 1) continue;
        const a = Math.sqrt(C * sp.k);
        const lim = R / (a * Math.SQRT2);
        if (lim <= 1) continue;
        const U = Math.acosh(lim);
        const edge = smooth(sp.p / 0.14) * (1 - smooth((sp.p - 0.86) / 0.14)) * share;

        if (boost > 0.02) {
          const steps = 14;
          ctx.lineWidth = 1.3 / zoom;
          for (let t = 0; t < steps; t++) {
            const p1 = point(sp.s, a, U * (2 * (sp.p - t * 0.0075) - 1));
            const p2 = point(sp.s, a, U * (2 * (sp.p - (t + 1) * 0.0075) - 1));
            ctx.globalAlpha = fade * grow * edge * boost * Math.pow(1 - t / steps, 1.6) * 0.9;
            ctx.beginPath();
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.stroke();
          }
        }
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
      // Ease towards the boost target: quick to build, slower to settle.
      boost = lerp(boost, boostT, boostT > boost ? 0.07 : 0.035);
      if (Math.abs(boost - boostT) < 0.002) boost = boostT;
      ping = (ping + dt * 0.9) % 1;
      phase += dt * (0.1 + boost * 0.85);
      if (phase >= 1) phase -= 1;
      // The intro runs on the clock, not on frame count, so a slow device still finishes on time.
      if (started && reveal < 1) reveal = clamp((now - startedAt) / 2600);
      rot = lerp(rot, rotT, 0.04);
      ox = lerp(ox, oxT, 0.04);
      oy = lerp(oy, oyT, 0.04);
      for (let n = 0; n < sparks.length; n++) {
        const sp = sparks[n];
        sp.p += dt * sp.v * (1 + boost * 2.4);
        if (sp.p >= 1) {
          Object.assign(sp, newSpark());
          if (n >= baseSparks) sp.p = -Math.random() * 0.12;   // pool signals come straight back
        }
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

    // Hovering or focusing an Apply button boosts the figure.
    $$('a.btn[href="#apply"]:not([data-apply])').forEach((btn) => {
      const on = () => { boostT = 1; play(); };
      const off = () => { boostT = 0; };
      btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); });
      btn.addEventListener('pointerleave', off);
      btn.addEventListener('focus', on);
      btn.addEventListener('blur', off);
    });
  }

  /* ---------- Management figure: four arms drawn in towards one node ----------
     Built here so the page has no empty box when JavaScript is off. The lines
     start undrawn; CSS draws them once when the figure scrolls into view. */
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

    const S = 600, c = S / 2, r0 = 84, r1 = 290, lines = 9, gap = 8, k = Math.SQRT1_2;
    const len = r1 - r0;
    const svg = make('svg', { viewBox: '0 0 ' + S + ' ' + S, focusable: 'false' });
    const defs = make('defs', {}, svg);

    // Clockwise from the top-left arm
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], a) => {
      const dx = sx * k, dy = sy * k;   // along the arm
      const nx = -dy, ny = dx;          // across it
      const grad = make('linearGradient', {
        id: 'xd-grad-' + a, gradientUnits: 'userSpaceOnUse',
        x1: c + dx * r0, y1: c + dy * r0, x2: c + dx * r1, y2: c + dy * r1
      }, defs);
      make('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '1' }, grad);
      make('stop', { offset: '.6', 'stop-color': '#d6dade', 'stop-opacity': '.7' }, grad);
      make('stop', { offset: '1', 'stop-color': '#c4c8ce', 'stop-opacity': '0' }, grad);

      for (let j = 0; j < lines; j++) {
        const d = (j - (lines - 1) / 2) * gap;
        // Each line runs from the outer tip to the node, so it draws inwards.
        const line = make('path', {
          class: 'xd-line',
          d: 'M' + (c + dx * r1 + nx * d).toFixed(2) + ' ' + (c + dy * r1 + ny * d).toFixed(2) +
             'L' + (c + dx * r0 + nx * d).toFixed(2) + ' ' + (c + dy * r0 + ny * d).toFixed(2),
          stroke: 'url(#xd-grad-' + a + ')'
        }, svg);
        // A second, invisible copy of the line carries the light that runs along it on hover.
        const pulse = make('path', { class: 'xd-pulse', d: line.getAttribute('d') }, svg);
        [line, pulse].forEach((p) => {
          p.style.setProperty('--len', len);
          p.style.setProperty('--a', a);
          p.style.setProperty('--j', Math.abs(j - (lines - 1) / 2));
        });
      }
    });

    make('circle', { class: 'xd-orbit', cx: c, cy: c, r: 44 }, svg);
    make('circle', { class: 'xd-core', cx: c, cy: c, r: 11 }, svg);
    make('circle', { class: 'xd-dot', cx: c, cy: c, r: 2.4 }, svg);
    const you = document.createElement('span');
    you.className = 'mgmt__you';
    you.textContent = 'You';

    // The drawing and its label share one stage, so they lean together.
    const stage = document.createElement('div');
    stage.className = 'xd-stage';
    stage.appendChild(svg);
    stage.appendChild(you);
    fig.appendChild(stage);

    // Hover, mouse only: the figure leans towards the pointer and the centre dot
    // follows it. The light running along the arms is handled in CSS.
    if (mqFine.matches) {
      const lean = (rx, ry, px, py) => {
        stage.style.setProperty('--rx', rx);
        stage.style.setProperty('--ry', ry);
        stage.style.setProperty('--px', px);
        stage.style.setProperty('--py', py);
      };
      fig.addEventListener('pointermove', (e) => {
        if (reduced() || e.pointerType !== 'mouse') return;
        const r = fig.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 at the left edge, 0.5 at the right
        const py = (e.clientY - r.top) / r.height - 0.5;
        lean((-py * 16).toFixed(2), (px * 16).toFixed(2), (px * 12).toFixed(2), (py * 12).toFixed(2));
      });
      fig.addEventListener('pointerleave', () => lean(0, 0, 0, 0));
    }
  }

  /* ---------- Accordions ---------- */
  function accordions() {
    $$('[data-acc]').forEach((acc) => {
      const items = $$('.acc__item', acc);
      const toggle = (item, open) => {
        item.classList.toggle('is-open', open);
        $('.acc__btn', item).setAttribute('aria-expanded', String(open));
      };
      items.forEach((item) => {
        $('.acc__btn', item).addEventListener('click', () => {
          const wasOpen = item.classList.contains('is-open');
          items.forEach((other) => toggle(other, false));
          toggle(item, !wasOpen);
        });
      });
    });
  }

  /* ---------- Process: the ruled line draws once, when most of it is in view ---------- */
  function steps() {
    const list = $('[data-steps]');
    if (!list) return;
    if (!('IntersectionObserver' in window)) { list.classList.add('is-drawn'); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      list.classList.add('is-drawn');
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(list);
  }

  /* ---------- Navigation glass ----------
     A soft highlight follows the pointer across the bar. Chromium-based browsers can run
     an SVG filter on what is behind an element, so there the bar also bends the page near
     its edges, like the rim of a glass lens. Other browsers keep the plain glass. */
  function glass() {
    const bar = $('.nav__bar');
    if (!bar) return;
    if (mqFine.matches) {
      bar.addEventListener('pointermove', (e) => {
        const r = bar.getBoundingClientRect();
        bar.style.setProperty('--gx', Math.round(e.clientX - r.left) + 'px');
        bar.style.setProperty('--gy', Math.round(e.clientY - r.top) + 'px');
        bar.classList.add('is-lit');
      }, { passive: true });
      bar.addEventListener('pointerleave', () => bar.classList.remove('is-lit'));
    }

    const brands = navigator.userAgentData && navigator.userAgentData.brands;
    if (!brands || !brands.some((b) => /Chromium/i.test(b.brand))) return;

    const NS = 'http://www.w3.org/2000/svg';
    const make = (name, attrs, parent) => {
      const node = document.createElementNS(NS, name);
      Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
      if (parent) parent.appendChild(node);
      return node;
    };
    const svg = make('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
    svg.style.position = 'absolute';
    const filter = make('filter', { id: 'nav-lens', x: '0', y: '0', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' }, svg);
    const map = make('feImage', { result: 'map', preserveAspectRatio: 'none' }, filter);
    const shift = make('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: '0' }, filter);
    document.body.appendChild(svg);

    // The map says, for every pixel of the bar, where to look instead. Inside a rim near
    // the edge it looks inwards, most strongly at the very edge; the middle is left clear.
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    let lastW = 0, lastH = 0;
    const build = () => {
      const w = Math.round(bar.offsetWidth);
      const h = Math.round(bar.offsetHeight);
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      cv.width = w; cv.height = h;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const hw = w / 2, hh = h / 2, r = hh;
      const rim = Math.min(r, 16);
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const px = i + 0.5 - hw, py = j + 0.5 - hh;
          const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
          // Signed distance to the pill's outline: negative inside.
          const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
          const depth = -sd;
          let nx = 0, ny = 0;
          if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); nx = qx / l; ny = qy / l; }
          else if (qx > qy) nx = 1;
          else ny = 1;
          nx *= px < 0 ? -1 : 1;
          ny *= py < 0 ? -1 : 1;
          const t = depth > 0 && depth < rim ? Math.pow(1 - depth / rim, 2) : 0;
          const k = (j * w + i) * 4;
          d[k] = 128 - nx * t * 127;
          d[k + 1] = 128 - ny * t * 127;
          d[k + 2] = 128;
          d[k + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      map.setAttribute('href', cv.toDataURL());
      map.setAttribute('width', String(w));
      map.setAttribute('height', String(h));
      shift.setAttribute('scale', '32');   // the largest shift is half of this, in pixels
      root.classList.add('has-lens');
    };
    build();
    if ('ResizeObserver' in window) new ResizeObserver(build).observe(bar);
    else resizeFns.push(build);
  }

  /* ---------- Footer word: letters rise out of the page's edge, then a light moves across them ----------
     Two identical layers of letters: a dim one, and a white one that only shows inside a
     soft circle of light. The light drifts on its own, and follows the pointer while the
     pointer is over the footer. */
  function footWord() {
    const el = $('[data-footword]');
    if (!el) return;
    const text = el.textContent.trim();
    const layer = (cls) => {
      const wrap = document.createElement('span');
      wrap.className = cls;
      Array.from(text).forEach((ch, i) => {
        const c = document.createElement('span');
        c.className = 'fw__ch';
        c.textContent = ch;
        c.style.setProperty('--i', i);
        wrap.appendChild(c);
      });
      return wrap;
    };
    el.textContent = '';
    el.append(layer('fw__base'), layer('fw__lit'));

    let visible = false, hover = false, raf = 0;
    let x = 0.5, y = 0.6, tx = x, ty = y;
    const t0 = performance.now();
    const paint = () => {
      el.style.setProperty('--fx', (x * 100).toFixed(2) + '%');
      el.style.setProperty('--fy', (y * 100).toFixed(2) + '%');
    };
    const frame = (now) => {
      raf = 0;
      if (!hover) {
        const t = (now - t0) / 1000;
        tx = 0.5 + 0.47 * Math.sin(t * 0.35);
        ty = 0.6 + 0.1 * Math.sin(t * 0.83);
      }
      const k = hover ? 0.14 : 0.06;
      x += (tx - x) * k;
      y += (ty - y) * k;
      paint();
      if (visible && !document.hidden && !reduced()) raf = requestAnimationFrame(frame);
    };
    const play = () => {
      if (!raf && visible && !document.hidden && !reduced()) raf = requestAnimationFrame(frame);
    };
    paint();

    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return; }
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) el.classList.add('in');
      play();
    }, { threshold: 0.25 }).observe(el);
    document.addEventListener('visibilitychange', play);

    if (mqFine.matches) {
      const area = el.closest('.foot') || el;
      area.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        hover = true;
        tx = (e.clientX - r.left) / r.width;
        ty = (e.clientY - r.top) / r.height;
        play();
      }, { passive: true });
      area.addEventListener('pointerleave', () => { hover = false; });
    }
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
      const active = target && target.closest('a, button, label');
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
  wall();
  splitHeadlines();
  statement();
  reveals();
  navigation();
  menu();
  glass();
  xfield();
  xdiagram();
  accordions();
  steps();
  footWord();
  applyForm();
  cursor();
  magnetic();
  intro();
  requestScroll();
})();
