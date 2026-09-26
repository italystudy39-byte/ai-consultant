/*!
 * AI-консультант — встраиваемый виджет.
 * Использование:
 *   <script src="https://YOUR_HOST/widget.js" data-key="pk_..." async></script>
 * Необязательные атрибуты: data-position="left|right", data-open="true"
 */
(function () {
  'use strict';
  var script = document.currentScript || document.querySelector('script[data-key][src*="widget.js"]');
  if (!script || window.__aiConsultantLoaded) return;
  window.__aiConsultantLoaded = true;

  var key = script.getAttribute('data-key');
  var side = script.getAttribute('data-position') === 'left' ? 'left' : 'right';
  var base = new URL(script.src).origin;
  if (!key) { console.warn('[AI-консультант] не указан data-key'); return; }

  var Z = 2147483000;
  var open = false;

  var style = document.createElement('style');
  style.textContent =
    '.aic-btn{position:fixed;bottom:20px;' + side + ':20px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;' +
    'background:#4f46e5;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.2);z-index:' + Z + ';display:flex;align-items:center;justify-content:center;' +
    'transition:transform .15s ease}' +
    '.aic-btn:hover{transform:scale(1.06)}.aic-btn:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}' +
    '.aic-btn svg{width:28px;height:28px}' +
    '.aic-frame{position:fixed;bottom:92px;' + side + ':20px;width:380px;height:600px;max-height:calc(100vh - 112px);border:0;' +
    'border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.25);z-index:' + Z + ';background:#fff;display:none;color-scheme:normal}' +
    '.aic-frame.aic-open{display:block}' +
    '@media (max-width:480px){.aic-frame{top:0;left:0;right:0;bottom:0;width:100%;height:100%;max-height:none;border-radius:0}' +
    '.aic-btn.aic-hide-mobile{display:none}}';
  document.head.appendChild(style);

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  var btn = document.createElement('button');
  btn.className = 'aic-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Открыть чат с консультантом');
  btn.innerHTML = ICON_CHAT;

  var frame = null;
  function ensureFrame() {
    if (frame) return frame;
    frame = document.createElement('iframe');
    frame.className = 'aic-frame';
    frame.title = 'Чат с AI-консультантом';
    frame.allow = 'clipboard-write';
    frame.src = base + '/widget/chat.html?key=' + encodeURIComponent(key) +
      '&page=' + encodeURIComponent(location.href.slice(0, 500));
    document.body.appendChild(frame);
    return frame;
  }

  function setOpen(v) {
    open = v;
    ensureFrame().classList.toggle('aic-open', open);
    btn.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
    btn.setAttribute('aria-label', open ? 'Закрыть чат' : 'Открыть чат с консультантом');
    btn.classList.toggle('aic-hide-mobile', open);
    if (open) frame.contentWindow && frame.contentWindow.postMessage({ type: 'aic:opened' }, base);
  }

  btn.addEventListener('click', function () { setOpen(!open); });

  window.addEventListener('message', function (e) {
    if (e.origin !== base || !e.data) return;
    if (e.data.type === 'aic:close') setOpen(false);
    if (e.data.type === 'aic:config' && /^#[0-9a-f]{6}$/i.test(e.data.accentColor || '')) {
      btn.style.background = e.data.accentColor;
    }
  });

  // цвет кнопки берём из настроек бота
  fetch(base + '/api/widget/' + encodeURIComponent(key) + '/config')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) { if (c && c.accentColor) btn.style.background = c.accentColor; })
    .catch(function () {});

  function mount() {
    document.body.appendChild(btn);
    if (script.getAttribute('data-open') === 'true') setOpen(true);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  // Публичное API: window.AIConsultant.open() / .close()
  window.AIConsultant = { open: function () { setOpen(true); }, close: function () { setOpen(false); } };
})();
