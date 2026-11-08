/*! ellenial-help.js · shared Ellenial pattern · AGPL-3.0 · no dependencies, no tracking
 *
 * The "?" in the top-right corner of every Ellenial app (decided by Ellen, 8 Nov 2026): help is
 * there when someone asks for it, never pushed. Tapping "?" opens "How it works" in a few steps,
 * as a sheet from the bottom on phones and a centred card on wider screens. Nothing pops up on
 * its own and nothing is remembered about who opened it.
 *
 * HOW TO USE IN ANOTHER ELLENIAL APP
 * 1. Copy ellenial-help.js and ellenial-help.css into the app, unchanged.
 * 2. Load the stylesheet after the app's own (it reads the app's colour variables:
 *    --surface, --ground, --ink, --muted, --accent, --on-accent, --peri, --on-peri, --line, --display),
 *    and the script before the app's script (defer is fine).
 * 3. Put the button in the top-right corner of the top bar:
 *      EllenialHelp.button({ label: 'How it works', onclick: function () { EllenialHelp.open(HELP) } })
 *    where HELP = { title, lead, image, steps: [{ title, text }], note, more, done, close }.
 *    `more` is optional: { label, onclick } adds a link under the note for apps with a longer page
 *    (Poll's privacy page, for example). The sheet closes before onclick runs.
 *    `image` is optional (a drawing of Ellen's, e.g. the app's own icon drawing, shown without alt text
 *    because it only decorates). Keep steps to three; plain words, first person where it fits.
 * 4. Test: the sheet must open, close with "Got it", the ✕, Esc or a tap outside, and give the
 *    focus back to the "?" button.
 *
 * Uses the browser's own <dialog> (focus stays inside, Esc closes, screen readers announce it).
 */
;(function () {
  'use strict'

  function el(tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    return e
  }

  function button(opts) {
    opts = opts || {}
    var b = el('button', 'eh-q', '?')
    b.type = 'button'
    b.setAttribute('aria-label', opts.label || 'How it works')
    b.setAttribute('aria-haspopup', 'dialog')
    if (opts.id) b.id = opts.id
    if (opts.onclick) b.addEventListener('click', opts.onclick)
    return b
  }

  function open(h) {
    h = h || {}
    var opener = document.activeElement
    var d = el('dialog', 'eh-sheet')
    var titleId = 'eh-title-' + Math.random().toString(36).slice(2, 8)
    d.setAttribute('aria-labelledby', titleId)

    var head = el('div', 'eh-head')
    if (h.image) {
      var img = el('img', 'eh-img'); img.src = h.image; img.alt = ''; img.width = 76; img.height = 76
      head.appendChild(img)
    }
    var words = el('div', 'eh-words')
    var t = el('h2', 'eh-title', h.title || 'How it works'); t.id = titleId
    words.appendChild(t)
    if (h.lead) words.appendChild(el('p', 'eh-lead', h.lead))
    head.appendChild(words)
    var x = el('button', 'eh-x'); x.type = 'button'; x.setAttribute('aria-label', h.close || 'Close')
    x.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
    head.appendChild(x)
    d.appendChild(head)

    var ol = el('ol', 'eh-steps')
    ;(h.steps || []).forEach(function (s, i) {
      var li = el('li')
      li.appendChild(el('span', 'eh-n', String(i + 1)))
      var body = el('span', 'eh-body')
      body.appendChild(el('strong', null, s.title))
      if (s.text) body.appendChild(el('span', null, s.text))
      li.appendChild(body)
      ol.appendChild(li)
    })
    d.appendChild(ol)
    if (h.note) d.appendChild(el('p', 'eh-note', h.note))
    if (h.more && h.more.label) {
      var more = el('button', 'eh-more', h.more.label); more.type = 'button'
      more.addEventListener('click', function () { close(); if (h.more.onclick) h.more.onclick() })
      d.appendChild(more)
    }
    var ok = el('button', 'eh-ok', h.done || 'Got it'); ok.type = 'button'
    d.appendChild(ok)

    function close() { if (d.open) d.close() }
    x.addEventListener('click', close)
    ok.addEventListener('click', close)
    // A tap on the dimmed area outside the sheet closes it.
    d.addEventListener('click', function (e) {
      var r = d.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close()
    })
    d.addEventListener('close', function () {
      d.remove()
      if (opener && opener.focus) opener.focus({ preventScroll: true })
    })
    document.body.appendChild(d)
    d.showModal()
    ok.focus({ preventScroll: true })
    return { close: close, element: d }
  }

  window.EllenialHelp = { button: button, open: open }
})()
