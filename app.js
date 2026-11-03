/* ellenial quiz
   A quiz to play together: on one shared screen, or with everyone answering on their own phone.
   No accounts, no database. Phones talk to the shared screen through Supabase Realtime broadcast
   (messages pass through, nothing is stored), and every message is encrypted with a key that only
   lives in the join link after '#'. Own quizzes stay on this phone, or travel inside a share link. */
(function () {
  'use strict';

  var CONFIG = {
    supabaseUrl: 'https://knvrvmqdxvcatsrvkrgx.supabase.co',
    // Public by design: it can only open Realtime broadcast channels. Same project as Split and Gillefeeling.
    supabaseKey: 'sb_publishable_5e3mg1E-r-P_to34ONwRfw_FQYUwy3z',
    origin: 'https://quiz.ellenial.app'
  };
  var LIMITS = { players: 80, name: 24, quizName: 60, questions: 50, prompt: 200, option: 80, options: 6, explain: 300 };
  // Team fills from the one Ellenial palette (Periwinkle, Lavender, Card). Teams are always named,
  // so the colour is only a helper, never the meaning.
  var TEAM_COLORS = ['var(--peri)', 'var(--soft)', 'var(--surface)'];
  var LETTERS = 'ABCDEF';
  var TEAM_IDEAS = ['Forsen', 'Biflödet', 'Kanalen', 'Källan', 'Jokken', 'Strömmen'];

  var app = document.getElementById('app');
  var state = { view: 'home' };
  var builtIn = [];
  var timerHandle = null;
  var wakeLock = null;

  /* ---------------- small helpers ---------------- */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  var ICONS = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    screen: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7h-3"/><rect x="7" y="14" width="10" height="7" rx="1"/>'
  };
  function icon(name, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', size || 18); s.setAttribute('height', size || 18);
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name];
    return s;
  }
  function clean(s, max) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function session(key, val) {
    try {
      if (val === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function isLocalDemo() {
    return (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && /[?&]local\b/.test(location.search);
  }
  function shareOrigin() {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /\.ellenial\.app$/.test(location.hostname)) return location.origin;
    return CONFIG.origin;
  }
  function keepAwake() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l; l.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && (state.view === 'host' || state.view === 'player')) keepAwake();
  });

  /* ---------------- theme ---------------- */

  // Auto / Ljust / Mörkt with the shared Ellenial switch (ellenial-theme.js, same as ellenial maps).
  // The choice is saved on this device only. Auto follows the phone.
  function migrateTheme() {
    var old = store('eq:theme');   // the v1 moon button
    if (old === 'dark' || old === 'light') { if (window.EllenialTheme && EllenialTheme.get() === 'auto') EllenialTheme.set(old); }
    if (old !== null) store('eq:theme', null);
  }
  function themeButton() {
    if (!window.EllenialTheme) return null;
    return EllenialTheme.control({ label: 'Tema', labels: { auto: 'Auto', light: 'Ljust', dark: 'Mörkt' } });
  }

  /* ---------------- base64url + crypto (the only crypto in this app) ---------------- */

  function toB64u(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64u(s) {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
    try {
      var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch (e) { return null; }
  }
  function randomB64u(n) { return toB64u(crypto.getRandomValues(new Uint8Array(n))); }
  var enc = new TextEncoder(), dec = new TextDecoder();

  // Room = 16-byte id + 32-byte secret. Both travel only after '#', so no server ever sees them.
  function roomKey(roomId, secret) {
    var raw = fromB64u(secret);
    if (!raw || raw.length !== 32) return Promise.reject(new Error('bad_secret'));
    return crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('eq1|' + roomId), info: enc.encode('eq1|room-enc') },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function seal(key, roomId, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: enc.encode('eq1|' + roomId) }, key, enc.encode(JSON.stringify(obj)))
      .then(function (ct) {
        var c = new Uint8Array(ct), out = new Uint8Array(12 + c.length);
        out.set(iv); out.set(c, 12);
        return '1.' + toB64u(out);
      });
  }
  function open(key, roomId, blob) {
    if (typeof blob !== 'string' || blob.slice(0, 2) !== '1.' || blob.length > 200000) return Promise.resolve(null);
    var bytes = fromB64u(blob.slice(2));
    if (!bytes || bytes.length < 29) return Promise.resolve(null);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: enc.encode('eq1|' + roomId) }, key, bytes.slice(12))
      .then(function (p) { return JSON.parse(dec.decode(p)); })
      .catch(function () { return null; });
  }

  /* ---------------- the live connection ---------------- */

  var sbClient = null;
  function connect(roomId, secret, onMessage, onStatus) {
    var closed = false, key = null, chan = null, bc = null;
    var ready = roomKey(roomId, secret).then(function (k) { key = k; });

    function deliver(payload) {
      if (closed || !key || !payload) return;
      open(key, roomId, payload.b).then(function (msg) { if (msg && !closed) onMessage(msg); });
    }
    ready.then(function () {
      if (closed) return;
      if (isLocalDemo()) {
        // Development only: tabs on localhost talk through BroadcastChannel instead of Supabase.
        bc = new BroadcastChannel('quiz:' + roomId);
        bc.onmessage = function (e) { deliver(e.data); };
        onStatus(true);
        return;
      }
      if (!sbClient) {
        sbClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
      }
      chan = sbClient.channel('quiz:' + roomId, { config: { broadcast: { self: false, ack: false } } });
      chan.on('broadcast', { event: 'm' }, function (e) { deliver(e.payload); });
      chan.subscribe(function (status) { if (!closed) onStatus(status === 'SUBSCRIBED'); });
    }).catch(function () { onStatus(false); });

    return {
      send: function (obj) {
        return ready.then(function () {
          if (closed) return;
          return seal(key, roomId, obj).then(function (b) {
            if (bc) bc.postMessage({ b: b });
            else if (chan) chan.send({ type: 'broadcast', event: 'm', payload: { b: b } });
          });
        }).catch(function () {});
      },
      close: function () {
        closed = true;
        if (bc) bc.close();
        if (chan && sbClient) sbClient.removeChannel(chan);
      }
    };
  }
  function joinLink(roomId, secret) { return shareOrigin() + '/join#' + roomId + '.' + secret; }
  function readRoomRef(text) {
    var t = text || '';
    try { t = decodeURIComponent(t); } catch (e) { /* keep */ }
    var m = t.match(/([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/);
    if (!m) return null;
    var id = fromB64u(m[1]), sec = fromB64u(m[2]);
    return id && id.length === 16 && sec && sec.length === 32 ? { roomId: m[1], secret: m[2] } : null;
  }

  /* ---------------- quizzes: validation, own quizzes, share links ---------------- */

  // Everything that comes from a file, this phone's storage or a link is checked here first.
  function cleanQuestion(q) {
    if (!q || typeof q !== 'object') return null;
    var out = { type: q.type, prompt: clean(q.prompt, LIMITS.prompt) };
    if (!out.prompt) return null;
    var ex = clean(q.explain, LIMITS.explain);
    if (ex) out.explain = ex;
    if (q.type === 'mc') {
      if (!Array.isArray(q.options)) return null;
      out.options = q.options.slice(0, LIMITS.options).map(function (o) { return clean(o, LIMITS.option); }).filter(Boolean);
      if (out.options.length < 2) return null;
      var a = Number(q.answer);
      if (!(a >= 0 && a < out.options.length && Math.floor(a) === a)) return null;
      out.answer = a;
    } else if (q.type === 'tf') {
      if (typeof q.answer !== 'boolean') return null;
      out.answer = q.answer;
    } else if (q.type === 'sort') {
      if (!Array.isArray(q.items)) return null;
      out.items = q.items.slice(0, LIMITS.options).map(function (o) { return clean(o, LIMITS.option); }).filter(Boolean);
      if (out.items.length < 3) return null;
      if (Array.isArray(q.notes) && q.notes.length === out.items.length) out.notes = q.notes.map(function (n) { return clean(n, 120); });
      if (q.visual === 'grow') out.visual = 'grow';
      // Creator's choice: a fixed display order (fixed[k] = index of the item shown as letter k),
      // same on screen and on paper. Without it the screen mixes every game.
      if (Array.isArray(q.fixed) && q.fixed.length === q.items.length && isPerm(q.fixed, q.items.length)) out.fixed = q.fixed.slice();
    } else return null;
    return out;
  }
  function isPerm(arr, n) {
    var seen = {};
    return arr.every(function (v) { return Math.floor(v) === v && v >= 0 && v < n && !seen[v] && (seen[v] = true); });
  }
  function cleanQuiz(q) {
    if (!q || typeof q !== 'object' || !Array.isArray(q.questions)) return null;
    var out = { name: clean(q.name, LIMITS.quizName) || 'Mitt quiz', questions: [] };
    if (q.intro) out.intro = clean(q.intro, 200);
    q.questions.slice(0, LIMITS.questions).forEach(function (x) { var c = cleanQuestion(x); if (c) out.questions.push(c); });
    if (!out.questions.length) return null;
    if (q.bonus && Array.isArray(q.bonus.questions)) {
      var b = { name: clean(q.bonus.name, LIMITS.quizName) || 'Bonusrunda', intro: clean(q.bonus.intro, 200), questions: [] };
      q.bonus.questions.slice(0, 20).forEach(function (x) { var c = cleanQuestion(x); if (c) b.questions.push(c); });
      if (b.questions.length) out.bonus = b;
    }
    return out;
  }
  function myQuizzes() {
    var list = store('eq:quizzes');
    return Array.isArray(list) ? list.filter(function (x) { return x && x.id && x.quiz; }) : [];
  }
  function saveMyQuizzes(list) { store('eq:quizzes', list); }
  function upsertMyQuiz(entry) {
    var list = myQuizzes(), i = list.findIndex(function (x) { return x.id === entry.id; });
    if (i >= 0) list[i] = entry; else list.unshift(entry);
    saveMyQuizzes(list);
  }

  function packQuiz(quiz) {
    var json = JSON.stringify(quiz);
    if (typeof CompressionStream === 'undefined') return Promise.resolve('j.' + toB64u(enc.encode(json)));
    var stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (buf) { return 'z.' + toB64u(new Uint8Array(buf)); });
  }
  function unpackQuiz(text) {
    var m = (text || '').match(/([jz])\.([A-Za-z0-9_-]+)/);
    if (!m || m[2].length > 60000) return Promise.resolve(null);
    var bytes = fromB64u(m[2]);
    if (!bytes) return Promise.resolve(null);
    var p;
    if (m[1] === 'j') p = Promise.resolve(dec.decode(bytes));
    else if (typeof DecompressionStream === 'undefined') return Promise.resolve(null);
    else p = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    return p.then(function (s) { return s.length > 200000 ? null : cleanQuiz(JSON.parse(s)); }).catch(function () { return null; });
  }
  function shareQuiz(quiz) {
    return packQuiz(quiz).then(function (data) {
      var url = shareOrigin() + '/q#' + data;
      if (navigator.share) {
        return navigator.share({ title: quiz.name, text: 'Ett quiz till dig: ' + quiz.name, url: url })
          .then(function () { return 'shared'; }, function () { return copyText(url); });
      }
      return copyText(url);
    });
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return 'copied'; }, function () { return promptCopy(text); });
    }
    return Promise.resolve(promptCopy(text));
  }
  function promptCopy(text) { window.prompt('Kopiera länken:', text); return 'shown'; }

  /* ---------------- rendering ---------------- */

  function render() {
    stopTimer();
    app.innerHTML = '';
    var v = state.view;
    var el = v === 'home' ? viewHome()
      : v === 'setup' ? viewSetup()
      : v === 'host' ? viewHost()
      : v === 'player' ? viewPlayer()
      : v === 'edit' ? viewEdit()
      : v === 'import' ? viewImport()
      : v === 'privacy' ? viewPrivacy()
      : v === 'print' ? viewPrint()
      : viewHome();
    app.appendChild(el);
    if (v === 'host' || v === 'player') startTimer();
  }
  function go(view, extra) {
    state = Object.assign({ view: view }, extra || {});
    window.scrollTo(0, 0);
    render();
  }
  function brandHead() {
    return h('div', { class: 'bar' },
      h('a', { class: 'brand', href: '/', onclick: function (e) { e.preventDefault(); go('home'); } },
        h('img', { src: '/icons/icon-192.png', alt: '' }), h('span', { text: 'quiz' })),
      themeButton());
  }
  function backHead(title, onBack) {
    return h('div', { class: 'bar' },
      h('div', { class: 'bar-left' },
        h('button', { class: 'round', 'aria-label': 'Tillbaka', onclick: onBack || function () { go('home'); } }, icon('back')),
        h('h1', { text: title })),
      themeButton());
  }

  /* ----- Home ----- */
  function viewHome() {
    var mine = myQuizzes();
    return h('div', { class: 'page' },
      brandHead(),
      h('h1', { class: 'big', text: 'Vad ska vi quizza om idag?' }),
      builtIn.map(function (q, i) {
        var n = q.questions.length;
        return h('div', { class: 'quiz-card' },
          i === 0 ? h('span', { class: 'pill', text: 'Nytt' }) : null,
          h('h2', { text: q.name }),
          q.intro ? h('p', { text: q.intro }) : null,
          h('p', { class: 'small muted', text: plural(n, 'fråga', 'frågor') + (q.bonus ? ' + bonusrunda' : '') }),
          h('button', { class: 'btn block', style: 'margin-top:6px', onclick: function () { openSetup(q); } }, 'Spela'),
          h('button', { class: 'btn soft block', onclick: function () { openPrint(q, function () { go('home'); }); } }, icon('print'), 'Skriv ut'));
      }),
      mine.length ? h('div', { class: 'group' },
        h('h2', { class: 'label', text: 'Mina quiz' }),
        mine.map(function (m) {
          return h('div', { class: 'row-card' },
            h('div', null, h('div', { class: 'name', text: m.quiz.name }), h('div', { class: 'small muted', text: plural(m.quiz.questions.length, 'fråga', 'frågor') })),
            h('div', { class: 'row-actions' },
              h('button', { class: 'round', 'aria-label': 'Skriv ut ' + (m.quiz.name || 'quizet'), title: 'Skriv ut', onclick: function () {
                var c = cleanQuiz(m.quiz); if (c) openPrint(c, function () { go('home'); }); else go('edit', { draft: m });
              } }, icon('print')),
              h('button', { class: 'btn soft', onclick: function () { go('edit', { draft: JSON.parse(JSON.stringify(m)) }); } }, 'Ändra'),
              h('button', { class: 'btn', onclick: function () { var c = cleanQuiz(m.quiz); if (c) openSetup(c); else go('edit', { draft: m }); } }, 'Spela')));
        })) : null,
      h('button', { class: 'btn ghost block', onclick: function () { go('edit', { draft: newDraft() }); } }, icon('plus'), 'Skapa eget quiz'),
      h('p', { class: 'foot' },
        'Inget konto. Inget sparas hos mig.', h('br'),
        'Egna quiz finns bara på den här telefonen eller i länken du delar.', h('br'),
        h('a', { href: '#', onclick: function (e) { e.preventDefault(); go('privacy'); } }, 'Så fungerar det'), ' · ',
        h('a', { href: 'https://ellenial.app', rel: 'noopener' }, 'Ellenial'), ' · ',
        h('a', { href: 'https://github.com/phoenixcyberpunk/ellenial-quiz', rel: 'noopener' }, 'Öppen källkod')));
  }

  function viewPrivacy() {
    return h('div', { class: 'page' },
      backHead('Så fungerar det'),
      h('div', { class: 'group' },
        h('h2', { class: 'label', text: 'Delad skärm' }),
        h('p', { style: 'margin:0', text: 'Allt händer i den här webbläsaren. Inget skickas någonstans.' })),
      h('div', { class: 'group' },
        h('h2', { class: 'label', text: 'Med mobiler' }),
        h('p', { style: 'margin:0', text: 'Mobilerna pratar med den delade skärmen genom Supabase Realtime. Meddelandena passerar bara förbi och sparas inte. De är också krypterade med en nyckel som bara finns i länken efter #, så inte ens servern kan läsa namn eller svar.' }),
        h('p', { style: 'margin:0', text: 'När quizet avslutas eller fliken stängs försvinner allt: namn, svar och poäng.' })),
      h('div', { class: 'group' },
        h('h2', { class: 'label', text: 'Egna quiz' }),
        h('p', { style: 'margin:0', text: 'Sparas bara i den här webbläsaren. När du delar ett quiz ligger hela quizet i länken, efter #, och skickas aldrig till någon server.' })),
      h('div', { class: 'group' },
        h('h2', { class: 'label', text: 'Kostnader' }),
        h('p', { style: 'margin:0', text: 'En statisk sida på Vercel och Supabase gratisnivå, samma som mina andra appar. Alltså nära noll kronor.' })),
      h('p', { class: 'foot', text: 'Gjord av Ellen, en person, med Claude som hjälp med koden. Öppen källkod (AGPL-3.0).' }));
  }

  /* ----- Setup ----- */
  function openSetup(quiz) {
    var last = store('eq:setup') || {};
    go('setup', {
      quiz: quiz,
      setup: {
        mode: last.mode === 'phones' ? 'phones' : 'screen',
        teams: Array.isArray(last.teams) && last.teams.length ? last.teams.slice(0, 6).map(function (t) { return clean(t, LIMITS.name); }).filter(Boolean) : TEAM_IDEAS.slice(0, 2),
        time: [0, 30, 60, 90].indexOf(last.time) >= 0 ? last.time : 60,
        bonus: last.bonus !== false
      }
    });
  }
  function viewSetup() {
    var s = state.setup, quiz = state.quiz;
    function rerender() { render(); }
    function modeBtn(mode, ic, title, desc) {
      return h('button', { class: 'choice', 'aria-pressed': String(s.mode === mode), onclick: function () { s.mode = mode; rerender(); } },
        icon(ic, 24), h('span', null, h('strong', { text: title }), h('span', { text: desc })));
    }
    var teams = s.mode === 'screen' ? h('div', { class: 'group' },
      h('h2', { class: 'label', text: 'Lag' }),
      h('div', { class: 'chips' },
        s.teams.map(function (t, i) {
          return h('span', { class: 'team-chip', style: 'background:' + TEAM_COLORS[i % 3] },
            h('input', { value: t, 'aria-label': 'Lag ' + (i + 1), maxlength: LIMITS.name, size: Math.max(4, t.length),
              oninput: function (e) { s.teams[i] = e.target.value; e.target.size = Math.max(4, e.target.value.length); } }),
            s.teams.length > 1 ? h('button', { 'aria-label': 'Ta bort ' + t, onclick: function () { s.teams.splice(i, 1); rerender(); } }, icon('x', 16)) : null);
        }),
        s.teams.length < 6 ? h('button', { class: 'btn dashed', style: 'min-height:44px;padding:0 14px', onclick: function () {
          var idea = TEAM_IDEAS.find(function (x) { return s.teams.indexOf(x) < 0; }) || ('Lag ' + (s.teams.length + 1));
          s.teams.push(idea); rerender();
        } }, '+ Lag') : null),
      h('p', { class: 'small muted', style: 'margin:0', text: 'Tryck på ett namn för att ändra det. Ni skriver svaren på lapp eller ropar, och på svarsskärmen trycker du på lagen som hade rätt.' })) : null;

    return h('div', { class: 'page' },
      backHead(quiz.name),
      h('div', { class: 'group' },
        h('h2', { class: 'label', text: 'Hur spelar ni?' }),
        modeBtn('screen', 'screen', 'En delad skärm', 'Frågorna på tv:n eller projektorn. Ni svarar i lag, högt eller på lapp.'),
        modeBtn('phones', 'phone', 'Var och en på mobilen', 'Frågorna på den delade skärmen, alla svarar på sin egen mobil via en QR-kod. Poängen räknas automatiskt.')),
      teams,
      h('div', { class: 'group' },
        h('h2', { class: 'label', text: 'Tid per fråga' }),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Tid per fråga' },
          [0, 30, 60, 90].map(function (t) {
            return h('button', { 'aria-pressed': String(s.time === t), onclick: function () { s.time = t; rerender(); } }, t ? t + ' s' : 'Ingen');
          }))),
      quiz.bonus ? h('label', { class: 'toggle' },
        h('span', null, h('strong', { text: quiz.bonus.name }), h('br'), h('span', { class: 'small muted', text: quiz.bonus.intro || plural(quiz.bonus.questions.length, 'fråga', 'frågor') })),
        h('input', { type: 'checkbox', checked: s.bonus, onchange: function (e) { s.bonus = e.target.checked; } })) : null,
      h('button', { class: 'btn block', style: 'margin-top:auto', onclick: startGame }, 'Starta på den delade skärmen'),
      h('p', { class: 'small muted', style: 'margin:0;text-align:center', text: 'Öppna gärna sidan på datorn som är kopplad till tv:n eller projektorn.' }));
  }

  /* ----- Host (shared screen) ----- */
  function startGame() {
    var s = state.setup, quiz = state.quiz;
    s.teams = s.teams.map(function (t) { return clean(t, LIMITS.name); }).filter(Boolean);
    if (!s.teams.length) s.teams = ['Lag 1'];
    store('eq:setup', { mode: s.mode, teams: s.teams, time: s.time, bonus: s.bonus });
    var qs = quiz.questions.map(function (q) { return prepQuestion(q, false); });
    if (s.bonus && quiz.bonus) quiz.bonus.questions.forEach(function (q, i) { qs.push(prepQuestion(q, i === 0 ? 'first' : true)); });
    var g = {
      quiz: quiz, qs: qs, i: -1, mode: s.mode, time: s.time,
      phase: s.mode === 'phones' ? 'lobby' : 'intro',
      teams: s.teams.map(function (t) { return { name: t, score: 0 }; }),
      awards: {}, players: {}, order: [], endsAt: null, locked: false, online: false
    };
    if (s.mode === 'phones') {
      g.roomId = randomB64u(16); g.secret = randomB64u(32);
      g.link = joinLink(g.roomId, g.secret);
      g.conn = connect(g.roomId, g.secret, function (m) { onHostMessage(g, m); }, function (ok) {
        g.online = ok; updateStatus(g); if (ok) broadcast(g);
      });
      g.beat = setInterval(function () { broadcast(g); }, 4000);
    }
    keepAwake();
    go('host', { game: g });
  }
  function prepQuestion(q, bonus) {
    var out = Object.assign({}, q, { bonus: bonus });
    if (q.type === 'sort') {
      var idx = q.items.map(function (_, i) { return i; }), order;
      if (q.fixed) order = q.fixed.slice(); // the creator chose the order: same every game and on paper
      else do { order = shuffle(idx); } while (order.every(function (v, i) { return v === i; }));
      out.shown = order; // shown[k] = index of the item printed as letter k
    }
    return out;
  }
  function publicQuestion(q) {
    var p = { type: q.type, prompt: q.prompt, bonus: !!q.bonus };
    if (q.type === 'mc') p.options = q.options;
    if (q.type === 'sort') p.items = q.shown.map(function (k) { return q.items[k]; });
    return p;
  }
  function correctOf(q) {
    if (q.type === 'sort') return q.items.map(function (_, i) { return q.shown.indexOf(i); }); // letters in right order
    return q.answer;
  }
  function isRight(q, a) {
    if (q.type === 'mc') return a === q.answer;
    if (q.type === 'tf') return a === q.answer;
    if (q.type === 'sort') {
      var c = correctOf(q);
      return Array.isArray(a) && a.length === c.length && a.every(function (v, i) { return v === c[i]; });
    }
    return false;
  }
  function seqText(q) { return correctOf(q).map(function (k) { return LETTERS[k]; }).join(' – '); }

  function onHostMessage(g, m) {
    if (!m || typeof m !== 'object' || typeof m.pid !== 'string' || !/^[A-Za-z0-9_-]{8,24}$/.test(m.pid)) return;
    var p = g.players[m.pid];
    if (m.t === 'hello') {
      var name = clean(m.name, LIMITS.name);
      if (!name) return;
      if (!p) {
        if (g.order.length >= LIMITS.players) return;
        var base = name, n = 2, taken = function (x) { return g.order.some(function (id) { return g.players[id].name === x; }); };
        while (taken(name)) name = base + ' ' + n++;
        g.players[m.pid] = { name: name, score: 0, ans: {} };
        g.order.push(m.pid);
        if (g.phase === 'lobby' && state.view === 'host') render();
        else updateCounts(g);
      }
      broadcast(g);
    } else if (m.t === 'answer' && p) {
      if (m.i !== g.i || g.phase !== 'question' || g.locked) return;
      var q = g.qs[g.i], a = m.a, ok = false;
      if (q.type === 'mc') ok = Number.isInteger(a) && a >= 0 && a < q.options.length;
      else if (q.type === 'tf') ok = typeof a === 'boolean';
      else if (q.type === 'sort') ok = Array.isArray(a) && a.length === q.items.length && a.every(function (v) { return Number.isInteger(v) && v >= 0 && v < q.items.length; }) && new Set(a).size === a.length;
      if (!ok) return;
      p.ans[g.i] = a;
      updateCounts(g);
      broadcast(g);
    }
  }
  function answeredIds(g) { return g.order.filter(function (id) { return g.players[id].ans[g.i] !== undefined; }); }
  function broadcast(g) {
    if (!g.conn || g.ended) return;
    var q = g.qs[g.i];
    var msg = { t: 'state', phase: g.phase, i: g.i, n: g.qs.length, ids: g.order, got: g.phase === 'question' ? answeredIds(g) : [], locked: g.locked };
    if (q && (g.phase === 'question' || g.phase === 'reveal')) msg.q = publicQuestion(q);
    if (g.phase === 'question' && g.endsAt) msg.rem = Math.max(0, g.endsAt - Date.now());
    if (g.phase === 'reveal' || g.phase === 'results') {
      msg.scores = {};
      g.order.forEach(function (id) { var p = g.players[id]; msg.scores[id] = [p.score, g.phase === 'reveal' && q ? (isRight(q, p.ans[g.i]) ? 1 : (p.ans[g.i] === undefined ? -1 : 0)) : 0]; });
    }
    if (g.phase === 'reveal' && q) msg.reveal = { answer: correctOf(q), explain: q.explain || '' };
    if (g.phase === 'results') msg.top = topPlayers(g).map(function (x) { return [x.name, x.score]; });
    g.conn.send(msg);
  }
  function topPlayers(g) {
    var list = g.order.map(function (id) { return g.players[id]; }).filter(function (p) { return p.score > 0; });
    list.sort(function (a, b) { return b.score - a.score; });
    if (!list.length) return [];
    var cut = list[Math.min(2, list.length - 1)].score; // ties for third place all count
    return list.filter(function (p) { return p.score >= cut; }).slice(0, 6);
  }

  function hostNext(g) {
    if (g.i + 1 >= g.qs.length) { g.phase = 'results'; g.endsAt = null; }
    else {
      g.i++; g.phase = 'question'; g.locked = false;
      g.endsAt = g.time ? Date.now() + g.time * 1000 : null;
    }
    render(); broadcast(g);
  }
  function hostReveal(g) {
    var q = g.qs[g.i];
    g.phase = 'reveal'; g.locked = true; g.endsAt = null;
    if (g.mode === 'phones') g.order.forEach(function (id) { var p = g.players[id]; if (isRight(q, p.ans[g.i])) p.score++; });
    render(); broadcast(g);
  }
  function hostEnd(g) {
    g.ended = true;
    if (g.conn) { g.conn.send({ t: 'end' }); setTimeout(function () { g.conn.close(); }, 600); }
    clearInterval(g.beat);
    go('home');
  }
  function hostAgain(g) {
    g.i = -1; g.awards = {}; g.endsAt = null; g.locked = false;
    g.teams.forEach(function (t) { t.score = 0; });
    g.order.forEach(function (id) { g.players[id].score = 0; g.players[id].ans = {}; });
    g.qs = g.qs.map(function (q) { return q.type === 'sort' ? prepQuestion(q, q.bonus) : q; });
    g.phase = g.mode === 'phones' ? 'lobby' : 'intro';
    render(); broadcast(g);
  }

  function stageTop(g, right) {
    return h('div', { class: 'stage-top' },
      h('div', { class: 'stage-brand' }, h('img', { src: '/icons/icon-192.png', alt: '' }),
        h('span', null, 'quiz ', h('span', { class: 'quiz-name', text: '· ' + g.quiz.name.toLowerCase() }))),
      h('div', { class: 'stage-tools' },
        right || null,
        document.fullscreenEnabled ? h('button', { class: 'round', 'aria-label': 'Helskärm', onclick: function () {
          if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {});
        } }, icon('full')) : null,
        themeButton()));
  }
  function statusLine(g) {
    if (g.mode !== 'phones') return null;
    return h('span', { id: 'conn', class: 'small' }, h('span', { class: 'status-dot' + (g.online ? '' : ' off') }), g.online ? 'Ansluten' : 'Ansluter …');
  }
  function updateStatus(g) {
    var el = document.getElementById('conn');
    if (el && state.view === 'host') el.replaceWith(statusLine(g));
  }
  function updateCounts(g) {
    var el = document.getElementById('answered');
    if (el) {
      var n = answeredIds(g).length, total = g.order.length;
      el.textContent = n + ' av ' + total + ' har svarat';
      var btn = document.getElementById('primary');
      if (btn && total && n === total) btn.textContent = 'Alla har svarat · Visa svaret';
    }
    var pc = document.getElementById('players');
    if (pc && g.phase === 'lobby') render();
  }

  function viewHost() {
    var g = state.game;
    var view = g.phase === 'lobby' ? hostLobby(g)
      : g.phase === 'intro' ? hostIntro(g)
      : g.phase === 'question' ? hostQuestion(g)
      : g.phase === 'reveal' ? hostRevealView(g)
      : hostResults(g);
    return view;
  }
  function endButton(g) {
    return h('button', { class: 'btn soft', onclick: function () { if (confirm('Avsluta quizet? Poängen försvinner.')) hostEnd(g); } }, 'Avsluta');
  }
  function hostIntro(g) {
    return h('div', { class: 'stage' },
      stageTop(g),
      h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
        h('h1', { text: g.quiz.name }),
        g.quiz.intro ? h('p', { class: 'sub', text: g.quiz.intro }) : null,
        h('p', { class: 'sub', text: plural(g.qs.length, 'fråga', 'frågor') + (g.time ? ' · ' + g.time + ' sekunder per fråga' : '') })),
      h('div', { class: 'teams-grid' }, g.teams.map(function (t, i) {
        return h('div', { class: 'team-card', style: 'background:' + TEAM_COLORS[i % 3] }, h('span', { class: 'tname', text: t.name }));
      })),
      h('div', { class: 'stage-bottom' }, endButton(g), h('span', { class: 'spacer' }),
        h('button', { class: 'btn', id: 'primary', onclick: function () { hostNext(g); } }, 'Första frågan')));
  }
  function hostLobby(g) {
    var qr = h('div', { class: 'qr', role: 'img', 'aria-label': 'QR-kod för att gå med' });
    try {
      var code = window.qrcode(0, 'M'); code.addData(g.link); code.make();
      qr.innerHTML = code.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      var svg = qr.querySelector('svg'); if (svg) { svg.querySelectorAll('path,rect').forEach(function (n) { if (n.getAttribute('fill') === '#000000' || n.getAttribute('fill') === 'black') n.setAttribute('fill', '#1F1A2E'); }); }
    } catch (e) { qr.textContent = 'QR-koden kunde inte ritas. Använd länken.'; }
    var names = g.order.map(function (id) { return g.players[id].name; });
    return h('div', { class: 'stage' },
      stageTop(g, statusLine(g)),
      h('div', { class: 'lobby' },
        qr,
        h('div', { class: 'lobby-info' },
          h('h1', { text: 'Gå med på mobilen' }),
          h('ol', { class: 'steps' },
            h('li', { text: 'Rikta kameran mot QR-koden' }),
            h('li', { text: 'Skriv ditt namn' }),
            h('li', { text: 'Vänta här, frågorna kommer på den här skärmen' })),
          h('div', null, h('button', { class: 'btn soft', onclick: function (e) {
            var b = e.currentTarget;
            copyText(g.link).then(function (r) { if (r === 'copied') { b.lastChild.textContent = 'Länken är kopierad'; } });
          } }, icon('copy'), h('span', { text: 'Kopiera länken, t.ex. till chatten' }))),
          h('p', { class: 'sub', id: 'players', text: names.length ? names.length + ' är med' : 'Ingen har gått med än' }),
          h('div', { class: 'player-chips' }, names.map(function (n) { return h('span', { text: n }); })))),
      h('div', { class: 'stage-bottom' }, endButton(g), h('span', { class: 'spacer' }),
        h('button', { class: 'btn', id: 'primary', disabled: !names.length, onclick: function () { hostNext(g); } }, 'Starta quizet')));
  }
  function questionLabel(g) {
    var q = g.qs[g.i], main = g.qs.filter(function (x) { return !x.bonus; }).length;
    if (q.bonus) return 'Bonusfråga ' + (g.i - main + 1) + ' av ' + (g.qs.length - main);
    return 'Fråga ' + (g.i + 1) + ' av ' + main;
  }
  function hostQuestion(g) {
    var q = g.qs[g.i], body;
    if (q.type === 'sort') {
      body = h('div', { class: 'cards-grid' }, q.shown.map(function (k, pos) {
        return h('div', { class: 'word-card' },
          h('span', { class: 'letter', text: LETTERS[pos] }),
          h('span', { class: 'word', text: q.items[k] }));
      }));
    } else {
      var opts = q.type === 'tf' ? ['Sant', 'Falskt'] : q.options;
      body = h('div', { class: 'opts-grid' }, opts.map(function (o, k) {
        return h('div', { class: 'opt-card' },
          h('span', { class: 'letter', text: LETTERS[k] }),
          h('span', { class: 'text', text: o }));
      }));
    }
    var hint = q.type === 'sort' ? (g.mode === 'phones' ? 'Tryck på orden i rätt ordning på mobilen.' : 'Skriv bokstäverna i rätt ordning, till exempel ' + LETTERS.slice(0, 3).split('').join(' – ') + ' …')
      : g.mode === 'phones' ? 'Svara på mobilen.' : null;
    var bonusIntro = q.bonus === 'first' && g.quiz.bonus ? h('p', { class: 'sub', style: 'font-weight:700;color:var(--ink)', text: g.quiz.bonus.name + '. ' + (g.quiz.bonus.intro || '') }) : null;
    return h('div', { class: 'stage' },
      stageTop(g, h('span', { class: 'tools-row' }, statusLine(g), h('span', { text: questionLabel(g) }))),
      h('div', { style: 'display:flex;flex-direction:column;gap:10px' },
        bonusIntro,
        h('h1', { text: q.prompt }),
        hint ? h('p', { class: 'sub', text: hint }) : null),
      body,
      h('div', { class: 'stage-bottom' },
        g.endsAt ? timerEl() : h('span', { class: 'spacer' }),
        g.mode === 'phones' ? h('span', { id: 'answered', class: 'sub', style: 'color:var(--ink);font-weight:600' }, answeredIds(g).length + ' av ' + g.order.length + ' har svarat') : null,
        h('button', { class: 'btn', id: 'primary', onclick: function () { hostReveal(g); } },
          g.mode === 'phones' && g.order.length && answeredIds(g).length === g.order.length ? 'Alla har svarat · Visa svaret' : 'Visa svaret')));
  }
  function timerEl() {
    return h('div', { class: 'timer', role: 'timer', 'aria-label': 'Tid kvar' },
      h('div', { class: 'timer-track' }, h('div', { class: 'timer-fill', id: 'tfill' })),
      h('span', { class: 'timer-text', id: 'ttext' }));
  }
  function hostRevealView(g) {
    var q = g.qs[g.i], body, counts = null;
    if (g.mode === 'phones') {
      counts = {};
      g.order.forEach(function (id) {
        var a = g.players[id].ans[g.i]; if (a === undefined) return;
        var key = q.type === 'sort' ? (isRight(q, a) ? 'right' : 'wrong') : String(a);
        counts[key] = (counts[key] || 0) + 1;
      });
    }
    var answeredN = g.mode === 'phones' ? g.order.filter(function (id) { return g.players[id].ans[g.i] !== undefined; }).length : 0;
    if (q.type === 'sort') {
      var right = correctOf(q);
      body = h('div', { style: 'display:flex;flex-direction:column;gap:clamp(14px,2vw,26px)' },
        h('div', { class: 'big-seq', text: seqText(q) }),
        h('div', { class: 'grow' }, q.items.map(function (word, i) {
          var hgt = Math.round(12 + (88 * i) / Math.max(1, q.items.length - 1));
          return h('div', { class: 'grow-item' },
            h('span', { class: 'word' }, LETTERS[right[i]] + ' · ' + word),
            q.visual === 'grow' ? h('div', { class: 'grow-bar', 'aria-hidden': 'true' }, h('div', { style: 'height:' + hgt + '%;opacity:' + (0.45 + 0.55 * i / Math.max(1, q.items.length - 1)).toFixed(2) })) : null,
            q.notes ? h('span', { class: 'note', text: q.notes[i] }) : null);
        })),
        counts ? h('p', { class: 'sub', style: 'margin:0' }, (counts.right || 0) + ' av ' + answeredN + ' fick hela ordningen rätt') : null);
    } else {
      var opts = q.type === 'tf' ? ['Sant', 'Falskt'] : q.options;
      var vals = q.type === 'tf' ? [true, false] : opts.map(function (_, k) { return k; });
      body = h('div', { class: 'opts-grid' }, opts.map(function (o, k) {
        var isAns = vals[k] === q.answer, c = counts ? (counts[String(vals[k])] || 0) : null;
        return h('div', { class: 'opt-card' + (isAns ? ' right' : ' dim') },
          counts && answeredN ? h('span', { class: 'fill', style: 'width:' + Math.round(100 * c / answeredN) + '%' }) : null,
          h('span', { class: 'letter' }, isAns ? icon('check', 24) : LETTERS[k]), isAns ? h('span', { class: 'sr-only', text: 'Rätt svar: ' }) : null,
          h('span', { class: 'text', text: o }),
          counts ? h('span', { class: 'count', text: String(c) }) : null);
      }));
    }
    var award = null;
    if (g.mode === 'screen') {
      var set = g.awards[g.i] || (g.awards[g.i] = []);
      award = h('div', { class: 'award' },
        h('p', { class: 'label', text: 'Vilka lag hade rätt? Tryck för att ge poäng' }),
        h('div', { class: 'chips' }, g.teams.map(function (t, ti) {
          var on = set.indexOf(ti) >= 0;
          return h('button', { class: 'chip', 'aria-pressed': String(on), onclick: function () {
            if (on) { set.splice(set.indexOf(ti), 1); t.score--; } else { set.push(ti); t.score++; }
            render();
          } }, on ? icon('check', 18) : null, t.name + ' · ' + t.score);
        })));
    }
    var last = g.i + 1 >= g.qs.length;
    return h('div', { class: 'stage' },
      stageTop(g, h('span', { class: 'tools-row' }, award ? endButton(g) : null, h('span', { text: questionLabel(g) }))),
      h('h1', { text: q.type === 'sort' ? 'Rätt ordning' : q.prompt }),
      body,
      q.explain ? h('div', { class: 'explain' }, h('strong', { text: q.type === 'tf' && q.answer === false ? 'Kuggfråga' : 'Visste du?' }), h('span', { text: q.explain })) : null,
      h('div', { class: 'stage-bottom' }, award || endButton(g), h('span', { class: 'spacer' }),
        h('button', { class: 'btn', id: 'primary', onclick: function () { hostNext(g); } }, last ? 'Visa resultatet' : (g.qs[g.i + 1].bonus === 'first' ? 'Till bonusrundan' : 'Nästa fråga'))));
  }
  function hostResults(g) {
    var body;
    if (g.mode === 'screen') {
      var best = Math.max.apply(null, g.teams.map(function (t) { return t.score; }));
      body = h('div', { class: 'teams-grid' }, g.teams.map(function (t, i) {
        return h('div', { class: 'team-card', style: 'background:' + TEAM_COLORS[i % 3] },
          h('span', { class: 'badge', text: best > 0 && t.score === best ? 'Flest rätt idag' : '' }),
          h('span', { class: 'tname', text: t.name }),
          h('span', { class: 'tscore', text: t.score + ' rätt' }));
      }));
    } else {
      var top = topPlayers(g), total = g.order.reduce(function (s, id) { return s + g.players[id].score; }, 0);
      body = h('div', { style: 'display:flex;flex-direction:column;gap:clamp(14px,2vw,24px)' },
        top.length ? h('div', { class: 'teams-grid' }, top.map(function (p, i) {
          return h('div', { class: 'team-card', style: 'background:' + TEAM_COLORS[i % 3] },
            h('span', { class: 'badge', text: p.score === top[0].score ? 'Flest rätt idag' : 'Topp 3' }),
            h('span', { class: 'tname', text: p.name }),
            h('span', { class: 'tscore', text: p.score + ' rätt' }));
        })) : null,
        h('p', { class: 'sub', style: 'color:var(--ink)' }, 'Tillsammans fick ni ' + total + ' rätt. Alla ser sitt eget resultat på mobilen.'));
    }
    return h('div', { class: 'stage' },
      stageTop(g),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px' },
        h('h1', { text: 'Klart! Bra flytet.' }),
        h('p', { class: 'sub', text: plural(g.qs.length, 'fråga', 'frågor') + (g.mode === 'screen' ? ' och ' + plural(g.teams.length, 'lag', 'lag') : ' och ' + plural(g.order.length, 'spelare', 'spelare')) + '.' })),
      body,
      h('div', { class: 'stage-bottom' },
        h('p', { class: 'small muted', style: 'margin:0', text: 'Resultaten försvinner när ni avslutar eller stänger sidan.' }),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn ghost', onclick: function () { hostEnd(g); } }, 'Avsluta'),
        h('button', { class: 'btn', onclick: function () { hostAgain(g); } }, 'Spela igen')));
  }

  /* ----- Timer (host and phones) ----- */
  function startTimer() {
    stopTimer();
    timerHandle = setInterval(tick, 250);
    tick();
  }
  function stopTimer() { if (timerHandle) { clearInterval(timerHandle); timerHandle = null; } }
  function tick() {
    var endsAt = null, total = 0;
    if (state.view === 'host') {
      var g = state.game;
      if (g.phase !== 'question' || !g.endsAt) return;
      endsAt = g.endsAt; total = g.time * 1000;
      if (Date.now() >= endsAt && !g.locked) { g.locked = true; broadcast(g); var b = document.getElementById('primary'); if (b) b.textContent = 'Tiden är ute · Visa svaret'; }
    } else if (state.view === 'player') {
      var ps = state.play;
      if (!ps.s || ps.s.phase !== 'question' || !ps.endsAt) return;
      endsAt = ps.endsAt; total = ps.total;
    } else return;
    var rem = Math.max(0, endsAt - Date.now());
    var f = document.getElementById('tfill'), t = document.getElementById('ttext');
    if (f) f.style.width = (total ? Math.min(100, 100 * rem / total) : 0) + '%';
    if (t) t.textContent = Math.ceil(rem / 1000) + ' s';
  }

  /* ----- Player (phone) ----- */
  function openJoin(ref) {
    var saved = session('eq:p:' + ref.roomId);
    go('player', { play: { ref: ref, pid: saved && saved.pid, name: saved ? saved.name : '', s: null, joined: false, online: false, my: {}, sortPick: [] } });
    if (saved && saved.pid) joinRoom();
  }
  function joinRoom() {
    var ps = state.play;
    if (!ps.pid) ps.pid = randomB64u(12);
    session('eq:p:' + ps.ref.roomId, { pid: ps.pid, name: ps.name });
    ps.joined = true;
    keepAwake();
    ps.conn = connect(ps.ref.roomId, ps.ref.secret, onPlayerMessage, function (ok) {
      ps.online = ok;
      if (ok) hello();
      if (state.view === 'player') render();
    });
    ps.hello = setInterval(function () { if (!ps.s || ps.s.ids.indexOf(ps.pid) < 0) hello(); }, 3000);
    render();
  }
  function hello() { var ps = state.play; if (ps && ps.conn) ps.conn.send({ t: 'hello', pid: ps.pid, name: ps.name }); }
  function onPlayerMessage(m) {
    var ps = state.play;
    if (state.view !== 'player' || !m) return;
    if (m.t === 'end') { ps.ended = true; clearInterval(ps.hello); ps.conn.close(); render(); return; }
    if (m.t !== 'state' || typeof m.phase !== 'string' || !Array.isArray(m.ids)) return;
    var prev = ps.s, changed = !prev || prev.phase !== m.phase || prev.i !== m.i || prev.locked !== m.locked;
    if (prev && prev.i !== m.i) ps.sortPick = [];
    if (m.phase === 'lobby' && prev && prev.phase !== 'lobby') { ps.my = {}; }
    ps.s = m;
    if (m.phase === 'question' && typeof m.rem === 'number') {
      if (changed || !ps.endsAt) { ps.endsAt = Date.now() + m.rem; ps.total = Math.max(m.rem, 1000); }
    } else ps.endsAt = null;
    if (changed || (prev && (prev.ids.indexOf(ps.pid) < 0) !== (m.ids.indexOf(ps.pid) < 0))) render();
    else if (m.phase === 'question') updateSent();
  }
  function sendAnswer(a) {
    var ps = state.play;
    ps.my[ps.s.i] = a;
    ps.conn.send({ t: 'answer', pid: ps.pid, i: ps.s.i, a: a });
    render();
  }
  function updateSent() {
    var ps = state.play, el = document.getElementById('sent');
    if (el) el.textContent = ps.s.got.indexOf(ps.pid) >= 0 ? 'Svaret har kommit fram. Du kan ändra dig tills tiden är ute.' : 'Skickar …';
  }
  function viewPlayer() {
    var ps = state.play;
    var head = h('div', { class: 'bar' },
      h('div', { class: 'brand' }, h('img', { src: '/icons/icon-192.png', alt: '' }), h('span', { text: 'quiz' })),
      themeButton());
    if (ps.ended) {
      return h('div', { class: 'page' }, head,
        h('div', { class: 'big-msg' }, h('h2', { text: 'Tack för att du spelade!' }), h('p', { text: 'Quizet är slut. Inget av det sparas.' })),
        h('a', { class: 'btn ghost block', href: '/' }, 'Till quiz.ellenial.app'));
    }
    if (!ps.joined) {
      var input = h('input', { class: 'input', id: 'name', maxlength: LIMITS.name, autocomplete: 'nickname', value: ps.name, placeholder: 'Ditt namn eller smeknamn',
        onkeydown: function (e) { if (e.key === 'Enter') go2(); } });
      var go2 = function () { var n = clean(input.value, LIMITS.name); if (!n) { input.focus(); return; } ps.name = n; joinRoom(); };
      setTimeout(function () { input.focus(); }, 50);
      return h('div', { class: 'page' }, head,
        h('h1', { class: 'big', text: 'Gå med i quizet' }),
        h('label', { class: 'field' }, h('span', { text: 'Vad heter du?' }), input),
        h('button', { class: 'btn block', onclick: go2 }, 'Gå med'),
        h('p', { class: 'foot', text: 'Namnet syns bara för dem som är med i quizet, och glöms bort när quizet slutar.' }));
    }
    var s = ps.s, inRoom = s && s.ids.indexOf(ps.pid) >= 0;
    if (!s || !inRoom) {
      return h('div', { class: 'page' }, head,
        h('div', { class: 'big-msg' }, h('h2', { text: ps.online ? 'Ansluter till skärmen …' : 'Ansluter …' }),
          h('p', { text: 'Se till att den delade skärmen har quizet öppet.' })));
    }
    var myScore = s.scores && s.scores[ps.pid] ? s.scores[ps.pid][0] : 0;
    var nameLine = h('p', { class: 'small muted', style: 'margin:0', text: ps.name + (s.scores ? ' · ' + plural(myScore, 'rätt', 'rätt') : '') });
    if (s.phase === 'lobby') {
      return h('div', { class: 'page' }, head,
        h('div', { class: 'big-msg' }, h('h2', { text: 'Du är med, ' + ps.name + '!' }),
          h('p', { text: 'Titta på den delade skärmen. Frågorna kommer snart.' }),
          h('p', { class: 'small', text: plural(s.ids.length, 'spelare', 'spelare') + ' är med' })));
    }
    if (s.phase === 'question' && s.q) return h('div', { class: 'page' }, head, nameLine, playerQuestion(ps, s));
    if (s.phase === 'reveal' && s.q) return h('div', { class: 'page' }, head, nameLine, playerReveal(ps, s));
    if (s.phase === 'results') {
      var top = (s.top || []).some(function (t) { return t[0] === ps.name; });
      return h('div', { class: 'page' }, head,
        h('div', { class: 'big-msg' }, h('h2', { text: 'Klart!' }),
          h('p', { style: 'font-size:22px;color:var(--ink);font-weight:600', text: 'Du fick ' + myScore + ' rätt av ' + s.n + '.' }),
          h('p', { text: top ? 'Du är bland dem med flest rätt idag. Snyggt!' : myScore > 0 ? 'Bra jobbat. Nu kan du fler ord för vatten än i morse.' : 'Huvudsaken är att man är med. Nästa gång!' })),
        h('p', { class: 'foot', text: 'Ditt resultat syns bara här, och försvinner när quizet slutar.' }));
    }
    return h('div', { class: 'page' }, head, h('div', { class: 'big-msg' }, h('h2', { text: 'Titta på skärmen' })));
  }
  function playerQuestion(ps, s) {
    var q = s.q, mine = ps.my[s.i], locked = s.locked || (ps.endsAt && Date.now() >= ps.endsAt);
    var parts = [h('p', { class: 'label', text: (q.bonus ? 'Bonusfråga' : 'Fråga ' + (s.i + 1)) }), h('h2', { class: 'prompt', text: q.prompt })];
    if (ps.endsAt) parts.push(timerEl());
    if (locked) {
      parts.push(h('div', { class: 'big-msg' }, h('h2', { text: 'Tiden är ute' }), h('p', { text: mine !== undefined ? 'Ditt svar är med. Titta på skärmen.' : 'Inget svar den här gången. Det gör inget!' })));
      return parts;
    }
    if (q.type === 'sort') {
      var pick = ps.sortPick;
      if (mine !== undefined && !pick.length) pick = ps.sortPick = mine.slice();
      parts.push(h('p', { class: 'small muted', style: 'margin:0', text: 'Tryck på orden i rätt ordning, från första till sista.' }));
      parts.push(h('div', { class: 'answers' }, q.items.map(function (w, k) {
        var pos = pick.indexOf(k);
        return h('button', { class: 'answer' + (pos >= 0 ? ' picked-order' : ''), disabled: pos >= 0, onclick: function () {
          pick.push(k);
          if (pick.length === q.items.length) sendAnswer(pick.slice()); else render();
        } }, h('span', { class: 'letter', text: pos >= 0 ? String(pos + 1) : LETTERS[k] }), h('span', { text: w }));
      })));
      if (pick.length) {
        parts.push(h('div', { class: 'seq' }, pick.map(function (k) { return h('span', { text: q.items[k] }); })));
        parts.push(h('button', { class: 'btn soft block', onclick: function () { ps.sortPick = []; delete ps.my[s.i]; render(); } }, 'Börja om'));
      }
    } else {
      var opts = q.type === 'tf' ? ['Sant', 'Falskt'] : q.options;
      parts.push(h('div', { class: 'answers' }, opts.map(function (o, k) {
        var val = q.type === 'tf' ? k === 0 : k;
        return h('button', { class: 'answer', 'aria-pressed': String(mine === val), onclick: function () { sendAnswer(val); } },
          h('span', { class: 'letter', text: LETTERS[k] }), h('span', { text: o }));
      })));
    }
    if (mine !== undefined) parts.push(h('p', { id: 'sent', class: 'small muted', style: 'margin:0;text-align:center', text: s.got.indexOf(ps.pid) >= 0 ? 'Svaret har kommit fram. Du kan ändra dig tills tiden är ute.' : 'Skickar …' }));
    return parts;
  }
  function playerReveal(ps, s) {
    var q = s.q, r = s.reveal || {}, me = s.scores && s.scores[ps.pid], res = me ? me[1] : -1;
    var answerText;
    if (q.type === 'mc') answerText = q.options[r.answer];
    else if (q.type === 'tf') answerText = r.answer ? 'Sant' : 'Falskt';
    else answerText = (r.answer || []).map(function (k) { return q.items[k]; }).join(' → ');
    return [
      h('div', { class: 'result-box ' + (res === 1 ? 'ok' : 'miss') },
        res === 1 ? h('h2', null, icon('check', 26), 'Rätt!') : h('h2', { text: res === 0 ? 'Inte den här gången' : 'Inget svar' }),
        h('p', { style: 'margin:0' }, h('strong', { text: 'Svar: ' }), answerText)),
      r.explain ? h('p', { style: 'margin:0', text: r.explain }) : null,
      h('p', { class: 'small muted', style: 'margin:0', text: 'Nästa fråga kommer på skärmen.' })
    ];
  }

  /* ----- Editor ----- */
  function newDraft() {
    return { id: randomB64u(9), quiz: { name: '', questions: [{ type: 'mc', prompt: '', options: ['', '', ''], answer: 0 }] } };
  }
  // How a sort question is shown: mixed fresh every game, or in an order the creator picks.
  // A fixed order is the same on the shared screen, on phones and on paper.
  function sortShowEditor(q, qi, rerender, save) {
    var fixed = Array.isArray(q.fixed) && q.fixed.length === q.items.length;
    var parts = [
      h('span', { class: 'small', style: 'font-weight:500', text: 'Så visas den när ni spelar' }),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Så visas den när ni spelar' },
        h('button', { 'aria-pressed': String(!fixed), onclick: function () { delete q.fixed; rerender(); } }, 'Blanda varje gång'),
        h('button', { 'aria-pressed': String(fixed), onclick: function () {
          if (!fixed) q.fixed = paperOrder({ prompt: q.prompt || '', items: q.items }, qi + 1);
          rerender();
        } }, 'Fast ordning'))
    ];
    if (!fixed) {
      parts.push(h('p', { class: 'small muted', style: 'margin:0', text: 'Ny blandning varje gång ni spelar. På papper blir den alltid likadan.' }));
    } else {
      parts.push(h('p', { class: 'small muted', style: 'margin:0', text: 'Samma ordning på skärmen, i mobilerna och på papper. Bra om du skriver ut svarsblad och kör på skärmen samtidigt.' }));
      parts.push(h('ol', { class: 'show-list' }, q.fixed.map(function (k, pos) {
        function move(d) { var t = q.fixed[pos]; q.fixed[pos] = q.fixed[pos + d]; q.fixed[pos + d] = t; rerender(); }
        var label = q.items[k] || ('Plats ' + (k + 1));
        return h('li', { class: 'opt-row' },
          h('span', { class: 'order', text: LETTERS[pos] }),
          h('span', { class: 'show-item', text: label }),
          h('div', { class: 'row-actions' },
            pos > 0 ? h('button', { class: 'round', 'aria-label': 'Flytta ' + label + ' upp', onclick: function () { move(-1); } }, icon('up')) : null,
            pos < q.fixed.length - 1 ? h('button', { class: 'round', 'aria-label': 'Flytta ' + label + ' ner', onclick: function () { move(1); } }, icon('down')) : null));
      })));
      if (q.fixed.every(function (v, i) { return v === i; })) {
        parts.push(h('p', { class: 'notice', style: 'margin:0', text: 'Obs: nu visas den i rätt ordning, så svaret syns direkt.' }));
      }
    }
    return h('div', { class: 'group show-box' }, parts);
  }
  function viewEdit() {
    var d = state.draft, quiz = d.quiz;
    function save() { upsertMyQuiz({ id: d.id, quiz: quiz }); }
    function rerender() { save(); render(); }
    var msg = h('p', { class: 'small', role: 'status', style: 'margin:0;text-align:center;min-height:1.4em' });
    function ready() {
      var c = cleanQuiz(quiz);
      var bad = quiz.questions.length - (c ? c.questions.length : 0);
      if (!c) { msg.textContent = 'Fyll i minst en hel fråga först.'; return null; }
      if (bad) { msg.textContent = plural(bad, 'fråga är', 'frågor är') + ' inte klar' + (bad === 1 ? '' : 'a') + ' och hoppas över.'; }
      return c;
    }
    var cards = quiz.questions.map(function (q, qi) {
      function setType(t) {
        if (q.type === t) return;
        var texts = (q.options || q.items || []).slice();
        q.type = t;
        delete q.options; delete q.items; delete q.notes; delete q.visual; delete q.fixed;
        if (t === 'mc') { q.options = texts.length >= 2 ? texts : ['', '', '']; q.answer = 0; }
        if (t === 'sort') { q.items = texts.length >= 3 ? texts : texts.concat(['', '', '']).slice(0, Math.max(3, texts.length)); delete q.answer; }
        if (t === 'tf') { q.answer = true; }
        rerender();
      }
      var body = [];
      if (q.type === 'mc') {
        body.push(h('div', { class: 'group' }, h('span', { class: 'small', style: 'font-weight:500', text: 'Svar (markera det rätta)' }),
          q.options.map(function (o, oi) {
            return h('div', { class: 'opt-row' },
              h('input', { type: 'radio', name: 'r' + qi, checked: q.answer === oi, 'aria-label': 'Rätt svar: ' + (o || LETTERS[oi]), onchange: function () { q.answer = oi; save(); } }),
              h('input', { class: 'input', value: o, maxlength: LIMITS.option, 'aria-label': 'Svar ' + LETTERS[oi], placeholder: 'Svar ' + LETTERS[oi], oninput: function (e) { q.options[oi] = e.target.value; save(); } }),
              q.options.length > 2 ? h('button', { class: 'round', 'aria-label': 'Ta bort svar ' + LETTERS[oi], onclick: function () {
                q.options.splice(oi, 1); if (q.answer >= q.options.length || q.answer === oi) q.answer = 0; else if (q.answer > oi) q.answer--; rerender();
              } }, icon('x', 16)) : null);
          }),
          q.options.length < LIMITS.options ? h('button', { class: 'btn dashed', style: 'min-height:44px', onclick: function () { q.options.push(''); rerender(); } }, '+ Svar') : null));
      } else if (q.type === 'sort') {
        body.push(h('div', { class: 'group' }, h('span', { class: 'small', style: 'font-weight:500', text: q.fixed ? 'Skriv i rätt ordning. Det är svaret.' : 'Skriv i rätt ordning. De blandas när ni spelar.' }),
          q.items.map(function (o, oi) {
            return h('div', { class: 'opt-row' },
              h('span', { class: 'order', text: String(oi + 1) }),
              h('input', { class: 'input', value: o, maxlength: LIMITS.option, 'aria-label': 'Plats ' + (oi + 1), placeholder: oi === 0 ? 'Först' : oi === q.items.length - 1 ? 'Sist' : 'Plats ' + (oi + 1), oninput: function (e) { q.items[oi] = e.target.value; save(); } }),
              q.items.length > 3 ? h('button', { class: 'round', 'aria-label': 'Ta bort plats ' + (oi + 1), onclick: function () {
                q.items.splice(oi, 1);
                if (q.fixed) q.fixed = q.fixed.filter(function (k) { return k !== oi; }).map(function (k) { return k > oi ? k - 1 : k; });
                rerender();
              } }, icon('x', 16)) : null);
          }),
          q.items.length < LIMITS.options ? h('button', { class: 'btn dashed', style: 'min-height:44px', onclick: function () { q.items.push(''); if (q.fixed) q.fixed.push(q.items.length - 1); rerender(); } }, '+ Plats') : null,
          sortShowEditor(q, qi, rerender, save)));
      } else {
        body.push(h('div', { class: 'group' }, h('span', { class: 'small', style: 'font-weight:500', text: 'Rätt svar' }),
          h('div', { class: 'seg' },
            h('button', { 'aria-pressed': String(q.answer === true), onclick: function () { q.answer = true; rerender(); } }, 'Sant'),
            h('button', { 'aria-pressed': String(q.answer === false), onclick: function () { q.answer = false; rerender(); } }, 'Falskt'))));
      }
      return h('div', { class: 'q-edit' },
        h('div', { class: 'q-edit-head' },
          h('span', { class: 'label', text: 'Fråga ' + (qi + 1) }),
          h('div', { class: 'row-actions' },
            qi > 0 ? h('button', { class: 'round', 'aria-label': 'Flytta upp', onclick: function () { quiz.questions.splice(qi - 1, 0, quiz.questions.splice(qi, 1)[0]); rerender(); } }, icon('up')) : null,
            qi < quiz.questions.length - 1 ? h('button', { class: 'round', 'aria-label': 'Flytta ner', onclick: function () { quiz.questions.splice(qi + 1, 0, quiz.questions.splice(qi, 1)[0]); rerender(); } }, icon('down')) : null,
            quiz.questions.length > 1 ? h('button', { class: 'round', 'aria-label': 'Ta bort fråga ' + (qi + 1), onclick: function () { quiz.questions.splice(qi, 1); rerender(); } }, icon('trash')) : null)),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Frågetyp' },
          h('button', { 'aria-pressed': String(q.type === 'mc'), onclick: function () { setType('mc'); } }, 'Flerval'),
          h('button', { 'aria-pressed': String(q.type === 'sort'), onclick: function () { setType('sort'); } }, 'Sortera'),
          h('button', { 'aria-pressed': String(q.type === 'tf'), onclick: function () { setType('tf'); } }, 'Sant/falskt')),
        h('label', { class: 'field' }, h('span', { text: 'Frågan' }),
          h('input', { class: 'input', value: q.prompt, maxlength: LIMITS.prompt, placeholder: q.type === 'sort' ? 'T.ex. Sortera från minst till störst' : q.type === 'tf' ? 'Ett påstående som är sant eller falskt' : 'Skriv frågan', oninput: function (e) { q.prompt = e.target.value; save(); } })),
        body,
        h('label', { class: 'field' }, h('span', { text: 'Visste du? (valfritt, visas med svaret)' }),
          h('input', { class: 'input', value: q.explain || '', maxlength: LIMITS.explain, oninput: function (e) { q.explain = e.target.value; save(); } })));
    });
    return h('div', { class: 'page' },
      backHead(quiz.name || 'Nytt quiz'),
      h('label', { class: 'field' }, h('span', { class: 'label', text: 'Namn på quizet' }),
        h('input', { class: 'input', value: quiz.name, maxlength: LIMITS.quizName, placeholder: 'T.ex. Fredagsfika-quizet', oninput: function (e) { quiz.name = e.target.value; save(); } })),
      cards,
      quiz.questions.length < LIMITS.questions ? h('button', { class: 'btn dashed block', onclick: function () {
        var prev = quiz.questions[quiz.questions.length - 1];
        var t = prev ? prev.type : 'mc';
        quiz.questions.push(t === 'tf' ? { type: 'tf', prompt: '', answer: true } : t === 'sort' ? { type: 'sort', prompt: '', items: ['', '', ''] } : { type: 'mc', prompt: '', options: ['', '', ''], answer: 0 });
        rerender();
      } }, '+ Lägg till fråga') : null,
      h('div', { class: 'group', style: 'margin-top:auto' },
        msg,
        h('button', { class: 'btn block', onclick: function () { var c = ready(); if (c) { save(); openSetup(c); } } }, 'Spela'),
        h('button', { class: 'btn ghost block', onclick: function () {
          var c = ready(); if (!c) return;
          save();
          shareQuiz(c).then(function (r) { msg.textContent = r === 'copied' ? 'Länken är kopierad. Klistra in den där du vill dela.' : r === 'shared' ? 'Delat!' : ''; });
        } }, icon('link'), 'Dela som länk'),
        h('button', { class: 'btn soft block', onclick: function () {
          var c = ready(); if (!c) return;
          save();
          var back = JSON.parse(JSON.stringify(d));
          openPrint(c, function () { go('edit', { draft: back }); });
        } }, icon('print'), 'Skriv ut eller spara som PDF'),
        h('p', { class: 'small muted', style: 'margin:0;text-align:center', text: 'Sparas automatiskt, bara på den här telefonen. Länken innehåller hela quizet, så den som får den kan spela och ändra en egen kopia. Vill du ha quizet kvar för alltid: skriv ut det eller spara som PDF.' }),
        h('button', { class: 'btn danger block', onclick: function () {
          if (!confirm('Ta bort quizet från den här telefonen?')) return;
          saveMyQuizzes(myQuizzes().filter(function (x) { return x.id !== d.id; })); go('home');
        } }, 'Ta bort quizet')));
  }


  /* ----- Print / save as PDF ----- */
  // A paper version of any quiz: the quizmaster's copy (with answers) or a sheet for the teams
  // (without, with room to write). Built from the browser's own print dialog, so "Save as PDF"
  // works everywhere and nothing leaves the device.
  function openPrint(quiz, onBack) {
    var last = store('eq:print');
    go('print', { quiz: quiz, answers: last !== 'blank', back: onBack });
  }
  // Same order every time for the same question, never the right order (the paper must not give it away).
  function paperOrder(q, qi) {
    if (q.fixed) return q.fixed.slice();
    var n = q.items.length, seed = 7 + qi * 31;
    for (var c = 0; c < q.prompt.length; c++) seed = (seed * 33 + q.prompt.charCodeAt(c)) % 2147483647;
    var order = q.items.map(function (_, i) { return i; });
    for (var i = n - 1; i > 0; i--) {
      seed = (seed * 48271) % 2147483647;
      var j = seed % (i + 1), t = order[i]; order[i] = order[j]; order[j] = t;
    }
    if (order.every(function (v, k) { return v === k; })) order.push(order.shift());
    return order;
  }
  function paperQuestion(q, num, answers) {
    var mark = function (ok) { return ok && answers ? h('span', { class: 'p-right' }, '✓ ', h('span', { class: 'sr-print', text: 'rätt svar' })) : null; };
    var body;
    if (q.type === 'mc') {
      body = h('ol', { class: 'p-opts', type: 'A' }, q.options.map(function (o, oi) {
        var ok = q.answer === oi;
        return h('li', { class: ok && answers ? 'is-right' : '' },
          answers ? null : h('span', { class: 'p-box', 'aria-hidden': 'true' }),
          h('span', { class: 'p-letter', text: LETTERS[oi] }), h('span', { text: o }), mark(ok));
      }));
    } else if (q.type === 'tf') {
      body = h('ol', { class: 'p-opts p-tf' }, [true, false].map(function (v) {
        var ok = q.answer === v;
        return h('li', { class: ok && answers ? 'is-right' : '' },
          answers ? null : h('span', { class: 'p-box', 'aria-hidden': 'true' }),
          h('span', { text: v ? 'Sant' : 'Falskt' }), mark(ok));
      }));
    } else {
      var order = paperOrder(q, q.fixed ? 0 : num);
      var seq = q.items.map(function (_, k) { return LETTERS[order.indexOf(k)]; });
      body = h('div', null,
        h('ol', { class: 'p-opts', type: 'A' }, order.map(function (idx, k) {
          return h('li', null, h('span', { class: 'p-letter', text: LETTERS[k] }), h('span', { text: q.items[idx] }));
        })),
        answers
          ? h('p', { class: 'p-answer' }, h('strong', { text: 'Rätt ordning: ' }), seq.join(' – '),
              h('span', { class: 'p-sub', text: ' (' + q.items.join(', ') + ')' }))
          : h('p', { class: 'p-write' }, 'Ordning: ', q.items.map(function () { return h('span', { class: 'p-blank' }); })));
    }
    return h('li', { class: 'p-q' },
      h('p', { class: 'p-prompt' }, h('span', { class: 'p-num', text: num + '.' }), ' ', q.prompt,
        h('span', { class: 'p-type', text: q.type === 'mc' ? ' · Flerval' : q.type === 'tf' ? ' · Sant eller falskt' : ' · Sortera' })),
      body,
      answers && q.explain ? h('p', { class: 'p-explain' }, h('strong', { text: 'Visste du? ' }), q.explain) : null);
  }
  function viewPrint() {
    var quiz = state.quiz, answers = state.answers;
    function setAnswers(v) { store('eq:print', v ? 'answers' : 'blank'); state.answers = v; render(); }
    var n = quiz.questions.length, num = 0;
    var sheet = h('article', { class: 'sheet', 'aria-label': 'Förhandsvisning av utskriften' },
      h('header', { class: 'p-head' },
        h('p', { class: 'p-kicker', text: answers ? 'Frågeledarens version · med svar' : 'Svarsblad' }),
        h('h1', { text: quiz.name }),
        quiz.intro ? h('p', { class: 'p-intro', text: quiz.intro }) : null,
        h('p', { class: 'p-meta', text: plural(n, 'fråga', 'frågor') + (quiz.bonus ? ' + bonusrunda' : '') }),
        answers ? null : h('p', { class: 'p-write p-team' }, 'Lag: ', h('span', { class: 'p-blank wide' }))),
      h('ol', { class: 'p-list' }, quiz.questions.map(function (q) { num++; return paperQuestion(q, num, answers); })),
      quiz.bonus ? h('section', { class: 'p-bonus' },
        h('h2', { text: quiz.bonus.name }),
        quiz.bonus.intro ? h('p', { class: 'p-intro', text: quiz.bonus.intro }) : null,
        h('ol', { class: 'p-list', start: String(num + 1) }, quiz.bonus.questions.map(function (q) { num++; return paperQuestion(q, num, answers); }))) : null,
      answers ? null : h('p', { class: 'p-write p-score' }, 'Antal rätt: ', h('span', { class: 'p-blank' }), ' av ' + num),
      h('footer', { class: 'p-foot', text: 'Gjort med quiz · Ellenial — quiz.ellenial.app' }));
    return h('div', { class: 'page print-page' },
      h('div', { class: 'no-print group' },
        backHead('Skriv ut', state.back),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Vilken version' },
          h('button', { 'aria-pressed': String(answers), onclick: function () { setAnswers(true); } }, 'Med svar'),
          h('button', { 'aria-pressed': String(!answers), onclick: function () { setAnswers(false); } }, 'Svarsblad till lagen')),
        h('p', { class: 'small muted', style: 'margin:0', text: answers
          ? 'Till dig som leder quizet: alla frågor med rätt svar och "Visste du?".'
          : 'Till lagen: frågorna utan svar, med plats att skriva. Skriv ut ett per lag.' }),
        h('button', { class: 'btn block', onclick: function () { window.print(); } }, icon('print'), 'Skriv ut eller spara som PDF'),
        h('p', { class: 'small muted', style: 'margin:0;text-align:center', text: 'Välj "Spara som PDF" i utskriftsrutan för att ha quizet kvar som fil. Inget skickas någonstans.' })),
      sheet);
  }

  /* ----- Import from a share link ----- */
  function viewImport() {
    var q = state.quiz;
    if (!q) {
      return h('div', { class: 'page' }, brandHead(),
        h('div', { class: 'error', text: 'Länken gick inte att läsa. Den kan ha blivit avklippt när den skickades. Be om den igen.' }),
        h('button', { class: 'btn block', onclick: function () { go('home'); } }, 'Till startsidan'));
    }
    return h('div', { class: 'page' }, brandHead(),
      h('h1', { class: 'big', text: 'Någon har delat ett quiz med dig' }),
      h('div', { class: 'quiz-card' },
        h('h2', { text: q.name }),
        h('p', { class: 'small muted', text: plural(q.questions.length, 'fråga', 'frågor') })),
      h('button', { class: 'btn block', onclick: function () { openSetup(q); } }, 'Spela nu'),
      h('button', { class: 'btn ghost block', onclick: function () {
        upsertMyQuiz({ id: randomB64u(9), quiz: q }); go('home');
      } }, 'Spara i mina quiz'),
      h('button', { class: 'btn soft block', onclick: function () { openPrint(q, function () { go('import', { quiz: q }); }); } }, icon('print'), 'Skriv ut'),
      h('p', { class: 'foot', text: 'Quizet låg i länken och har inte skickats till någon server.' }));
  }

  /* ---------------- start ---------------- */

  function boot() {
    migrateTheme();
    var path = location.pathname;
    if (path.indexOf('/join') === 0) {
      var ref = readRoomRef(location.hash);
      if (ref) { history.replaceState(null, '', '/join' + location.search); openJoin(ref); }
      else {
        app.innerHTML = '';
        app.appendChild(h('div', { class: 'page' }, brandHead(),
          h('div', { class: 'error', text: 'Länken till quizet gick inte att läsa. Skanna QR-koden på skärmen igen.' })));
      }
      return;
    }
    fetch('/quizzes/vattendrag.json').then(function (r) { return r.json(); }).then(function (q) {
      var c = cleanQuiz(q); if (c) builtIn = [c];
    }).catch(function () {}).then(function () {
      if (path.indexOf('/q') === 0 && location.hash) {
        var hash = location.hash;
        unpackQuiz(hash).then(function (q) { history.replaceState(null, '', '/' + location.search); go('import', { quiz: q }); });
      } else go('home');
    });
  }
  window.addEventListener('beforeunload', function (e) {
    if (state.view === 'host' && state.game && state.game.phase !== 'results' && state.game.i >= 0) { e.preventDefault(); e.returnValue = ''; }
  });
  boot();
})();
