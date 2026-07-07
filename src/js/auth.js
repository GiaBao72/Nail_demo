// ═══════════════════════════════════════
//  auth.js — PIN authentication gate
//  Chạy sau main.js, tạo overlay chặn đến khi PIN xác thực xong
// ═══════════════════════════════════════

(function authGuard() {
  const PIN_KEY     = 'nt_pin_hash';
  const SESSION_KEY = 'nt_authed';

  // Đã authed trong session này → bỏ qua
  if (sessionStorage.getItem(SESSION_KEY) === '1') return;

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const storedHash = localStorage.getItem(PIN_KEY);
  let pinInput = '';
  let phase    = storedHash ? 'login' : 'create'; // 'create' | 'confirm' | 'login'
  let firstPin = '';

  // ── Inject styles (kept in DOM để settings.js tái dùng classes) ──
  const style = document.createElement('style');
  style.id = 'auth-styles';
  style.textContent = `
    #auth-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,12,6,.95);display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif}
    .auth-card{background:#FDFAF5;border-radius:20px;padding:36px 28px 28px;width:300px;max-width:92vw;text-align:center;box-shadow:0 32px 80px rgba(20,12,6,.50);border:1px solid rgba(184,145,42,.15)}
    .auth-logo{font-size:36px;margin-bottom:10px}
    .auth-title{font-size:19px;font-weight:700;color:#1A1310;margin-bottom:5px}
    .auth-sub{font-size:12.5px;color:#7A6048;margin-bottom:22px;line-height:1.5}
    .auth-dots{display:flex;justify-content:center;gap:12px;margin-bottom:8px}
    .auth-dot{width:13px;height:13px;border-radius:50%;border:2px solid #D4C5B0;background:#FDFAF5;transition:.12s}
    .auth-dot.filled{background:#B8912A;border-color:#B8912A;box-shadow:0 0 8px rgba(184,145,42,.45)}
    .auth-err{font-size:12px;color:#E11D48;min-height:18px;margin-bottom:10px;transition:.2s}
    .auth-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
    .auth-key{height:52px;border-radius:10px;border:1.5px solid rgba(184,145,42,.18);background:#FAF6ED;font-size:20px;font-weight:600;color:#1A1310;cursor:pointer;transition:.1s;-webkit-tap-highlight-color:transparent;user-select:none}
    .auth-key:active,.auth-key:focus{background:#EDE8D8;transform:scale(.96);outline:none;border-color:rgba(184,145,42,.35)}
    .auth-skip{background:none;border:none;color:#A89272;font-size:11.5px;cursor:pointer;padding:6px 8px;line-height:1}
    .auth-skip:hover{color:#7A6048}
  `;
  if (!document.getElementById('auth-styles')) {
    document.head.appendChild(style);
  }

  // ── Build overlay ──
  function buildOverlay() {
    const ov = document.createElement('div');
    ov.id = 'auth-overlay';
    ov.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">💅</div>
        <div class="auth-title" id="auth-title">${storedHash ? 'Nail Turn' : 'Tạo mã PIN'}</div>
        <div class="auth-sub" id="auth-sub">${storedHash ? 'Nhập mã PIN để vào ứng dụng' : 'Đặt mã PIN 4 chữ số để bảo vệ ứng dụng'}</div>
        <div class="auth-dots" id="auth-dots">
          ${[0,1,2,3].map(i => `<div class="auth-dot" id="dot-${i}"></div>`).join('')}
        </div>
        <div class="auth-err" id="auth-err"></div>
        <div class="auth-pad">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
            k === '' ? '<div></div>' :
            `<button class="auth-key" onclick="authKey('${k}')">${k}</button>`
          ).join('')}
        </div>
        ${storedHash
          ? '<button class="auth-skip" onclick="authSkip()">Bỏ qua (không dùng PIN)</button>'
          : '<button class="auth-skip" onclick="authSkip()">Bỏ qua, không dùng PIN</button>'
        }
      </div>`;
    document.body.appendChild(ov);
  }

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      document.getElementById('dot-' + i)?.classList.toggle('filled', i < pinInput.length);
    }
  }

  function setErr(msg) {
    const el = document.getElementById('auth-err');
    if (el) el.textContent = msg;
  }

  function setTitle(t, s) {
    const title = document.getElementById('auth-title');
    const sub   = document.getElementById('auth-sub');
    if (title) title.textContent = t;
    if (sub)   sub.textContent   = s;
  }

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1');
    document.getElementById('auth-overlay')?.remove();
    delete window.authKey;
    delete window.authSkip;
  }

  window.authKey = async function(k) {
    if (k === '⌫') { pinInput = pinInput.slice(0, -1); updateDots(); setErr(''); return; }
    if (pinInput.length >= 4) return;
    pinInput += String(k);
    updateDots();
    if (pinInput.length < 4) return;

    if (phase === 'login') {
      const hash = await sha256(pinInput);
      if (hash === localStorage.getItem(PIN_KEY)) {
        unlock();
      } else {
        setErr('PIN sai, thử lại');
        pinInput = '';
        setTimeout(updateDots, 80);
      }

    } else if (phase === 'create') {
      firstPin = pinInput; pinInput = ''; phase = 'confirm';
      setTitle('Nhập lại PIN', 'Xác nhận mã PIN của bạn');
      updateDots(); setErr('');

    } else { // confirm
      if (pinInput !== firstPin) {
        setErr('PIN không khớp, thử lại từ đầu');
        pinInput = ''; firstPin = ''; phase = 'create';
        setTitle('Tạo mã PIN', 'Đặt mã PIN 4 chữ số để bảo vệ ứng dụng');
        updateDots();
      } else {
        const hash = await sha256(pinInput);
        localStorage.setItem(PIN_KEY, hash);
        unlock();
      }
    }
  };

  window.authSkip = function() {
    sessionStorage.setItem(SESSION_KEY, '1');
    document.getElementById('auth-overlay')?.remove();
    delete window.authKey;
    delete window.authSkip;
  };

  buildOverlay();
})();
