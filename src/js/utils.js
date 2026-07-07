// ═══════════════════════════════════════
//  utils.js — Hàm tiện ích
//  Phụ thuộc: state.js
// ═══════════════════════════════════════

// ── SERVICE HELPERS ──
function svcL(v) {
  if (!v) return v;
  return v.split('|').map(s => {
    const x = getSVCS().find(i => i.v === s);
    return x ? x.l : s;
  }).join(' · ');
}

function svcCheckboxes(selected, idPrefix) {
  const vals = selected ? selected.split('|') : [];
  const pills = SVCS_USER.map(s => {
    const on = vals.includes(s.v);
    return `<button type="button" data-val="${s.v}" data-active="${on?'1':'0'}" id="${idPrefix}-${s.v}"
      onclick="toggleSvcPill('${idPrefix}','${s.v}',this)"
      style="padding:6px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;line-height:1.5;width:100%;text-align:center;
        background:${on?'var(--rose)':'var(--surface-2)'};
        color:${on?'#fff':'var(--t2)'};
        border:1.5px solid ${on?'var(--rose)':'var(--br2)'}">${s.l}</button>`;
  }).join('');
  return `<div id="${idPrefix}-wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${pills}</div>`;
}

function toggleSvcPill(idPrefix, val, btn) {
  if (!btn) btn = document.getElementById(idPrefix+'-'+val);
  if (!btn) return;
  const on = btn.dataset.active === '1';
  btn.dataset.active = on ? '0' : '1';
  btn.style.background = on ? 'var(--surface-2)' : 'var(--rose)';
  btn.style.color = on ? 'var(--t2)' : '#fff';
  btn.style.border = '1.5px solid ' + (on ? 'var(--br2)' : 'var(--rose)');
}

function getCheckedSvc(idPrefix) {
  const wrap = document.getElementById(idPrefix+'-wrap');
  if (!wrap) return '';
  return Array.from(wrap.querySelectorAll('button[data-val]'))
    .filter(b => b.dataset.active === '1').map(b => b.dataset.val).join('|');
}

function updateSvcCheckbox(idPrefix) {}

// ── FORMAT HELPERS ──
function fmtM(n) { if (!n) return '0đ'; return n.toLocaleString('vi-VN') + 'đ'; }

function fmtT(ms) {
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h > 0) return h + 'h ' + String(m%60).padStart(2,'0') + 'm';
  return String(m).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}

function fmtP(ut) { return fmtT(Math.max(0, ut - Date.now())); }

// ── QUEUE HELPERS ──
function readyW() { return W.filter(w => w.status === 'ready'); }

function smartQueue() {
  const rd = readyW();
  return rd.sort((a, b) => {
    const aT = a.lastFinishTime || a.checkinTime || 0;
    const bT = b.lastFinishTime || b.checkinTime || 0;
    return aT - bT;
  });
}

function avgSpeed(w) {
  const validH = (w.history || []).filter(h => h.durationMs && h.durationMs > 60000);
  if (!validH.length) return null;
  return validH.reduce((s, h) => s + h.durationMs, 0) / validH.length;
}

function speedLabel(w) {
  const avg = avgSpeed(w);
  if (!avg) return null;
  return Math.round(avg / 60000) + ' phút/turn';
}

// ── TOAST ──
function toast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-txt').textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}
