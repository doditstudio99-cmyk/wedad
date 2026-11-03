(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(c));
    return el;
  };

  const ICONS = { reels: '🎬', board: '📊', combo: '🚀', camera: '📷', star: '⭐' };
  const CAT_ICONS = { doctors: '🩺', lawyers: '⚖️', teachers: '📚', realestate: '🏢', business: '💼', other: '🎥' };
  const SOCIAL_SVG = {
    instagram: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 100 10.2 5.1 5.1 0 000-10.2zm0 8.4a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6zm5.3-9.8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z',
    facebook: 'M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.6 2 14.4 2 11.8 2 10 3.6 10 6.4v2.1H7.4v3.4H10V22h4v-10.1h2.8l.4-3.4H14z',
    tiktok: 'M16.6 2h-3.3v13.4a2.9 2.9 0 11-2-2.8V9.2a6.3 6.3 0 105.3 6.2V8.6a7.9 7.9 0 004.4 1.4V6.7a4.5 4.5 0 01-4.4-4.7z',
    youtube: 'M23 7.2a3 3 0 00-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 001 7.2 31 31 0 00.6 12a31 31 0 00.5 4.8 3 3 0 002.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-4.8 31 31 0 00-.6-4.8zM9.7 15V9l5.8 3-5.8 3z',
    snapchat: 'M12 2c3 0 5.4 2.3 5.4 5.6v2.2c.4.2 1 .1 1.5-.1.6-.2 1.2.4.9 1-.4.8-1.6 1-2.2 1.3.4 1.7 2 3.2 3.7 3.7.5.2.5.8 0 1-.8.4-1.8.5-2 .9-.2.4 0 1-.6 1.1-.7.1-1.6-.3-2.6.1-1 .4-1.8 1.7-4.1 1.7s-3.1-1.3-4.1-1.7c-1-.4-1.9 0-2.6-.1-.6-.1-.4-.7-.6-1.1-.2-.4-1.2-.5-2-.9-.5-.2-.5-.8 0-1 1.7-.5 3.3-2 3.7-3.7-.6-.3-1.8-.5-2.2-1.3-.3-.6.3-1.2.9-1 .5.2 1.1.3 1.5.1V7.6C6.6 4.3 9 2 12 2z',
    x: 'M17.8 2h3.4l-7.4 8.5L22.5 22h-6.8l-5.3-7-6.1 7H.9l7.9-9.1L.5 2h7l4.8 6.4L17.8 2zm-1.2 18h1.9L6.5 3.9H4.5L16.6 20z',
    linkedin: 'M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.75h4V21H3V9.75zM9.5 9.75h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.89 1.28-1.89 2.6V21h-4V9.75z',
  };

  let lang = 'ar';
  try {
    const saved = localStorage.getItem('dodit_lang');
    if (saved === 'ar' || saved === 'en') lang = saved;
  } catch { /* storage unavailable */ }
  let site = null;
  let currentFilter = 'all';

  const t = (key) => (I18N[lang] && I18N[lang][key]) ?? I18N.ar[key] ?? key;
  const tr = (obj) => (obj ? obj[lang] || obj.ar || obj.en || '' : '');
  const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

  // Two back-ends: the Node server (/api/…) or a Google Apps Script web app (free version, set in js/config.js)
  const API_URL = String((window.DODIT_CONFIG && window.DODIT_CONFIG.apiUrl) || '').trim();
  const api = {
    site: () => fetch(API_URL ? API_URL + '?action=site' : '/api/site'),
    slots: (date) =>
      fetch(API_URL ? API_URL + '?action=slots&date=' + encodeURIComponent(date) : '/api/slots?date=' + encodeURIComponent(date)),
    // Apps Script needs a "simple" request (no JSON content-type) to avoid a CORS preflight
    book: (payload) =>
      API_URL
        ? fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'book', ...payload }) })
        : fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  };

  function fmtTime(time) {
    let [hh, mm] = time.split(':').map(Number);
    const suffix = hh >= 12 ? t('pm') : t('am');
    hh = hh % 12 || 12;
    return `${hh}:${String(mm).padStart(2, '0')} ${suffix}`;
  }
  function fmtDate(date) {
    const d = new Date(date + 'T00:00:00Z');
    return `${t('daysLong')[d.getUTCDay()]} ${d.getUTCDate()} ${t('months')[d.getUTCMonth()]}`;
  }

  /* ---------------- language ---------------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $('#langBtn').textContent = lang === 'ar' ? 'EN' : 'ع';
    $$('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
    if (site) render();
  }
  $('#langBtn').addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('dodit_lang', lang); } catch { /* ignore */ }
    applyLang();
  });

  /* ---------------- rendering ---------------- */
  function render() {
    const s = site.settings;
    $$('[data-bind]').forEach((el) => (el.textContent = tr(s[el.dataset.bind])));
    document.title = `${s.studioName} | ${tr(s.tagline)}`;

    // hero video (optional)
    const screen = $('#heroScreen');
    const existing = $('video', screen);
    if (s.heroVideo && !existing) {
      screen.prepend(h('video', { src: s.heroVideo, autoplay: '', muted: '', loop: '', playsinline: '' }));
      $('video', screen).muted = true;
    }

    renderServices();
    renderFilters();
    renderPortfolio();
    renderTestimonials();
    renderContact();
    renderBooking();
  }

  function renderServices() {
    const grid = $('#servicesGrid');
    grid.replaceChildren(
      ...site.services.map((svc) =>
        h('article', { class: 'svc reveal in' + (svc.featured ? ' featured' : '') },
          svc.featured ? h('span', { class: 'badge', text: t('services.popular') }) : null,
          h('div', { class: 'svc-ico', text: ICONS[svc.icon] || '🎬' }),
          h('h3', { text: tr(svc.title) }),
          h('p', { class: 'desc', text: tr(svc.description) }),
          svc.price
            ? h('div', { class: 'price' },
                h('b', { text: Number.isFinite(+svc.price) ? Number(svc.price).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') : svc.price }),
                h('span', { text: [tr(site.settings.currency), tr(svc.priceNote)].filter(Boolean).join(' / ') }))
            : null,
          h('ul', {}, (svc.features[lang] || svc.features.ar || []).map((f) => h('li', { text: f }))),
          h('a', { href: '#booking', class: 'btn ' + (svc.featured ? 'btn-primary' : 'btn-ghost'), text: t('services.book'), onclick: () => selectService(svc.id) })
        )
      )
    );
  }

  function renderFilters() {
    const used = new Set(site.portfolio.map((p) => p.category));
    const cats = ['all', ...['doctors', 'lawyers', 'teachers', 'realestate', 'business', 'other'].filter((c) => used.has(c))];
    $('#filters').replaceChildren(
      ...cats.map((c) =>
        h('button', {
          class: 'filter' + (c === currentFilter ? ' active' : ''), type: 'button', text: t('cat.' + c),
          onclick: () => { currentFilter = c; renderFilters(); renderPortfolio(); },
        })
      )
    );
  }

  function renderPortfolio() {
    const items = site.portfolio.filter((p) => currentFilter === 'all' || p.category === currentFilter);
    const grid = $('#portfolioGrid');
    if (!items.length) return grid.replaceChildren(h('p', { class: 'empty', text: t('portfolio.empty') }));
    grid.replaceChildren(
      ...items.map((p) => {
        let media;
        if (p.thumb || (p.type === 'image' && p.url)) media = h('img', { src: p.thumb || p.url, alt: tr(p.title), loading: 'lazy' });
        else if (p.type === 'video' && p.url) media = h('video', { src: p.url + '#t=0.5', muted: '', playsinline: '', preload: 'metadata' });
        else media = h('div', { class: 'ph c-' + p.category, text: CAT_ICONS[p.category] || '🎥' });
        return h('button', { class: 'work', type: 'button', onclick: () => openWork(p) },
          media,
          p.type !== 'image' ? h('span', { class: 'play', text: p.type === 'link' ? '↗' : '▶' }) : null,
          h('div', { class: 'overlay' }, h('small', { text: t('cat.' + p.category) }), h('h4', { text: tr(p.title) }))
        );
      })
    );
  }

  function openWork(p) {
    if (!p.url) return;
    if (p.type === 'link') return window.open(p.url, '_blank', 'noopener');
    const body = $('#lbBody');
    body.replaceChildren(
      p.type === 'video'
        ? h('video', { src: p.url, controls: '', autoplay: '', playsinline: '', poster: p.thumb || null })
        : h('img', { src: p.url, alt: tr(p.title) })
    );
    $('#lightbox').hidden = false;
  }
  function closeLightbox() { $('#lightbox').hidden = true; $('#lbBody').replaceChildren(); }
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  function renderTestimonials() {
    $('#testimonialsGrid').replaceChildren(
      ...site.testimonials.map((r) =>
        h('figure', { class: 'tcard reveal in' },
          h('div', { class: 'stars', text: '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating), 'aria-label': r.rating + '/5' }),
          h('p', { text: '“' + tr(r.text) + '”' }),
          h('figcaption', { class: 'who' },
            h('span', { class: 'avatar', text: (r.name || '?').replace(/^(د\.|أ\.|م\.|Dr\.|Eng\.)\s*/, '').charAt(0) }),
            h('div', {}, h('b', { text: r.name }), h('small', { text: tr(r.role) })))
        )
      )
    );
  }

  function waLink(text) {
    const n = (site.settings.whatsapp || '').replace(/\D/g, '');
    return `https://wa.me/${n}${text ? '?text=' + encodeURIComponent(text) : ''}`;
  }

  function renderContact() {
    const s = site.settings;
    const phone = $('#phoneLink');
    phone.textContent = s.phone;
    phone.href = 'tel:' + (s.phone || '').replace(/[^\d+]/g, '');
    const email = $('#emailLink');
    email.textContent = s.email;
    email.href = 'mailto:' + s.email;
    email.parentElement.parentElement.hidden = !s.email;

    const wa = waLink(t('contact.waMsg'));
    $('#waBtn').href = wa;
    $('#waFloat').href = wa;

    // hours: if every open day shares the same hours, show the range
    const open = Object.values(site.booking.days).filter((d) => d.open);
    let hours = tr(s.workingHoursNote);
    if (open.length && open.every((d) => d.start === open[0].start && d.end === open[0].end)) {
      hours = [hours, `${fmtTime(open[0].start)} – ${fmtTime(open[0].end)}`].filter(Boolean).join(' · ');
    }
    $('#hoursText').textContent = hours;

    const frame = $('#mapFrame');
    const src = `https://www.google.com/maps?q=${encodeURIComponent(s.mapQuery || tr(s.address))}&output=embed&hl=${lang}`;
    if (frame.src !== src) frame.src = src;

    const socials = Object.entries(s.social || {}).filter(([k, v]) => v && SOCIAL_SVG[k]);
    for (const box of [$('#socials'), $('#socialsFooter')]) {
      box.replaceChildren(
        ...socials.map(([k, v]) => {
          const a = h('a', { href: v, target: '_blank', rel: 'noopener', 'aria-label': k });
          a.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${SOCIAL_SVG[k]}"/></svg>`;
          return a;
        })
      );
    }
  }

  /* ---------------- booking ---------------- */
  const booking = { serviceId: null, date: null, time: null, month: null, ref: null };

  function showStep(n) {
    $$('.bpanel').forEach((p) => (p.hidden = Number(p.dataset.panel) !== n));
    $$('.bstep').forEach((s) => {
      const i = Number(s.dataset.step);
      s.classList.toggle('active', i === n);
      s.classList.toggle('done', i < n);
    });
  }

  function selectService(id) {
    booking.serviceId = id;
    renderServiceOptions();
    $('#toStep2').disabled = false;
  }

  function renderServiceOptions() {
    $('#svcOptions').replaceChildren(
      ...site.services.map((svc) =>
        h('button', {
          type: 'button', class: 'svc-opt' + (booking.serviceId === svc.id ? ' selected' : ''), onclick: () => selectService(svc.id),
        },
          h('span', { class: 'svc-ico', text: ICONS[svc.icon] || '🎬' }),
          h('span', {}, h('b', { text: tr(svc.title) }),
            h('small', { text: svc.price ? `${svc.price} ${tr(site.settings.currency)}${tr(svc.priceNote) ? ' / ' + tr(svc.priceNote) : ''}` : '' })))
      )
    );
  }

  function renderBooking() {
    renderServiceOptions();
    renderCalendar();
    if (booking.date) loadSlots(booking.date, true);
    renderSummary();
  }

  function dayAllowed(date) {
    const b = site.booking;
    const last = new Date(b.today + 'T00:00:00Z');
    last.setUTCDate(last.getUTCDate() + Number(b.maxDaysAhead || 60));
    if (date < b.today || date > last.toISOString().slice(0, 10)) return false;
    if ((b.closedDates || []).includes(date)) return false;
    const d = b.days[new Date(date + 'T00:00:00Z').getUTCDay()];
    return !!(d && d.open);
  }

  function renderCalendar() {
    const b = site.booking;
    if (!booking.month) booking.month = b.today.slice(0, 7);
    const [y, m] = booking.month.split('-').map(Number);
    $('#calTitle').textContent = `${t('months')[m - 1]} ${y}`;
    $('#calWeek').replaceChildren(...t('days').map((d) => h('span', { text: d })));

    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < first.getUTCDay(); i++) cells.push(h('span'));
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${booking.month}-${String(d).padStart(2, '0')}`;
      const ok = dayAllowed(date);
      cells.push(
        h('button', {
          type: 'button', text: String(d), disabled: ok ? null : '',
          class: 'day' + (date === b.today ? ' today' : '') + (date === booking.date ? ' selected' : ''),
          onclick: () => { booking.date = date; booking.time = null; $('#toStep3').disabled = true; renderCalendar(); loadSlots(date); },
        })
      );
    }
    $('#calDays').replaceChildren(...cells);

    const todayMonth = b.today.slice(0, 7);
    const last = new Date(b.today + 'T00:00:00Z');
    last.setUTCDate(last.getUTCDate() + Number(b.maxDaysAhead || 60));
    $('#calPrev').disabled = booking.month <= todayMonth;
    $('#calNext').disabled = booking.month >= last.toISOString().slice(0, 7);
  }

  function shiftMonth(n) {
    const [y, m] = booking.month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    booking.month = d.toISOString().slice(0, 7);
    renderCalendar();
  }
  $('#calPrev').addEventListener('click', () => shiftMonth(-1));
  $('#calNext').addEventListener('click', () => shiftMonth(1));

  let slotsReq = 0;
  async function loadSlots(date, quiet) {
    const box = $('#slots');
    const req = ++slotsReq;
    $('#slotsTitle').textContent = `${t('booking.slotsFor')} ${fmtDate(date)}`;
    if (!quiet) box.replaceChildren(h('p', { class: 'slots-msg', text: t('booking.loading') }));
    try {
      const res = await api.slots(date);
      const data = await res.json();
      if (req !== slotsReq) return;
      if (!data.open) return box.replaceChildren(h('p', { class: 'slots-msg', text: t('booking.closed') }));
      const visible = data.slots.filter((s) => s.status !== 'past');
      if (!visible.length)
        return box.replaceChildren(h('p', { class: 'slots-msg', text: t('booking.full') }));
      if (booking.time && !visible.some((s) => s.time === booking.time && s.status === 'available')) {
        booking.time = null;
        $('#toStep3').disabled = true;
      }
      box.replaceChildren(
        ...visible.map((s) =>
          h('button', {
            type: 'button', disabled: s.status === 'available' ? null : '',
            class: 'slot ' + s.status + (booking.time === s.time ? ' selected' : ''),
            title: s.status === 'booked' ? t('booking.busy') : null,
            onclick: () => { booking.time = s.time; $('#toStep3').disabled = false; loadSlots(date, true); },
          }, fmtTime(s.time), s.status === 'booked' ? h('small', { text: t('booking.busy') }) : null)
        ),
        ...(visible.every((s) => s.status !== 'available') ? [h('p', { class: 'slots-msg', text: t('booking.full') })] : [])
      );
    } catch {
      box.replaceChildren(h('p', { class: 'slots-msg', text: t('err.generic') }));
    }
  }

  function serviceTitle() {
    const svc = site.services.find((s) => s.id === booking.serviceId);
    return svc ? tr(svc.title) : '';
  }

  function renderSummary() {
    if (!booking.date || !booking.time) return;
    $('#summary').replaceChildren(
      h('div', {}, h('span', { text: t('booking.service') }), serviceTitle()),
      h('div', {}, h('span', { text: t('booking.date') }), fmtDate(booking.date)),
      h('div', {}, h('span', { text: t('booking.time') }), fmtTime(booking.time))
    );
  }

  $('#toStep2').addEventListener('click', () => showStep(2));
  $('#toStep3').addEventListener('click', () => { renderSummary(); showStep(3); });
  $$('[data-back]').forEach((b) => b.addEventListener('click', () => showStep(Number(b.dataset.back))));

  $('#bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = $('#formError');
    const btn = $('#submitBtn');
    err.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    if ((data.name || '').trim().length < 2) return (err.textContent = t('err.invalid_name'));
    if (!/^\+?[\d\s-]{7,20}$/.test((data.phone || '').trim())) return (err.textContent = t('err.invalid_phone'));
    btn.disabled = true;
    btn.textContent = t('booking.sending');
    try {
      const res = await api.book({ ...data, serviceId: booking.serviceId, date: booking.date, time: booking.time });
      const out = await res.json().catch(() => ({ error: 'generic' }));
      if (!res.ok || out.error) {
        err.textContent = t('err.' + out.error) !== 'err.' + out.error ? t('err.' + out.error) : t('err.generic');
        if (out.error === 'slot_taken') {
          booking.time = null;
          $('#toStep3').disabled = true;
          setTimeout(() => { showStep(2); loadSlots(booking.date); }, 1600);
        }
        return;
      }
      const vars = { ref: out.ref, date: fmtDate(out.date), time: fmtTime(out.time), service: serviceTitle(), name: data.name };
      $('#doneText').textContent = fmt(t('booking.doneText'), vars);
      $('#doneWa').href = waLink(fmt(t('booking.waMsg'), vars));
      form.reset();
      showStep(4);
    } catch {
      err.textContent = t('err.generic');
    } finally {
      btn.disabled = false;
      btn.textContent = t('booking.confirm');
    }
  });

  $('#newBooking').addEventListener('click', () => {
    booking.time = null;
    $('#toStep3').disabled = true;
    if (booking.date) loadSlots(booking.date);
    showStep(1);
  });

  /* ---------------- UI niceties ---------------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('#nav a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
        $$('[data-count]', en.target).forEach(countUp);
      }), { threshold: 0.15 })
    : null;
  $$('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

  function countUp(el) {
    const target = Number(el.dataset.count);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 1400);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  $('#year').textContent = new Date().getFullYear();

  /* ---------------- boot ---------------- */
  applyLang();
  api.site()
    .then((r) => r.json())
    .then((data) => {
      if (data.error) throw new Error(data.error);
      site = data;
      render();
    })
    .catch(() => console.error('Could not load site data'));
})();
