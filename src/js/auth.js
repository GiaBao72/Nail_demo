// ═══════════════════════════════════════
//  auth.js — PIN authentication gate
//  Mặc định PIN: 0000. Đổi PIN → Hệ thống.
// ═══════════════════════════════════════

(function authGuard() {
  const PIN_KEY     = 'nt_pin_hash';
  const SESSION_KEY = 'nt_authed';

  if (sessionStorage.getItem(SESSION_KEY) === '1') return;

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Nếu chưa có PIN → set mặc định 0000
  async function ensureDefaultPin() {
    if (!localStorage.getItem(PIN_KEY)) {
      const hash = await sha256('0000');
      localStorage.setItem(PIN_KEY, hash);
    }
  }

  let pinInput = '';

  // ── Inject styles ──
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
    .auth-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .auth-key{height:52px;border-radius:10px;border:1.5px solid rgba(184,145,42,.18);background:#FAF6ED;font-size:20px;font-weight:600;color:#1A1310;cursor:pointer;transition:.1s;-webkit-tap-highlight-color:transparent;user-select:none}
    .auth-key:active,.auth-key:focus{background:#EDE8D8;transform:scale(.96);outline:none;border-color:rgba(184,145,42,.35)}
  `;
  if (!document.getElementById('auth-styles')) {
    document.head.appendChild(style);
  }

  function buildOverlay() {
    const ov = document.createElement('div');
    ov.id = 'auth-overlay';
    ov.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">💅</div>
        <div class="auth-title" id="auth-title">Nail Turn</div>
        <div class="auth-sub" id="auth-sub">Nhập mã PIN để vào ứng dụng</div>
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

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1');
    document.getElementById('auth-overlay')?.remove();
    delete window.authKey;
  }

  window.authKey = async function(k) {
    if (k === '⌫') { pinInput = pinInput.slice(0, -1); updateDots(); setErr(''); return; }
    if (pinInput.length >= 4) return;
    pinInput += String(k);
    updateDots();
    if (pinInput.length < 4) return;

    const hash = await sha256(pinInput);
    if (hash === localStorage.getItem(PIN_KEY)) {
      unlock();
    } else {
      setErr('PIN sai, thử lại');
      pinInput = '';
      setTimeout(updateDots, 80);
    }
  };

  ensureDefaultPin().then(buildOverlay);
})();
