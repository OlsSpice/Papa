// Универсальный обработчик форм для отправки заявок в Telegram
// - Поддерживает "быстрые" формы (только телефон) и "большие" формы (имя/email/продукт/сообщение).
// - Использует fetch(..., mode:'no-cors') + fallback через Image (надёжнее из браузера).
// - Не меняет HTML/внешний вид, автоматически находит все <form> на странице.
// Установка: положите файл в js/ и подключите <script src="js/telegram-forms.js"></script> перед </body>.

(function () {
  // ========== Настройки (вставьте ваш токен/чат) ==========
  const TELEGRAM_TOKEN = '8251382336:AAFvbnhvQ1ZrbKX8hz2xyPbjwJ7MWHDEV2Q';
  const TELEGRAM_CHAT_ID = '-1003450381746';
  // ========================================================

  function log(...args) {
    if (window.console) console.log('[tg-forms]', ...args);
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function encodeText(t) {
    return encodeURIComponent(t || '');
  }

  function buildBigText(payload) {
    const msg = (payload.message || '').toString().trim().replace(/\s{2,}/g, ' ').slice(0, 800) || 'Пусто';
    return `<b>🔥 НОВА ЗАЯВКА З ВЕЛИКОЇ ФОРМИ paparazzi.cam</b>\n\n` +
      `📱 Номер: <b>${escapeHtml(payload.phone)}</b>\n` +
      `👤 Ім’я: <b>${escapeHtml(payload.name || 'Не вказано')}</b>\n` +
      `✉️ Email: <b>${escapeHtml(payload.email || 'Не вказано')}</b>\n` +
      `🛒 Послуга: <b>${escapeHtml(payload.product || 'Не вказано')}</b>\n` +
      `💬 Повідомлення: ${escapeHtml(msg)}\n\n` +
      `🕐 Час: ${new Date().toLocaleString('uk-UA')}`;
  }

  function buildQuickText(payload) {
    return `<b>⚡ ШВИДКА ЗАЯВКА!</b>\n\n` +
      `📱 Номер: <b>${escapeHtml(payload.phone)}</b>\n` +
      `🕐 Час: ${new Date().toLocaleString('uk-UA')}\n` +
      `🌐 Сайт: paparazzi.cam`;
  }

  function sendViaImage(message, done) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeText(message)}&parse_mode=HTML&_=${Date.now()}`;
      const img = new Image();
      img.src = url;
      // не ждём загрузки — считаем, что запрос инициирован
      setTimeout(() => done && done(null), 700);
    } catch (err) {
      done && done(err);
    }
  }

  async function sendNoCorsThenFallback(message, done) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML&_=${Date.now()}`;
    try {
      // mode:'no-cors' — инициирует запрос, но ответ будет opaque
      await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
      done && done(null);
    } catch (err) {
      // В случае ошибки fetch — пробуем image
      sendViaImage(message, done);
    }
  }

  function getPhoneFromFD(fd, form) {
    // Проверяем возможные варианты имени поля (кириллица/латиница/англ)
    const byName = fd.get('Телефон') || fd.get('Телeфон') || fd.get('phone') || fd.get('phone_number') || fd.get('tel');
    if (byName) return byName;
    // fallback: найти первый input[type=tel|text] с value
    if (form) {
      const inp = form.querySelector('input[type="tel"], input[type="text"], input[name]');
      if (inp && inp.value) return inp.value;
    }
    return 'Не вказано';
  }

  function attachToForm(form) {
    if (!form || form.dataset.tgAttached) return;
    form.dataset.tgAttached = '1';

    // Определим тип формы: 'big' если есть поле name или textarea[name="message"], иначе 'quick'
    const isBig = !!(form.querySelector('input[name="name"]') || form.querySelector('textarea[name="message"]') || form.classList.contains('contact-form'));
    const isQuick = !isBig;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        const fd = new FormData(form);
        if (isBig) {
          const payload = {
            phone: getPhoneFromFD(fd, form),
            name: fd.get('name') || 'Не вказано',
            email: fd.get('email') || 'Не вказано',
            product: fd.get('Продукт') || fd.get('product') || 'Не вказано',
            message: fd.get('message') || ''
          };
          const text = buildBigText(payload);
          log('Big form submit:', { phone: payload.phone, name: payload.name, email: payload.email, product: payload.product });
          // Попытаемся отправить
          sendNoCorsThenFallback(text, function (err) {
            if (err) {
              console.error('tg send error:', err);
              alert('Помилка відправки. Подивіться консоль.');
              return;
            }
            alert('Дякую! Ми зв’яжемося з вами протягом 30 секунд 🚀');
            try { form.reset(); } catch (_) {}
          });
        } else {
          const payload = { phone: getPhoneFromFD(fd, form) };
          const text = buildQuickText(payload);
          log('Quick form submit:', payload);
          sendNoCorsThenFallback(text, function (err) {
            if (err) {
              console.error('tg send error (quick):', err);
              alert('Помилка відправки. Подивіться консоль.');
              return;
            }
            alert('Дякую! Ми зв’яжемося з вами протягом 30 секунд 🚀');
            try { form.reset(); } catch (_) {}
          });
        }
      } catch (err) {
        console.error('form handler error', err);
      }
    });
    log('Attached TG handler to form', form);
  }

  function attachAll() {
    const forms = Array.from(document.getElementsByTagName('form'));
    if (!forms.length) {
      log('No forms found on page');
      return;
    }
    forms.forEach(attachToForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAll);
  } else {
    attachAll();
  }
})();
