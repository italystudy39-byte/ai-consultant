(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var KEY = params.get('key') || '';
  var PAGE = params.get('page') || document.referrer || '';
  var API = '/api/widget/' + encodeURIComponent(KEY);

  var I18N = {
    ru: { placeholder: 'Напишите вопрос…', online: 'онлайн', typing: 'печатает…', close: 'Закрыть', send: 'Отправить',
      disclaimer: 'Ответы генерирует AI и могут содержать неточности', offer: 'Оставить контакт',
      leadTitle: 'Оставьте контакт — сотрудник свяжется с вами', name: 'Имя', contact: 'Телефон или email',
      submit: 'Отправить', cancel: 'Отмена', thanks: 'Спасибо! Мы скоро свяжемся с вами.',
      error: 'Не удалось отправить сообщение. Проверьте интернет и попробуйте снова.', notFound: 'Виджет не настроен.' },
    en: { placeholder: 'Type your question…', online: 'online', typing: 'typing…', close: 'Close', send: 'Send',
      disclaimer: 'Answers are AI-generated and may be inaccurate', offer: 'Leave contact details',
      leadTitle: 'Leave your contact and our team will reach out', name: 'Name', contact: 'Phone or email',
      submit: 'Send', cancel: 'Cancel', thanks: 'Thank you! We will contact you soon.',
      error: 'Could not send the message. Check your connection and try again.', notFound: 'Widget is not configured.' },
    uz: { placeholder: 'Savolingizni yozing…', online: 'onlayn', typing: 'yozmoqda…', close: 'Yopish', send: 'Yuborish',
      disclaimer: 'Javoblar AI tomonidan yaratiladi va xato bo‘lishi mumkin', offer: 'Kontakt qoldirish',
      leadTitle: 'Kontaktingizni qoldiring — xodimimiz bog‘lanadi', name: 'Ism', contact: 'Telefon yoki email',
      submit: 'Yuborish', cancel: 'Bekor qilish', thanks: 'Rahmat! Tez orada siz bilan bog‘lanamiz.',
      error: 'Xabar yuborilmadi. Internetni tekshirib, qayta urinib ko‘ring.', notFound: 'Vidjet sozlanmagan.' },
  };
  function pickLang(cfgLang) {
    if (I18N[cfgLang]) return cfgLang;
    var nav = (navigator.language || 'ru').slice(0, 2);
    return I18N[nav] ? nav : 'ru';
  }
  var t = I18N.ru;

  // ── Хранилище (в iframe может быть недоступно — тогда живём в памяти)
  var mem = {};
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  };
  function randomId() {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return 'v_' + Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  var VKEY = 'aic_visitor', CKEY = 'aic_conv_' + KEY;
  var visitorId = store.get(VKEY);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(visitorId || '')) { visitorId = randomId(); store.set(VKEY, visitorId); }
  var conversationId = store.get(CKEY);

  var $ = function (id) { return document.getElementById(id); };
  var log = $('log'), input = $('input'), sendBtn = $('send'), form = $('form');
  var busy = false, cfg = { collectLeads: true };

  // ── Рендер текста: экранирование + минимальный markdown (жирный, ссылки, списки)
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function render(text) {
    var lines = esc(text).split('\n'), html = '', inList = false;
    lines.forEach(function (line) {
      var m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + m[1] + '</li>'; return; }
      if (inList) { html += '</ul>'; inList = false; }
      html += line + '<br>';
    });
    if (inList) html += '</ul>';
    return html
      .replace(/(<br>)+$/, '')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function scroll() { log.scrollTop = log.scrollHeight; }
  function addMsg(role, text, extraClass) {
    var el = document.createElement('div');
    el.className = 'msg ' + (role === 'user' ? 'user' : 'bot') + (extraClass ? ' ' + extraClass : '');
    el.innerHTML = render(text);
    log.appendChild(el);
    scroll();
    return el;
  }

  var typingEl = null;
  function setTyping(on) {
    $('status').textContent = on ? t.typing : t.online;
    if (on && !typingEl) {
      typingEl = document.createElement('div');
      typingEl.className = 'msg bot typing';
      typingEl.setAttribute('aria-label', t.typing);
      typingEl.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(typingEl);
      scroll();
    } else if (!on && typingEl) { typingEl.remove(); typingEl = null; }
  }

  // ── Форма контакта
  function offerContact() {
    if (!cfg.collectLeads || document.querySelector('.lead, .offer')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'offer'; b.textContent = t.offer;
    b.onclick = function () { b.remove(); showLeadForm(); };
    log.appendChild(b); scroll();
  }
  function showLeadForm() {
    var f = document.createElement('form');
    f.className = 'lead';
    f.innerHTML = '<p>' + esc(t.leadTitle) + '</p>' +
      '<input name="name" autocomplete="name" maxlength="200" placeholder="' + esc(t.name) + '">' +
      '<input name="contact" required minlength="5" maxlength="200" autocomplete="tel" placeholder="' + esc(t.contact) + '">' +
      '<div class="row"><button class="btn" type="submit">' + esc(t.submit) + '</button>' +
      '<button class="btn ghost" type="button">' + esc(t.cancel) + '</button></div>';
    f.querySelector('.ghost').onclick = function () { f.remove(); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var btn = f.querySelector('.btn'); btn.disabled = true;
      fetch(API + '/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId, conversationId: conversationId,
          name: f.elements.name.value, contact: f.elements.contact.value }),
      }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error); }); })
        .then(function () { f.remove(); addMsg('bot', t.thanks); })
        .catch(function (err) { btn.disabled = false; addMsg('bot', err.message || t.error, 'err'); });
    };
    log.appendChild(f); scroll();
    f.elements.contact.focus();
  }

  // ── Отправка сообщения
  function send(text) {
    if (busy || !text) return;
    busy = true; sendBtn.disabled = true;
    addMsg('user', text);
    setTyping(true);
    fetch(API + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: visitorId, conversationId: conversationId, message: text, pageUrl: PAGE }),
    })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || t.error); return d; }); })
      .then(function (d) {
        conversationId = d.conversationId; store.set(CKEY, conversationId);
        setTyping(false);
        addMsg('bot', d.reply);
        if (d.offerContact) offerContact();
      })
      .catch(function (err) {
        setTyping(false);
        addMsg('bot', err && err.message && err.message !== 'Failed to fetch' ? err.message : t.error, 'err');
        input.value = input.value || text;
        updateSend();
      })
      .finally(function () { busy = false; updateSend(); });
  }

  function updateSend() { sendBtn.disabled = busy || !input.value.trim(); }
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }

  input.addEventListener('input', function () { autosize(); updateSend(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = ''; autosize(); send(text);
  });
  $('close').addEventListener('click', function () { parent.postMessage({ type: 'aic:close' }, '*'); });
  window.addEventListener('message', function (e) { if (e.data && e.data.type === 'aic:opened') input.focus(); });

  // Кнопка «закрыть» нужна только внутри iframe
  if (window.parent === window) $('close').style.display = 'none';

  // ── Инициализация: конфиг + восстановление истории
  function applyConfig(c) {
    cfg = c;
    t = I18N[pickLang(c.language)];
    document.documentElement.lang = pickLang(c.language);
    if (/^#[0-9a-f]{6}$/i.test(c.accentColor || '')) document.documentElement.style.setProperty('--accent', c.accentColor);
    $('botName').textContent = c.botName || 'AI';
    $('avatar').textContent = (c.botName || 'AI').trim().slice(0, 1).toUpperCase();
    $('status').textContent = t.online;
    $('brand').textContent = t.disclaimer;
    input.placeholder = t.placeholder;
    $('close').setAttribute('aria-label', t.close);
    sendBtn.setAttribute('aria-label', t.send);
    document.title = c.botName + ' — ' + c.companyName;
    parent.postMessage({ type: 'aic:config', accentColor: c.accentColor }, '*');
  }

  fetch(API + '/config')
    .then(function (r) { if (!r.ok) throw new Error('config'); return r.json(); })
    .then(function (c) {
      applyConfig(c);
      if (c.greeting) addMsg('bot', c.greeting);
      if (!conversationId) return;
      return fetch(API + '/conversations/' + encodeURIComponent(conversationId) + '?visitorId=' + encodeURIComponent(visitorId))
        .then(function (r) { if (!r.ok) { store.del(CKEY); conversationId = null; return null; } return r.json(); })
        .then(function (h) { if (h) h.messages.forEach(function (m) { addMsg(m.role, m.text); }); });
    })
    .catch(function () { addMsg('bot', t.notFound, 'err'); input.disabled = true; });
})();
