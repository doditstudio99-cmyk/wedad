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
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(c));
    return el;
  };

  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const CATS = [['doctors', 'دكاترة'], ['lawyers', 'محامين'], ['teachers', 'مدرسين'], ['realestate', 'عقارات'], ['business', 'أصحاب أعمال'], ['other', 'أخرى']];
  const CAT_LABEL = Object.fromEntries(CATS);
  const STATUS = [['pending', 'في الانتظار'], ['confirmed', 'مؤكد'], ['done', 'تم التصوير'], ['cancelled', 'ملغي']];
  const STATUS_LABEL = Object.fromEntries(STATUS);
  const ICONS = { reels: '🎬', board: '📊', combo: '🚀', camera: '📷', star: '⭐' };
  const ERRORS = {
    wrong_password: 'كلمة السر غلط',
    too_short: 'كلمة السر لازم تكون ٦ حروف على الأقل',
    slot_taken: 'المعاد ده محجوز بالفعل',
    invalid_slot: 'اختار يوم وساعة صحيحين',
    file_too_large: 'الملف أكبر من المسموح (200MB)',
    unsupported_file: 'نوع الملف مش مدعوم (صور JPG/PNG/WEBP أو فيديو MP4/MOV/WEBM)',
    too_many_requests: 'محاولات كتير، استنى شوية وجرب تاني',
  };

  let data = null;

  /* ---------------- helpers ---------------- */
  async function api(path, opts = {}) {
    const res = await fetch('/api/admin' + path, {
      method: opts.method || 'GET',
      headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
      body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/login') { showLogin(); throw new Error('unauthorized'); }
    if (!res.ok) throw new Error(ERRORS[out.error] || out.error || 'حصلت مشكلة');
    return out;
  }

  let toastTimer;
  function toast(msg, err) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = 'toast'), 2600);
  }

  const fmtTime = (time) => {
    let [hh, mm] = time.split(':').map(Number);
    const s = hh >= 12 ? 'م' : 'ص';
    hh = hh % 12 || 12;
    return `${hh}:${String(mm).padStart(2, '0')} ${s}`;
  };
  const fmtDate = (date) => {
    const d = new Date(date + 'T00:00:00Z');
    return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  };
  const todayStr = () => {
    const tz = (data && data.settings.timezone) || 'Africa/Cairo';
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  };

  /* ---------------- auth ---------------- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    try {
      await api('/login', { method: 'POST', body: { password: e.target.password.value } });
      e.target.reset();
      await boot();
    } catch (err) {
      $('#loginError').textContent = err.message;
    }
  });

  $('#logout').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  /* ---------------- tabs ---------------- */
  $$('#tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
      $$('.tab').forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
      try { sessionStorage.setItem('dodit_tab', b.dataset.tab); } catch { /* ignore */ }
    })
  );

  async function reload() {
    data = await api('/data');
    renderBookings();
    renderSchedule();
    for (const name of Object.keys(COLLECTIONS)) renderCollection(name);
    renderSettings();
  }

  /* ---------------- bookings ---------------- */
  let bookingFilter = 'upcoming';
  $$('#bookingFilter button').forEach((b) =>
    b.addEventListener('click', () => {
      bookingFilter = b.dataset.f;
      $$('#bookingFilter button').forEach((x) => x.classList.toggle('active', x === b));
      renderBookings();
    })
  );
  $('#bookingSearch').addEventListener('input', () => renderBookings());

  function renderBookings() {
    const today = todayStr();
    const q = $('#bookingSearch').value.trim().toLowerCase();
    let list = [...data.bookings];
    if (bookingFilter === 'upcoming') list = list.filter((b) => b.date >= today && b.status !== 'cancelled');
    if (bookingFilter === 'today') list = list.filter((b) => b.date === today);
    if (bookingFilter === 'pending') list = list.filter((b) => b.status === 'pending');
    if (bookingFilter === 'past') list = list.filter((b) => b.date < today);
    if (q) list = list.filter((b) => [b.name, b.phone, b.ref].join(' ').toLowerCase().includes(q));
    const desc = bookingFilter === 'past' || bookingFilter === 'all';
    list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) * (desc ? -1 : 1));

    const pending = data.bookings.filter((b) => b.status === 'pending' && b.date >= today).length;
    $('#pendingCount').textContent = pending || '';

    const box = $('#bookingsList');
    if (!list.length) return box.replaceChildren(h('div', { class: 'empty', text: 'مفيش حجوزات هنا.' }));
    box.replaceChildren(
      ...list.map((b) => {
        const phoneDigits = (b.phone || '').replace(/\D/g, '');
        const waNumber = phoneDigits.startsWith('0') ? '2' + phoneDigits : phoneDigits; // Egyptian local → international
        const msg = `أهلاً ${b.name}، معاك Dodit Studio 👋\nبنأكد حجزك يوم ${fmtDate(b.date)} الساعة ${fmtTime(b.time)}.\nرقم الحجز: ${b.ref}`;
        return h('div', { class: 'card' + (b.status === 'cancelled' ? ' dim' : '') },
          h('div', { class: 'when' }, fmtTime(b.time), h('small', { text: fmtDate(b.date) })),
          h('div', { class: 'main-info' },
            h('b', { text: b.name }), ' ',
            h('span', { class: 'badge st-' + b.status, text: STATUS_LABEL[b.status] }),
            h('div', { class: 'meta' },
              b.phone ? h('a', { class: 'wa', href: `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, target: '_blank', dir: 'ltr', text: '💬 ' + b.phone }) : null,
              h('span', { text: '💼 ' + ((b.serviceTitle && b.serviceTitle.ar) || '—') }),
              b.category ? h('span', { text: '🏷️ ' + (CAT_LABEL[b.category] || b.category) }) : null,
              h('span', { text: '#' + b.ref }),
              h('span', { text: b.source === 'admin' ? '✍️ يدوي' : '🌐 من الموقع' })
            ),
            b.notes ? h('div', { class: 'notes', text: b.notes }) : null
          ),
          h('div', { class: 'actions' },
            h('select', {
              onchange: async (e) => {
                try { await api('/bookings/' + b.id, { method: 'PATCH', body: { status: e.target.value } }); toast('تم التحديث'); await reload(); }
                catch (err) { toast(err.message, true); e.target.value = b.status; }
              },
            }, STATUS.map(([v, l]) => h('option', { value: v, selected: v === b.status, text: l }))),
            h('button', {
              class: 'btn danger sm', text: 'حذف',
              onclick: async () => {
                if (!confirm(`حذف حجز ${b.name} نهائياً؟`)) return;
                await api('/bookings/' + b.id, { method: 'DELETE' });
                toast('تم الحذف');
                await reload();
              },
            })
          )
        );
      })
    );
  }

  $('#addBookingBtn').addEventListener('click', () => {
    const body = [
      h('div', { class: 'grid2' },
        h('label', {}, 'اليوم', h('input', { type: 'date', name: 'date', required: true, value: todayStr(), onchange: (e) => loadSlotOptions(e.target.value) })),
        h('label', {}, 'الساعة', h('select', { name: 'time', required: true, id: 'slotSelect' }))
      ),
      h('label', {}, 'الخدمة', h('select', { name: 'serviceId' }, h('option', { value: '', text: '—' }), data.services.map((s) => h('option', { value: s.id, text: s.title.ar })))),
      h('div', { class: 'grid2' },
        h('label', {}, 'الاسم', h('input', { name: 'name', placeholder: 'مثلاً: د. أحمد — أو "مقفول"' })),
        h('label', {}, 'الموبايل', h('input', { name: 'phone', dir: 'ltr' }))
      ),
      h('label', {}, 'المجال', h('select', { name: 'category' }, h('option', { value: '', text: '—' }), CATS.map(([v, l]) => h('option', { value: v, text: l })))),
      h('label', {}, 'ملاحظات', h('textarea', { name: 'notes', rows: 2 })),
      h('p', { class: 'muted', style: 'color:var(--muted);margin:0', text: 'استخدمها لتسجيل حجز جالك بالتليفون/واتساب، أو لقفل معاد معين عشان ميتحجزش من الموقع.' }),
    ];
    openModal('حجز يدوي / قفل معاد', body, async (form) => {
      const v = Object.fromEntries(new FormData(form));
      if (!v.time) throw new Error('اختار ساعة متاحة');
      await api('/bookings', { method: 'POST', body: v });
      toast('تم تسجيل الحجز');
      await reload();
    });
    loadSlotOptions(todayStr());
  });

  async function loadSlotOptions(date) {
    const sel = $('#slotSelect');
    if (!sel) return;
    sel.replaceChildren(h('option', { value: '', text: '…' }));
    try {
      const r = await api('/slots?date=' + date);
      const avail = r.slots.filter((s) => s.status === 'available');
      if (!r.open) sel.replaceChildren(h('option', { value: '', text: 'اليوم ده مقفول' }));
      else if (!avail.length) sel.replaceChildren(h('option', { value: '', text: 'مفيش مواعيد متاحة' }));
      else sel.replaceChildren(...avail.map((s) => h('option', { value: s.time, text: fmtTime(s.time) })));
    } catch (err) {
      sel.replaceChildren(h('option', { value: '', text: err.message }));
    }
  }

  /* ---------------- schedule ---------------- */
  let closedDates = [];
  function renderSchedule() {
    const s = data.schedule;
    const form = $('#scheduleForm');
    form.slotMinutes.value = s.slotMinutes;
    form.minNoticeMinutes.value = s.minNoticeMinutes;
    form.maxDaysAhead.value = s.maxDaysAhead;
    // show the week starting Saturday
    const order = [6, 0, 1, 2, 3, 4, 5];
    $('#daysEditor').replaceChildren(
      ...order.map((i) => {
        const d = s.days[i];
        const row = h('div', { class: 'day-row' + (d.open ? '' : ' off'), 'data-day': i },
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', name: 'open', checked: d.open, onchange: (e) => row.classList.toggle('off', !e.target.checked) }), DAYS[i]),
          h('label', {}, h('small', { text: 'من' }), h('input', { type: 'time', name: 'start', value: d.start, step: 900 })),
          h('label', {}, h('small', { text: 'إلى' }), h('input', { type: 'time', name: 'end', value: d.end, step: 900 }))
        );
        return row;
      })
    );
    closedDates = [...(s.closedDates || [])];
    renderClosed();
  }
  function renderClosed() {
    $('#closedDates').replaceChildren(
      ...(closedDates.length
        ? closedDates.map((d) => h('span', { class: 'chip' }, d, h('button', { type: 'button', text: '×', onclick: () => { closedDates = closedDates.filter((x) => x !== d); renderClosed(); } })))
        : [h('small', { style: 'color:var(--muted)', text: 'مفيش أيام إجازة مضافة.' })])
    );
  }
  $('#addClosedDate').addEventListener('click', () => {
    const v = $('#closedDateInput').value;
    if (v && !closedDates.includes(v)) closedDates.push(v);
    closedDates.sort();
    renderClosed();
  });
  $('#scheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const days = {};
    $$('.day-row', form).forEach((row) => {
      days[row.dataset.day] = { open: $('[name=open]', row).checked, start: $('[name=start]', row).value, end: $('[name=end]', row).value };
    });
    try {
      data.schedule = await api('/schedule', {
        method: 'PUT',
        body: { days, slotMinutes: form.slotMinutes.value, minNoticeMinutes: form.minNoticeMinutes.value, maxDaysAhead: form.maxDaysAhead.value, closedDates },
      });
      renderSchedule();
      toast('تم حفظ المواعيد ✓');
    } catch (err) { toast(err.message, true); }
  });

  /* ---------------- generic fields ---------------- */
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  function field(f, value) {
    switch (f.type) {
      case 'bi':
      case 'biText':
      case 'biList': {
        const tag = f.type === 'bi' ? 'input' : 'textarea';
        const mk = (lng, label) => {
          let v = (value && value[lng]) || '';
          if (f.type === 'biList') v = (Array.isArray(v) ? v : []).join('\n');
          const el = h(tag, { name: `${f.key}.${lng}`, dir: lng === 'ar' ? 'rtl' : 'ltr', rows: f.rows || 3, 'data-kind': f.type });
          el.value = v;
          return h('label', {}, h('small', { text: label }), el);
        };
        return h('div', {}, h('label', { text: f.label + (f.type === 'biList' ? ' (كل سطر = نقطة)' : '') }),
          h('div', { class: 'grid2' }, mk('ar', 'عربي'), mk('en', 'English')));
      }
      case 'select':
        return h('label', {}, f.label, h('select', { name: f.key }, f.options.map(([v, l]) => h('option', { value: v, text: l, selected: v === value }))));
      case 'check':
        return h('label', { class: 'check' }, h('input', { type: 'checkbox', name: f.key, checked: value !== false && (value || f.default) }), f.label);
      case 'media': {
        const input = h('input', { type: 'text', name: f.key, dir: 'ltr', placeholder: f.placeholder || 'https://… أو ارفع ملف' });
        input.value = value || '';
        const status = h('span', { class: 'progress' });
        const file = h('input', { type: 'file', accept: f.accept || 'image/*,video/*', hidden: true, onchange: async (e) => {
          const fl = e.target.files[0];
          if (!fl) return;
          status.textContent = 'جاري الرفع…';
          const fd = new FormData();
          fd.append('file', fl);
          try {
            const r = await api('/upload', { method: 'POST', body: fd });
            input.value = r.url;
            status.textContent = '✓ تم الرفع';
            if (f.onUpload) f.onUpload(r, input.form);
          } catch (err) { status.textContent = ''; toast(err.message, true); }
          e.target.value = '';
        } });
        return h('label', {}, f.label, f.hint ? h('small', { text: f.hint }) : null,
          h('div', { class: 'upload' }, input, h('button', { type: 'button', class: 'btn ghost sm', text: '⬆ رفع ملف', onclick: () => file.click() }), status, file));
      }
      default: {
        const el = h('input', { type: f.type || 'text', name: f.key, dir: f.dir || null, placeholder: f.placeholder || null, min: f.min, max: f.max });
        el.value = value ?? '';
        return h('label', {}, f.label, f.hint ? h('small', { text: f.hint }) : null, el);
      }
    }
  }

  function collect(form, fields) {
    const out = {};
    const set = (path, v) => {
      const keys = path.split('.');
      let o = out;
      keys.slice(0, -1).forEach((k) => (o = o[k] = o[k] || {}));
      o[keys.at(-1)] = v;
    };
    for (const f of fields) {
      if (f.type === 'bi' || f.type === 'biText' || f.type === 'biList') {
        for (const lng of ['ar', 'en']) {
          const v = form.elements[`${f.key}.${lng}`].value;
          set(`${f.key}.${lng}`, f.type === 'biList' ? v.split('\n').map((x) => x.trim()).filter(Boolean) : v);
        }
      } else if (f.type === 'check') set(f.key, form.elements[f.key].checked);
      else set(f.key, form.elements[f.key].value);
    }
    return out;
  }

  /* ---------------- modal ---------------- */
  let modalSubmit = null;
  function openModal(title, body, onSubmit) {
    $('#modalTitle').textContent = title;
    $('#modalBody').replaceChildren(...body);
    $('#modalError').textContent = '';
    modalSubmit = onSubmit;
    $('#modal').hidden = false;
  }
  function closeModal() { $('#modal').hidden = true; $('#modalBody').replaceChildren(); }
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  $('#modalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true;
    try { await modalSubmit(e.target); closeModal(); }
    catch (err) { $('#modalError').textContent = err.message; }
    finally { btn.disabled = false; }
  });

  /* ---------------- collections ---------------- */
  const COLLECTIONS = {
    services: {
      label: 'خدمة',
      fields: [
        { key: 'title', label: 'اسم الخدمة', type: 'bi' },
        { key: 'description', label: 'الوصف', type: 'biText', rows: 2 },
        { key: 'price', label: 'السعر', hint: 'رقم فقط (مثلاً 2500) — أو اكتب "حسب الطلب"' },
        { key: 'priceNote', label: 'وحدة السعر (مثلاً: ٤ ريلز / شهرياً)', type: 'bi' },
        { key: 'features', label: 'المميزات', type: 'biList', rows: 4 },
        { key: 'icon', label: 'الأيقونة', type: 'select', options: [['reels', '🎬 ريلز'], ['board', '📊 سمارت بورد'], ['combo', '🚀 باقة'], ['camera', '📷 كاميرا'], ['star', '⭐ نجمة']] },
        { key: 'featured', label: 'تمييزها كـ "الأكثر طلباً"', type: 'check' },
        { key: 'visible', label: 'ظاهرة في الموقع', type: 'check', default: true },
      ],
      card: (s) => [
        h('div', { class: 'when', style: 'font-size:1.6rem', text: ICONS[s.icon] || '🎬' }),
        h('div', { class: 'main-info' },
          h('b', { text: s.title.ar }), s.featured ? h('span', { class: 'badge st-pending', text: ' الأكثر طلباً' }) : null,
          h('div', { class: 'meta' }, h('span', { text: `💰 ${s.price} ${data.settings.currency.ar} ${s.priceNote.ar ? '/ ' + s.priceNote.ar : ''}` }), h('span', { text: s.title.en })))
      ],
    },
    portfolio: {
      label: 'عمل',
      fields: [
        { key: 'title', label: 'العنوان', type: 'bi' },
        { key: 'category', label: 'المجال', type: 'select', options: CATS },
        { key: 'type', label: 'النوع', type: 'select', options: [['video', '🎥 فيديو (مرفوع)'], ['image', '🖼️ صورة'], ['link', '🔗 لينك خارجي (إنستجرام/تيك توك/يوتيوب)']] },
        { key: 'url', label: 'الملف أو اللينك', type: 'media', hint: 'ارفع فيديو/صورة، أو الصق لينك الريل', onUpload: (r, form) => { if (form && form.elements.type) form.elements.type.value = r.type === 'video' ? 'video' : 'image'; } },
        { key: 'thumb', label: 'صورة الغلاف (اختياري)', type: 'media', accept: 'image/*', hint: 'مهمة للينكات الخارجية — بتظهر في الكارت' },
        { key: 'visible', label: 'ظاهر في الموقع', type: 'check', default: true },
      ],
      thumbs: true,
      card: (p) => {
        let media = h('span', { text: '🎬' });
        if (p.thumb || (p.type === 'image' && p.url)) media = h('img', { src: p.thumb || p.url, alt: '' });
        else if (p.type === 'video' && p.url) media = h('video', { src: p.url + '#t=0.5', muted: true, preload: 'metadata' });
        return [
          h('div', { class: 'thumb' }, media),
          h('div', {}, h('b', { text: p.title.ar || '—' }), h('div', { class: 'meta' }, h('span', { text: CAT_LABEL[p.category] }), h('span', { text: { video: '🎥', image: '🖼️', link: '🔗' }[p.type] }), !p.url ? h('span', { style: 'color:var(--red)', text: 'بدون ملف' }) : null)),
        ];
      },
    },
    testimonials: {
      label: 'رأي',
      fields: [
        { key: 'name', label: 'اسم العميل' },
        { key: 'role', label: 'الوظيفة / المجال', type: 'bi' },
        { key: 'text', label: 'الرأي', type: 'biText', rows: 3 },
        { key: 'rating', label: 'التقييم', type: 'select', options: [['5', '★★★★★'], ['4', '★★★★'], ['3', '★★★'], ['2', '★★'], ['1', '★']] },
        { key: 'visible', label: 'ظاهر في الموقع', type: 'check', default: true },
      ],
      card: (r) => [
        h('div', { class: 'when', text: '★'.repeat(r.rating) }),
        h('div', { class: 'main-info' }, h('b', { text: r.name }), h('div', { class: 'meta' }, h('span', { text: r.role.ar })), h('div', { class: 'notes', text: r.text.ar })),
      ],
    },
  };

  function editItem(name, item) {
    const c = COLLECTIONS[name];
    const body = c.fields.map((f) => field(f, item ? (f.key === 'rating' ? String(item.rating) : get(item, f.key)) : f.default));
    openModal((item ? 'تعديل ' : 'إضافة ') + c.label, body, async (form) => {
      const v = collect(form, c.fields);
      if (item) await api(`/${name}/${item.id}`, { method: 'PUT', body: v });
      else await api(`/${name}`, { method: 'POST', body: v });
      toast('تم الحفظ ✓');
      await reload();
    });
  }

  $$('[data-add]').forEach((b) => b.addEventListener('click', () => editItem(b.dataset.add)));

  function renderCollection(name) {
    const c = COLLECTIONS[name];
    const box = $(`[data-list="${name}"]`);
    const list = data[name];
    if (!list.length) return box.replaceChildren(h('div', { class: 'empty', text: 'لسه مفيش حاجة هنا — اضغط على زرار الإضافة.' }));
    box.replaceChildren(
      ...list.map((item, i) =>
        h('div', { class: 'card' + (c.thumbs ? ' thumb-card' : '') + (item.visible === false ? ' dim' : '') },
          ...c.card(item),
          h('div', { class: 'actions' },
            h('button', { class: 'btn ghost sm', text: '✏️ تعديل', onclick: () => editItem(name, item) }),
            h('button', { class: 'btn ghost sm', text: c.thumbs ? '→' : '↑', title: 'تقديم', disabled: i === 0, onclick: () => move(name, item, 'up') }),
            h('button', { class: 'btn ghost sm', text: c.thumbs ? '←' : '↓', title: 'تأخير', disabled: i === list.length - 1, onclick: () => move(name, item, 'down') }),
            h('button', { class: 'btn danger sm', text: 'حذف', onclick: async () => {
              if (!confirm('متأكد من الحذف؟')) return;
              await api(`/${name}/${item.id}`, { method: 'DELETE' });
              toast('تم الحذف');
              await reload();
            } })
          )
        )
      )
    );
  }
  async function move(name, item, dir) {
    await api(`/${name}/${item.id}/move`, { method: 'POST', body: { dir } });
    await reload();
  }

  /* ---------------- settings ---------------- */
  const SETTINGS_FIELDS = [
    { section: 'نصوص الموقع' },
    { key: 'studioName', label: 'اسم الاستوديو' },
    { key: 'tagline', label: 'الشعار الصغير فوق العنوان', type: 'bi' },
    { key: 'heroTitle', label: 'العنوان الرئيسي', type: 'bi' },
    { key: 'heroSubtitle', label: 'الوصف تحت العنوان', type: 'biText', rows: 3 },
    { key: 'about', label: 'من نحن', type: 'biText', rows: 5 },
    { key: 'heroVideo', label: 'فيديو داخل الموبايل في أول الصفحة (اختياري)', type: 'media', accept: 'video/*', hint: 'ريل قصير MP4 بيشتغل تلقائي بدون صوت' },
    { section: 'بيانات التواصل' },
    { key: 'whatsapp', label: 'رقم الواتساب (بالصيغة الدولية بدون +)', placeholder: '201xxxxxxxxx', dir: 'ltr', hint: 'مثال: 201012345678' },
    { key: 'phone', label: 'رقم التليفون اللي يظهر', dir: 'ltr' },
    { key: 'email', label: 'الإيميل', dir: 'ltr', type: 'email' },
    { key: 'address', label: 'العنوان', type: 'bi' },
    { key: 'mapQuery', label: 'مكان الخريطة', hint: 'اكتب العنوان بالتفصيل، أو اسم المكان على جوجل ماب، أو الإحداثيات (مثلاً 30.0444,31.2357)' },
    { key: 'workingHoursNote', label: 'نص أيام العمل', type: 'bi' },
    { key: 'currency', label: 'العملة', type: 'bi' },
    { section: 'السوشيال ميديا (سيب الخانة فاضية لو مش عايزها تظهر)' },
    { key: 'social.instagram', label: 'Instagram', dir: 'ltr', placeholder: 'https://instagram.com/…' },
    { key: 'social.facebook', label: 'Facebook', dir: 'ltr', placeholder: 'https://facebook.com/…' },
    { key: 'social.tiktok', label: 'TikTok', dir: 'ltr', placeholder: 'https://tiktok.com/@…' },
    { key: 'social.youtube', label: 'YouTube', dir: 'ltr' },
    { key: 'social.snapchat', label: 'Snapchat', dir: 'ltr' },
    { key: 'social.x', label: 'X (Twitter)', dir: 'ltr' },
    { key: 'social.linkedin', label: 'LinkedIn', dir: 'ltr' },
  ];
  function renderSettings() {
    const form = $('#settingsForm');
    form.replaceChildren(
      ...SETTINGS_FIELDS.map((f) => (f.section ? h('h3', { text: f.section }) : field(f, get(data.settings, f.key)))),
      h('div', { class: 'save-bar' }, h('button', { class: 'btn primary', type: 'submit', text: 'حفظ الإعدادات' }))
    );
  }
  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const v = collect(e.target, SETTINGS_FIELDS.filter((f) => f.key));
      data.settings = await api('/settings', { method: 'PUT', body: { ...data.settings, ...v, timezone: data.settings.timezone } });
      renderSettings();
      toast('تم حفظ الإعدادات ✓');
    } catch (err) { toast(err.message, true); }
  });

  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/password', { method: 'POST', body: { current: e.target.current.value, next: e.target.next.value } });
      e.target.reset();
      toast('تم تغيير كلمة السر ✓');
    } catch (err) { toast(err.message, true); }
  });

  /* ---------------- boot ---------------- */
  async function boot() {
    try {
      await api('/me');
    } catch { return showLogin(); }
    $('#login').hidden = true;
    $('#app').hidden = false;
    await reload();
    let tab = 'bookings';
    try { tab = sessionStorage.getItem('dodit_tab') || tab; } catch { /* ignore */ }
    const btn = $(`#tabs [data-tab="${tab}"]`);
    if (btn) btn.click();
  }
  boot();
  // Refresh only the bookings list every minute, so open forms never lose unsaved edits
  setInterval(async () => {
    if ($('#app').hidden) return;
    try {
      const fresh = await api('/data');
      data.bookings = fresh.bookings;
      renderBookings();
    } catch { /* ignore */ }
  }, 60000);
})();
