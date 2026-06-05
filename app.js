// ═══════════════════════════════════════
//  NAIL TURN — app.js
//  International Standard Logic
// ═══════════════════════════════════════

const SVCS = [
  { v: '', l: '— Chọn dịch vụ —' },
  { v: 'Manicure',   l: '💅 Manicure' },
  { v: 'Pedicure',   l: '🦶 Pedicure' },
  { v: 'Gel',        l: '✨ Gel Nails' },
  { v: 'Dip',        l: '🌸 Dip Powder' },
  { v: 'Acrylic',    l: '💎 Acrylic' },
  { v: 'Art',        l: '🎨 Nail Art' },
  { v: 'Wax',        l: '🪡 Waxing' },
  { v: 'Brow',       l: '👁 Eyebrow' },
  { v: 'Combo',      l: '⭐ Combo Set' },
];

// ── STATE ──
function mkW(id, name, ini) {
  return { id, name, ini, turns: 0, status: 'ready', note: '', startTime: null, service: '', revenue: 0, tip: 0, totalRevenue: 0, totalTip: 0, history: [], groupId: null };
}

let W = [
  mkW(1,'Lan','LA'), mkW(2,'Hoa','HO'), mkW(3,'Mai','MA'), mkW(4,'Tú','TU'),
  mkW(5,'Bích','BI'), mkW(6,'Linh','LI'), mkW(7,'Ngọc','NG'),
  mkW(8,'Thảo','TH'), mkW(9,'Yến','YE'), mkW(10,'Dung','DU'),
];

let totalTurns = 0;
let nextId = 11;
let selId = null;
let exHist = new Set();
let multiMode = false;
let multiSel = new Set();
let penT = {};
let searchQ = '';
let filterStatus = 'all';
let dragSrcId = null;
let dailyLogs = JSON.parse(localStorage.getItem('nt_dailyLogs') || '[]');

// max busy time before progress bar full (60 min)
const MAX_BUSY_MS = 60 * 60 * 1000;

// ── UTILS ──
function svcL(v) { const s = SVCS.find(x => x.v === v); return s ? s.l : v; }
function fmtM(n) { if (!n) return '0đ'; return n.toLocaleString('vi-VN') + 'đ'; }
function fmtT(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h > 0) return h + 'h ' + String(m % 60).padStart(2, '0') + 'm';
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function fmtP(ut) {
  const ms = Math.max(0, ut - Date.now());
  return fmtT(ms);
}
function readyW() { return W.filter(w => w.status === 'ready'); }

function toast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-txt').textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── CLOCK ──
function tick() {
  const n = new Date();
  document.getElementById('clock').textContent =
    String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
  const days = ['CN','T2','T3','T4','T5','T6','T7'];
  document.getElementById('clock-day').textContent =
    days[n.getDay()] + ' ' + String(n.getDate()).padStart(2, '0') + '/' + String(n.getMonth() + 1).padStart(2, '0');
  const h = n.getHours();
  document.getElementById('shift-tag').textContent = h < 12 ? 'Ca sáng' : h < 17 ? 'Ca chiều' : 'Ca tối';

  // Update timers in cards
  W.filter(w => w.status === 'busy' && w.startTime).forEach(w => {
    const t = fmtT(Date.now() - w.startTime);
    const e1 = document.getElementById('ct-' + w.id); if (e1) e1.textContent = t;
    const e2 = document.getElementById('pt-' + w.id); if (e2) e2.textContent = t;
    const pb = document.getElementById('pb-' + w.id);
    if (pb) pb.style.width = Math.min(100, ((Date.now() - w.startTime) / MAX_BUSY_MS) * 100) + '%';
  });
  // Group card timers
  const groups = {};
  W.filter(w => w.status === 'busy' && w.groupId).forEach(w => {
    if (!groups[w.groupId]) groups[w.groupId] = w;
  });
  Object.entries(groups).forEach(([gid, w]) => {
    if (!w.startTime) return;
    const t = fmtT(Date.now() - w.startTime);
    const e = document.getElementById('ct-g-' + gid); if (e) e.textContent = t;
    const pb = document.getElementById('pb-g-' + gid);
    if (pb) pb.style.width = Math.min(100, ((Date.now() - w.startTime) / MAX_BUSY_MS) * 100) + '%';
  });

  // Penalty countdowns
  let needRender = false;
  Object.keys(penT).forEach(sid => {
    const id = parseInt(sid), pt = penT[id]; if (!pt) return;
    if (Date.now() >= pt.ut) {
      const w = W.find(x => x.id === id);
      if (w) { W = W.filter(x => x.id !== id); w.status = 'ready'; delete penT[id]; W.push(w); }
      needRender = true;
    } else {
      const e1 = document.getElementById('cpen-' + id); if (e1) e1.textContent = fmtP(pt.ut);
      const e2 = document.getElementById('popen-' + id); if (e2) e2.textContent = fmtP(pt.ut);
    }
  });
  if (needRender) render();
}

tick();
setInterval(tick, 1000);

// ── RENDER STATS ──
function renderStats() {
  const rd = readyW(), busy = W.filter(w => w.status === 'busy');
  const rv = W.reduce((s, w) => s + w.totalRevenue, 0);
  const tp = W.reduce((s, w) => s + w.totalTip, 0);
  document.getElementById('stat-ready').textContent = rd.length;
  document.getElementById('stat-busy').textContent = busy.length;
  document.getElementById('stat-turns').textContent = totalTurns;
  document.getElementById('stat-rev').textContent = fmtM(rv);
  document.getElementById('stat-tip').textContent = fmtM(tp);

  const nxt = rd[0];
  const card = document.getElementById('next-worker-card');
  document.getElementById('nwc-name').textContent = nxt ? nxt.name : '—';
  document.getElementById('nwc-sub').textContent = nxt ? rd.length + ' thợ đang chờ' : 'Không có thợ rảnh';
  document.getElementById('nwc-label').textContent = nxt ? 'LƯỢT TIẾP THEO' : 'HÀNG CHỜ';
  card.className = 'next-worker-card' + (nxt ? '' : ' nwc-empty');
}

// ── RENDER STAFF GRID ──
function renderGrid() {
  const rd = readyW();
  const groupMembers = {};
  W.filter(w => w.groupId).forEach(w => {
    if (!groupMembers[w.groupId]) groupMembers[w.groupId] = [];
    groupMembers[w.groupId].push(w.name);
  });
  const groups = {};
  W.filter(w => w.status === 'busy' && w.groupId).forEach(w => {
    if (!groups[w.groupId]) groups[w.groupId] = [];
    groups[w.groupId].push(w);
  });
  const groupedIds = new Set(Object.values(groups).flat().map(w => w.id));

  // Apply search + filter
  const q = searchQ.toLowerCase();
  function visible(w) {
    if (q && !w.name.toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all' && w.status !== filterStatus) return false;
    return true;
  }

  const order = [
    ...rd,
    ...W.filter(w => w.status === 'busy' && !w.groupId),
    ...W.filter(w => w.status === 'off'),
    ...W.filter(w => w.status === 'penalized'),
  ];

  let html = '';

  order.forEach(w => {
    if (groupedIds.has(w.id)) return;
    if (!visible(w)) return;
    html += renderSingleCard(w, rd);
  });

  // Group cards
  Object.entries(groups).forEach(([gid, members]) => {
    const anyVisible = members.some(m => visible(m));
    if (!anyVisible) return;
    html += renderGroupCard(gid, members, rd);
  });

  if (!html) html = '<div style="text-align:center;padding:40px;color:var(--t4);font-size:13px">Không tìm thấy thợ nào</div>';

  document.getElementById('staff-grid').innerHTML = html;
  initDragDelegation();
}


function renderSingleCard(w, rd) {
  const isNext = w === rd[0];
  const isSel = w.id === selId;
  const isChk = multiSel.has(w.id);
  const isPen = w.status === 'penalized';
  const hasH = w.history && w.history.length > 0;
  const isExp = exHist.has(w.id);
  const pt = penT[w.id];

  let cc = 'staff-card';
  if (isNext) cc += ' sc-next';
  if (w.status === 'busy') cc += ' sc-busy';
  if (w.status === 'off') cc += ' sc-off';
  if (isPen) cc += ' sc-pen';
  if (isSel) cc += ' sc-selected';

  const stripCls = 'sc-strip strip-' + (isNext ? 'next' : isPen ? 'pen' : w.status);
  const avCls = 'sc-avatar av-' + (isNext ? 'next' : isPen ? 'pen' : w.status === 'busy' ? 'busy' : w.status === 'off' ? 'off' : 'ready');

  let badge = '';
  if (isPen) badge = '<span class="sc-badge sb-pen">Bị phạt</span>';
  else if (isNext) badge = '<span class="sc-badge sb-next">Tiếp theo</span>';
  else if (w.status === 'ready') badge = '<span class="sc-badge sb-ready">Rảnh</span>';
  else if (w.status === 'busy') badge = '<span class="sc-badge sb-busy">Đang làm</span>';
  else badge = '<span class="sc-badge sb-off">Nghỉ</span>';

  const rank = w.status === 'ready' ? rd.indexOf(w) + 1 : null;

  let progressHtml = '';
  if (w.status === 'busy' && w.startTime) {
    const pct = Math.min(100, ((Date.now() - w.startTime) / MAX_BUSY_MS) * 100);
    progressHtml = `<div class="sc-progress"><div class="sc-progress-fill" id="pb-${w.id}" style="width:${pct}%"></div></div>`;
  }

  let tags = '';
  if (w.service) tags += `<span class="sc-tag t-svc">${svcL(w.service)}</span>`;
  if (w.status === 'busy' && w.startTime) tags += `<span class="sc-tag t-timer">⏱ <span id="ct-${w.id}">${fmtT(Date.now() - w.startTime)}</span></span>`;
  if (isPen && pt) tags += `<span class="sc-tag t-pen" id="cpen-${w.id}">${fmtP(pt.ut)}</span>`;
  const tagsHtml = tags ? `<div class="sc-tags">${tags}</div>` : '';
  const revHtml = w.totalRevenue ? `<div class="sc-rev">${fmtM(w.totalRevenue)}${w.totalTip ? ' · tip ' + fmtM(w.totalTip) : ''}</div>` : '';

  let qaHtml = '';
  if (multiMode && w.status === 'ready') {
    qaHtml = `<button class="qa-btn ${isChk ? 'qa-primary' : ''}" onclick="event.stopPropagation();toggleChk(${w.id})">${isChk ? '✓ Đã chọn' : 'Chọn'}</button>`;
  } else if (w.status === 'ready') {
    qaHtml = `<button class="qa-btn qa-primary" onclick="event.stopPropagation();assignW(${w.id})">Giao turn</button>
      <button class="qa-btn" onclick="event.stopPropagation();openDetail(${w.id})">Chi tiết</button>`;
  } else if (w.status === 'busy') {
    qaHtml = `<button class="qa-btn qa-green" onclick="event.stopPropagation();finishW(${w.id},1)">✓ Xong</button>
      <button class="qa-btn" onclick="event.stopPropagation();openDetail(${w.id})">Chi tiết</button>`;
  } else if (isPen) {
    qaHtml = `<button class="qa-btn qa-green" onclick="event.stopPropagation();remPen(${w.id})">Gỡ phạt</button>
      <button class="qa-btn" onclick="event.stopPropagation();openDetail(${w.id})">Chi tiết</button>`;
  } else {
    qaHtml = `<button class="qa-btn qa-primary" onclick="event.stopPropagation();openDetail(${w.id})">Chi tiết</button>`;
  }

  let histHtml = '';
  if (hasH) {
    histHtml = `<div class="hist-wrap">
      <div class="hist-toggle${isExp ? ' open' : ''}" onclick="togHist(event,${w.id})">
        <span>Lịch sử (${w.history.length})</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="hist-body">
        ${w.history.map(h => `<div class="hr">
          <div><div class="hr-t">${h.ti}</div><div class="hr-d">${h.dur}</div></div>
          <div><div class="hr-s">${h.svc ? svcL(h.svc) : '—'}</div>${h.note ? '<div class="hr-n">' + h.note + '</div>' : ''}</div>
          <div><div class="hr-r">${h.rev ? fmtM(h.rev) : '—'}</div>${h.tip ? '<div class="hr-tp">tip ' + fmtM(h.tip) + '</div>' : ''}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  const clickFn = multiMode && w.status === 'ready' ? `toggleChk(${w.id})` : `openPopup(${w.id})`;

  const draggable = w.status === 'ready' && !multiMode ? 'draggable="true" data-id="'+w.id+'"' : '';
  return `<div>
    <div class="${cc}" ${draggable} onclick="${clickFn}">
      <div class="${stripCls}"></div>
      <div class="sc-body">
        <div class="sc-top">
          <div class="${avCls}">${w.ini}</div>
          <div class="sc-info">
            <div class="sc-name">${rank ? '<span style="font-size:10px;color:var(--t4);font-weight:700;margin-right:4px">#'+rank+'</span>' : ''}${w.name}</div>
            <div class="sc-turns">${w.turns} turn hôm nay</div>
            ${progressHtml}${tagsHtml}${revHtml}
          </div>
          ${badge}
        </div>
        <div class="sc-actions">${qaHtml}</div>
      </div>
    </div>
    ${histHtml}
  </div>`;
}

function render() {
  if (currentTab !== 'shift') return;
  renderStats();
  renderGrid();
  // multi bar
  const mb = document.getElementById('multi-bar');
  if (mb) { mb.style.display = multiMode ? 'flex' : 'none'; }
  const mc = document.getElementById('multi-cnt'); if (mc) mc.textContent = multiSel.size;
  const bm = document.getElementById('btn-multi');
  if (bm) { bm.style.background = multiMode ? '#1D4ED8' : ''; bm.style.color = multiMode ? '#fff' : '#3B82F6'; }
}

// ── POPUP: HISTORY (click card) ──
function openPopup(id) {
  selId = id;
  const w = W.find(x => x.id === id); if (!w) return;
  const avCls = w.status === 'ready' ? 'av-ready' : w.status === 'busy' ? 'av-busy' : w.status === 'penalized' ? 'av-pen' : 'av-off';
  const stLbl = w.status === 'ready' ? 'Rảnh' : w.status === 'busy' ? 'Đang làm' : w.status === 'penalized' ? 'Bị phạt' : 'Nghỉ';

  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av ${avCls}">${w.ini}</div>
    <div>
      <div class="popup-name">${w.name}</div>
      <div class="popup-meta">${w.turns} turn · ${fmtM(w.totalRevenue)}${w.totalTip ? ' · tip ' + fmtM(w.totalTip) : ''}</div>
    </div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;

  const histRows = w.history.length
    ? w.history.map(h => `<div class="hr">
        <div><div class="hr-t">${h.ti}</div><div class="hr-d">${h.dur}</div></div>
        <div><div class="hr-s">${h.svc ? svcL(h.svc) : '—'}</div>${h.note ? '<div class="hr-n">' + h.note + '</div>' : ''}</div>
        <div><div class="hr-r">${h.rev ? fmtM(h.rev) : '—'}</div>${h.tip ? '<div class="hr-tp">tip ' + fmtM(h.tip) + '</div>' : ''}</div>
      </div>`).join('')
    : '<div style="text-align:center;padding:24px 0;color:var(--t4);font-size:13px">Chưa có lịch sử ca nào</div>';

  document.getElementById('popup-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="mini-stat"><div class="ms-val">${w.turns}</div><div class="ms-lbl">Turn hôm nay</div></div>
      <div class="mini-stat"><div class="ms-val" style="color:var(--c-ready)">${fmtM(w.totalRevenue)}</div><div class="ms-lbl">Doanh thu</div></div>
      <div class="mini-stat"><div class="ms-val" style="color:#3B82F6">${fmtM(w.totalTip)}</div><div class="ms-lbl">Tip</div></div>
    </div>
    <div>
      <div class="f-label" style="margin-bottom:8px">Lịch sử ca hôm nay</div>
      <div style="max-height:280px;overflow-y:auto">${histRows}</div>
    </div>
    <button class="btn btn-ghost" onclick="closePopup()">Đóng</button>`;

  document.getElementById('popup-overlay').style.display = 'flex';
}

// ── POPUP: DETAIL / ACTIONS (nút Chi tiết) ──
function openDetail(id) {
  selId = id;
  const w = W.find(x => x.id === id); if (!w) return;
  const avCls = w.status === 'ready' ? 'av-ready' : w.status === 'busy' ? 'av-busy' : w.status === 'penalized' ? 'av-pen' : 'av-off';
  const stLbl = w.status === 'ready' ? 'Rảnh' : w.status === 'busy' ? 'Đang làm' : w.status === 'penalized' ? 'Bị phạt' : 'Nghỉ';

  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av ${avCls}">${w.ini}</div>
    <div>
      <div class="popup-name">${w.name}</div>
      <div class="popup-meta">${w.turns} turn hôm nay · ${stLbl}</div>
    </div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;

  let body = '';

  if (w.status === 'busy') {
    const elapsed = w.startTime ? Date.now() - w.startTime : 0;
    const startStr = w.startTime ? new Date(w.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const opts = SVCS.map(s => `<option value="${s.v}"${w.service === s.v ? ' selected' : ''}>${s.l}</option>`).join('');
    body = `
      <div class="popup-timer">
        <div class="pt-val" id="pt-${w.id}">${fmtT(elapsed)}</div>
        <div class="pt-sub">Bắt đầu lúc ${startStr}</div>
      </div>
      <div>
        <div class="f-label">Dịch vụ</div>
        <select class="f-select" id="sv-${w.id}">${opts}</select>
      </div>
      <div class="f-row">
        <div class="f-group">
          <div class="f-label">Tiền dịch vụ</div>
          <input class="f-input" type="number" id="rv-${w.id}" min="0" step="1000" placeholder="0" value="${w.revenue || ''}">
        </div>
        <div class="f-group">
          <div class="f-label">Tip</div>
          <input class="f-input" type="number" id="tp-${w.id}" min="0" step="1000" placeholder="0" value="${w.tip || ''}">
        </div>
      </div>
      <div>
        <div class="f-label">Ghi chú</div>
        <textarea class="f-textarea" id="nt-${w.id}" rows="2" placeholder="Khách VIP, hẹn lại...">${w.note || ''}</textarea>
      </div>
      <button class="btn btn-dark" onclick="saveInfo(${w.id})" style="margin-top:2px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Lưu thông tin
      </button>
      <div class="sec-div"><div class="sec-div-line"></div><div class="sec-div-txt">Xong việc — tính turn</div><div class="sec-div-line"></div></div>
      <div class="btn-row">
        <button class="btn btn-dark btn-sm" style="flex:1" onclick="finishW(${w.id},1)">1 turn</button>
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="finishW(${w.id},0.5)">½ turn</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--t3)" onclick="finishW(${w.id},0)">0 turn</button>
      </div>`;
  } else if (w.status === 'penalized') {
    const pt = penT[w.id];
    body = `
      <div class="pen-timer-display">
        <div class="ptd-val" id="popen-${w.id}">${pt ? fmtP(pt.ut) : '--:--'}</div>
        <div class="ptd-sub">Còn lại</div>
      </div>
      <button class="btn btn-green" onclick="remPen(${w.id})">✅ Gỡ phạt sớm</button>`;
  } else if (w.status === 'ready') {
    body = `
      <button class="btn btn-rose" onclick="assignW(${w.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        Giao turn ngay
      </button>
      <button class="btn btn-ghost" onclick="setSt(${w.id},'off')">😴 Cho nghỉ</button>
      <div>
        <div class="f-label" style="margin-bottom:8px">🔒 Phạt / Khóa ca</div>
        <div class="pen-grid">
          <button class="pen-opt" onclick="penW(${w.id},0.5)">30 phút</button>
          <button class="pen-opt" onclick="penW(${w.id},1)">1 giờ</button>
          <button class="pen-opt" onclick="penW(${w.id},2)">2 giờ</button>
          <button class="pen-opt" onclick="penW(${w.id},3)">3 giờ</button>
        </div>
      </div>`;
  } else {
    body = `
      <button class="btn btn-dark" onclick="setSt(${w.id},'ready')">✅ Vào làm lại</button>
      <button class="btn btn-ghost" style="color:var(--c-pen);border-color:var(--c-pen-b)" onclick="removeW(${w.id})">Xóa khỏi ca</button>`;
  }

  document.getElementById('popup-body').innerHTML = body;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function closePopup() {
  document.getElementById('popup-overlay').style.display = 'none';
  selId = null;
  render();
}

function closePopupOnOverlay(e) {
  if (e.target === document.getElementById('popup-overlay')) closePopup();
}

// ── ACTIONS ──
function togHist(e, id) {
  e.stopPropagation();
  exHist.has(id) ? exHist.delete(id) : exHist.add(id);
  renderGrid();
}

function toggleChk(id) {
  multiSel.has(id) ? multiSel.delete(id) : multiSel.add(id);
  render();
}

function saveSvc(id) {
  const e = document.getElementById('sv-' + id);
  const w = W.find(x => x.id === id);
  if (w && e) { w.service = e.value; renderGrid(); }
}

function saveInfo(id) {
  const w = W.find(x => x.id === id); if (!w) return;
  const sv = document.getElementById('sv-' + id);
  const rv = document.getElementById('rv-' + id);
  const tp = document.getElementById('tp-' + id);
  const nt = document.getElementById('nt-' + id);
  if (sv) w.service = sv.value;
  if (rv) w.revenue = parseFloat(rv.value) || 0;
  if (tp) w.tip = parseFloat(tp.value) || 0;
  if (nt) w.note = nt.value.trim();
  toast('Đã lưu thông tin ' + w.name + ' ✓');
  renderGrid();
}

function assignNext() {
  const rd = readyW(); if (!rd.length) { toast('Không có thợ rảnh!'); return; }
  const w = rd[0];
  // Confirm popup
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-ready">${w.ini}</div>
    <div>
      <div class="popup-name">${w.name}</div>
      <div class="popup-meta">Lượt #${rd.indexOf(w)+1} trong hàng chờ</div>
    </div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0 4px">
      <div style="font-size:13px;color:var(--t2);line-height:1.7">Giao ca cho <strong>${w.name}</strong>?<br><span style="font-size:12px;color:var(--t3)">${rd.length} thợ đang chờ turn</span></div>
    </div>
    <button class="btn btn-rose" onclick="confirmAssignNext(${w.id})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      Xác nhận giao ca
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function confirmAssignNext(id) {
  const w = W.find(x => x.id === id); if (!w || w.status !== 'ready') return;
  w.status = 'busy'; w.turns++; totalTurns++; w.note = ''; w.startTime = Date.now(); w.service = '';
  toast('Giao turn cho ' + w.name + ' 💅');
  closePopup();
}

function assignW(id) {
  const w = W.find(x => x.id === id); if (!w || w.status !== 'ready') return;
  w.status = 'busy'; w.turns++; totalTurns++; w.note = ''; w.startTime = Date.now(); w.service = '';
  toast('Giao turn cho ' + w.name + ' 💅');
  closePopup();
}

function finishW(id, tw) {
  const w = W.find(x => x.id === id); if (!w) return;
  const ne = document.getElementById('nt-' + id);
  const re = document.getElementById('rv-' + id);
  const te = document.getElementById('tp-' + id);
  if (ne) w.note = ne.value.trim();
  const rev = re ? parseFloat(re.value) || 0 : 0;
  const tip = te ? parseFloat(te.value) || 0 : 0;
  w.totalRevenue = (w.totalRevenue || 0) + rev;
  w.totalTip = (w.totalTip || 0) + tip;
  w.turns = Math.round((w.turns - 1 + tw) * 10) / 10;
  totalTurns = Math.round((totalTurns - 1 + tw) * 10) / 10;
  const dur = w.startTime ? Date.now() - w.startTime : 0;
  const ti = w.startTime ? new Date(w.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-';
  if (!w.history) w.history = [];
  w.history.push({ ti, dur: fmtT(dur), svc: w.service, rev, tip, note: w.note, tw });
  exHist.add(w.id);
  W = W.filter(x => x.id !== id);
  w.status = 'ready'; w.note = ''; w.startTime = null; w.service = ''; w.revenue = 0; w.tip = 0; w.groupId = null;
  W.push(w);
  selId = null;
  toast(w.name + ' xong việc — về cuối hàng ✓');
  closePopup();
}

function setSt(id, s) {
  const w = W.find(x => x.id === id); if (!w) return;
  W = W.filter(x => x.id !== id); w.status = s; W.push(w); selId = null;
  toast(w.name + ': ' + (s === 'off' ? 'Cho nghỉ 😴' : 'Vào làm lại ✅'));
  closePopup();
}

function removeW(id) {
  const w = W.find(x => x.id === id);
  if (!confirm('Xóa ' + w.name + ' khỏi ca?')) return;
  W = W.filter(x => x.id !== id); selId = null;
  closePopup();
}

function addWorker() {
  const nm = prompt('Tên thợ mới:'); if (!nm || !nm.trim()) return;
  const n = nm.trim(), ini = n.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  W.push(mkW(nextId++, n, ini));
  toast('Đã thêm ' + n + ' ✨');
  render();
}

function toggleMulti() {
  multiMode = !multiMode; multiSel.clear(); selId = null; render();
}

function cancelMulti() {
  multiMode = false; multiSel.clear(); render();
}

function assignMulti() {
  if (multiSel.size < 2) { toast('Chọn ít nhất 2 thợ!'); return; }
  const gid = 'G' + Date.now();
  [...multiSel].forEach(id => {
    const w = W.find(x => x.id === id); if (!w || w.status !== 'ready') return;
    w.status = 'busy'; w.turns++; w.note = ''; w.startTime = Date.now(); w.service = ''; w.groupId = gid;
  });
  totalTurns += multiSel.size;
  toast('Đã giao ca cho ' + multiSel.size + ' thợ 👥');
  multiMode = false; multiSel.clear();
  render();
}

function penW(id, hours) {
  const w = W.find(x => x.id === id); if (!w) return;
  W = W.filter(x => x.id !== id); w.status = 'penalized';
  penT[w.id] = { ut: Date.now() + hours * 3600000 }; W.push(w); selId = null;
  const lbl = hours < 1 ? (hours * 60) + ' phút' : hours + ' giờ';
  toast(w.name + ' bị phạt ' + lbl + ' 🔒');
  closePopup();
}

function remPen(id) {
  const w = W.find(x => x.id === id); if (!w) return;
  W = W.filter(x => x.id !== id); w.status = 'ready'; delete penT[id]; W.push(w); selId = null;
  toast('Gỡ phạt cho ' + w.name + ' ✅');
  closePopup();
}

// ── TABS ──
let currentTab = 'shift'; // 'shift' | 'staff' | 'report'

function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => {
    const t = b.getAttribute('onclick') || '';
    b.className = 'nav-btn' + (t.includes("'" + tab + "'") ? ' active' : '');
  });
  const mc = document.getElementById('main-content');
  if (tab === 'shift') {
    mc.innerHTML = getShiftHTML();
    renderStats();
    renderGrid();
  } else if (tab === 'staff') {
    mc.innerHTML = getStaffHTML();
    renderStaffTab();
  } else if (tab === 'report') {
    mc.innerHTML = getReportHTML();
    renderReport();
  }
}

function getShiftHTML() {
  return `
    <div class="action-bar">
      <div class="next-worker-card" id="next-worker-card">
        <div>
          <div class="nwc-label" id="nwc-label">LƯỢT TIẾP THEO</div>
          <div class="nwc-name" id="nwc-name">—</div>
          <div class="nwc-sub" id="nwc-sub">Không có thợ rảnh</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-rose btn-sm" onclick="assignNext()" style="width:auto;padding:9px 18px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Giao turn
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-multi" onclick="toggleMulti()" style="width:auto;padding:9px 14px;color:#3B82F6;border-color:rgba(59,130,246,.25)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Chọn nhóm
          </button>
        </div>
      </div>
    </div>
    <div id="multi-bar" class="multi-bar" style="display:none">
      <div>
        <div class="mb-txt">Đã chọn <span id="multi-cnt">0</span> thợ — giao cùng 1 khách</div>
        <div class="mb-sub">Click vào thợ rảnh để chọn/bỏ chọn</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-rose btn-sm" onclick="assignMulti()" style="width:auto">Giao ca</button>
        <button class="btn btn-ghost btn-sm" onclick="cancelMulti()" style="width:auto">✕</button>
      </div>
    </div>
    <div class="search-filter-bar">
      <div class="search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="search-input" placeholder="Tìm thợ..." oninput="onSearch(this.value)" value="${searchQ}">
      </div>
      <div class="filter-tabs">
        <button class="filter-btn active" data-f="all" onclick="setFilter('all')">Tất cả</button>
        <button class="filter-btn" data-f="ready" onclick="setFilter('ready')">Rảnh</button>
        <button class="filter-btn" data-f="busy" onclick="setFilter('busy')">Đang làm</button>
        <button class="filter-btn" data-f="off" onclick="setFilter('off')">Nghỉ</button>
      </div>
    </div>
    <div class="staff-grid" id="staff-grid"></div>`;
}

function bindShiftEvents() {}

// ── STAFF TAB ──
function getStaffHTML() {
  return `
    <div class="tab-header">
      <div>
        <div class="tab-title">Quản lý nhân viên</div>
        <div class="tab-sub">Danh sách thợ trong tiệm</div>
      </div>
      <button class="btn btn-rose btn-sm" onclick="openAddStaff()" style="width:auto;padding:9px 18px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Thêm nhân viên
      </button>
    </div>
    <div id="staff-table-wrap"></div>`;
}

function renderStaffTab() {
  const sorted = [...W].sort((a, b) => b.totalRevenue - a.totalRevenue);
  let rows = sorted.map((w, i) => {
    const avCls = w.status === 'busy' ? 'av-busy' : w.status === 'off' ? 'av-off' : w.status === 'penalized' ? 'av-pen' : 'av-ready';
    const stBadge = w.status === 'busy'
      ? '<span class="sc-badge sb-busy">Đang làm</span>'
      : w.status === 'off'
      ? '<span class="sc-badge sb-off">Nghỉ</span>'
      : w.status === 'penalized'
      ? '<span class="sc-badge sb-pen">Bị phạt</span>'
      : '<span class="sc-badge sb-ready">Rảnh</span>';
    const avgRev = w.history.length ? Math.round(w.totalRevenue / w.history.length) : 0;
    return `<tr onclick="openStaffDetail(${w.id})" style="cursor:pointer">
      <td style="padding:14px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sc-avatar ${avCls}" style="width:38px;height:38px;font-size:11px">${w.ini}</div>
          <div>
            <div style="font-size:14px;font-weight:700">${w.name}</div>
            <div style="font-size:11px;color:var(--t3)">ID #${w.id}</div>
          </div>
        </div>
      </td>
      <td>${stBadge}</td>
      <td style="font-weight:700;font-variant-numeric:tabular-nums;text-align:center">${w.turns}</td>
      <td style="font-weight:700;color:var(--c-ready);font-variant-numeric:tabular-nums">${fmtM(w.totalRevenue)}</td>
      <td style="font-weight:700;color:#3B82F6;font-variant-numeric:tabular-nums">${fmtM(w.totalTip)}</td>
      <td style="font-size:12px;color:var(--t3);font-variant-numeric:tabular-nums">${fmtM(avgRev)}/turn</td>
      <td style="font-size:12px;color:var(--t3)">${w.history.length} ca</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="qa-btn" onclick="event.stopPropagation();openEditStaff(${w.id})" style="flex:none;padding:6px 10px;font-size:11px">Sửa</button>
          <button class="qa-btn" onclick="event.stopPropagation();confirmRemoveStaff(${w.id})" style="flex:none;padding:6px 10px;font-size:11px;color:var(--c-pen);border-color:var(--c-pen-b)">Xóa</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('staff-table-wrap').innerHTML = `
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Trạng thái</th>
            <th style="text-align:center">Turn hôm nay</th>
            <th>Doanh thu</th>
            <th>Tip</th>
            <th>TB/turn</th>
            <th>Lịch sử</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openStaffDetail(id) {
  const w = W.find(x => x.id === id); if (!w) return;
  const avCls = w.status === 'busy' ? 'av-busy' : w.status === 'off' ? 'av-off' : w.status === 'penalized' ? 'av-pen' : 'av-ready';
  const histRows = w.history.length
    ? w.history.map(h => `<div class="hr">
        <div><div class="hr-t">${h.ti}</div><div class="hr-d">${h.dur}</div></div>
        <div><div class="hr-s">${h.svc ? svcL(h.svc) : '—'}</div>${h.note ? '<div class="hr-n">' + h.note + '</div>' : ''}</div>
        <div><div class="hr-r">${h.rev ? fmtM(h.rev) : '—'}</div>${h.tip ? '<div class="hr-tp">tip ' + fmtM(h.tip) + '</div>' : ''}</div>
      </div>`).join('')
    : '<div style="text-align:center;padding:20px;color:var(--t4);font-size:13px">Chưa có lịch sử ca nào</div>';

  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av ${avCls}">${w.ini}</div>
    <div>
      <div class="popup-name">${w.name}</div>
      <div class="popup-meta">${w.turns} turn · ${fmtM(w.totalRevenue)} doanh thu</div>
    </div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;

  document.getElementById('popup-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="mini-stat"><div class="ms-val">${w.turns}</div><div class="ms-lbl">Turn hôm nay</div></div>
      <div class="mini-stat"><div class="ms-val" style="color:var(--c-ready)">${fmtM(w.totalRevenue)}</div><div class="ms-lbl">Doanh thu</div></div>
      <div class="mini-stat"><div class="ms-val" style="color:#3B82F6">${fmtM(w.totalTip)}</div><div class="ms-lbl">Tip</div></div>
    </div>
    <div>
      <div class="f-label" style="margin-bottom:8px">Lịch sử ca hôm nay</div>
      <div style="max-height:260px;overflow-y:auto">${histRows}</div>
    </div>
    <button class="btn btn-ghost" onclick="closePopup()">Đóng</button>`;

  document.getElementById('popup-overlay').style.display = 'flex';
}

function openAddStaff() {
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-ready">+</div>
    <div><div class="popup-name">Thêm nhân viên</div><div class="popup-meta">Nhập thông tin thợ mới</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div><div class="f-label">Tên nhân viên</div><input class="f-input" id="add-name" placeholder="VD: Nguyễn Thị Lan" style="font-size:13px;font-weight:500"></div>
    <div><div class="f-label">Chữ viết tắt (2 ký tự)</div><input class="f-input" id="add-ini" placeholder="VD: LA" maxlength="2" style="text-transform:uppercase;font-size:13px;font-weight:700;letter-spacing:.05em"></div>
    <button class="btn btn-rose" onclick="saveAddStaff()">Thêm nhân viên</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('add-name').focus(), 100);
}

function saveAddStaff() {
  const nm = document.getElementById('add-name').value.trim();
  const ini = document.getElementById('add-ini').value.trim().toUpperCase();
  if (!nm) { toast('Nhập tên nhân viên!'); return; }
  const autoIni = ini || nm.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  W.push(mkW(nextId++, nm, autoIni));
  toast('Đã thêm ' + nm + ' ✨');
  closePopup();
  if (currentTab === 'staff') renderStaffTab();
}

function openEditStaff(id) {
  const w = W.find(x => x.id === id); if (!w) return;
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-ready">${w.ini}</div>
    <div><div class="popup-name">Sửa thông tin</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div><div class="f-label">Tên nhân viên</div><input class="f-input" id="edit-name" value="${w.name}" style="font-size:13px;font-weight:500"></div>
    <div><div class="f-label">Chữ viết tắt</div><input class="f-input" id="edit-ini" value="${w.ini}" maxlength="2" style="text-transform:uppercase;font-size:13px;font-weight:700;letter-spacing:.05em"></div>
    <button class="btn btn-dark" onclick="saveEditStaff(${id})">Lưu thay đổi</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function saveEditStaff(id) {
  const w = W.find(x => x.id === id); if (!w) return;
  const nm = document.getElementById('edit-name').value.trim();
  const ini = document.getElementById('edit-ini').value.trim().toUpperCase();
  if (!nm) { toast('Tên không được để trống!'); return; }
  w.name = nm; if (ini) w.ini = ini;
  toast('Đã cập nhật ' + nm);
  closePopup();
  if (currentTab === 'staff') renderStaffTab();
}

function confirmRemoveStaff(id) {
  const w = W.find(x => x.id === id); if (!w) return;
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av" style="background:var(--c-pen-bg);color:var(--c-pen)">!</div>
    <div><div class="popup-name">Xóa nhân viên</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0;color:var(--t2);font-size:13px;line-height:1.7">Xóa <strong>${w.name}</strong> khỏi danh sách?<br><span style="color:var(--t3);font-size:12px">Lịch sử ca sẽ mất đi.</span></div>
    <button class="btn btn-ghost" style="color:var(--c-pen);border-color:var(--c-pen-b)" onclick="doRemoveStaff(${id})">Xác nhận xóa</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function doRemoveStaff(id) {
  const w = W.find(x => x.id === id);
  W = W.filter(x => x.id !== id);
  delete penT[id];
  toast((w ? w.name : 'Thợ') + ' đã xóa');
  closePopup();
  if (currentTab === 'staff') renderStaffTab();
}

// ── REPORT TAB ──
function getReportHTML() {
  const today = new Date().toISOString().slice(0, 10);
  saveDayLog();
  const dates = [...new Set(dailyLogs.map(l => l.date))].sort().reverse();
  const dateOpts = dates.map(d => `<option value="${d}"${d===today?' selected':''}>${d}</option>`).join('');
  return `
    <div class="tab-header">
      <div>
        <div class="tab-title">Báo cáo</div>
        <div class="tab-sub">Tổng kết doanh thu và hiệu suất</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="f-select" id="report-date" onchange="renderReport()" style="width:160px;font-size:13px">
          ${dateOpts || '<option value="">Chưa có dữ liệu</option>'}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="exportCSV()" style="width:auto;padding:8px 14px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Xuất CSV
        </button>
      </div>
    </div>
    <div id="report-wrap"></div>`;
}

function renderReport() {
  const sel = document.getElementById('report-date');
  const date = sel ? sel.value : new Date().toISOString().slice(0, 10);
  const log = dailyLogs.find(l => l.date === date);

  // Use live data if today
  const today = new Date().toISOString().slice(0, 10);
  let workers, tTurns;
  if (date === today || !log) {
    workers = W.map(w => ({...w}));
    tTurns = totalTurns;
  } else {
    workers = log.workers;
    tTurns = log.totalTurns;
  }

  const sorted = [...workers].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const totalRev = workers.reduce((s, w) => s + w.totalRevenue, 0);
  const totalTip = workers.reduce((s, w) => s + w.totalTip, 0);
  const topWorker = sorted[0];
  const activeWorkers = sorted.filter(w => w.turns > 0 || w.totalRevenue > 0);

  // Bar chart
  const maxRev = Math.max(...activeWorkers.map(w => w.totalRevenue), 1);
  const bars = activeWorkers.map(w => {
    const pct = Math.round((w.totalRevenue / maxRev) * 100);
    const tipPct = Math.round((w.totalTip / maxRev) * 100);
    return `<div class="chart-row">
      <div class="chart-name">${w.name}</div>
      <div class="chart-bars">
        <div class="chart-bar-wrap">
          <div class="chart-bar cb-rev" style="width:${pct}%"></div>
          <span class="chart-val">${fmtM(w.totalRevenue)}</span>
        </div>
        ${w.totalTip ? `<div class="chart-bar-wrap">
          <div class="chart-bar cb-tip" style="width:${tipPct}%"></div>
          <span class="chart-val" style="color:#3B82F6">${fmtM(w.totalTip)}</span>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');

  const rows = sorted.filter(w => w.turns > 0 || w.totalRevenue > 0).map(w => {
    const share = totalRev > 0 ? Math.round((w.totalRevenue / totalRev) * 100) : 0;
    return `<tr>
      <td style="padding:12px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sc-avatar av-ready" style="width:34px;height:34px;font-size:10px">${w.ini}</div>
          <div style="font-size:13px;font-weight:700">${w.name}</div>
        </div>
      </td>
      <td style="text-align:center;font-weight:700">${w.turns}</td>
      <td style="font-weight:700;color:var(--c-ready)">${fmtM(w.totalRevenue)}</td>
      <td style="font-weight:700;color:#3B82F6">${fmtM(w.totalTip)}</td>
      <td style="font-weight:700">${fmtM(w.totalRevenue + w.totalTip)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:var(--surface-3);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${share}%;background:linear-gradient(90deg,var(--rose),var(--rose-dark));border-radius:99px"></div>
          </div>
          <span style="font-size:11px;font-weight:700;color:var(--t3);min-width:28px;text-align:right">${share}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('report-wrap').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      <div class="report-stat-card"><div class="rsc-val">${tTurns}</div><div class="rsc-lbl">Tổng turn</div></div>
      <div class="report-stat-card"><div class="rsc-val" style="color:var(--c-ready)">${fmtM(totalRev)}</div><div class="rsc-lbl">Doanh thu</div></div>
      <div class="report-stat-card"><div class="rsc-val" style="color:#3B82F6">${fmtM(totalTip)}</div><div class="rsc-lbl">Tổng tip</div></div>
      <div class="report-stat-card"><div class="rsc-val" style="color:var(--rose);font-size:16px">${topWorker && topWorker.totalRevenue > 0 ? topWorker.name : '—'}</div><div class="rsc-lbl">Top doanh thu</div></div>
    </div>
    ${activeWorkers.length ? `<div class="chart-wrap"><div class="panel-lbl" style="margin-bottom:12px">Doanh thu theo thợ</div>${bars}<div style="display:flex;gap:16px;margin-top:10px"><span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)"><span style="width:10px;height:10px;border-radius:2px;background:var(--rose);display:inline-block"></span>Doanh thu</span><span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)"><span style="width:10px;height:10px;border-radius:2px;background:#3B82F6;display:inline-block"></span>Tip</span></div></div>` : ''}
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>Nhân viên</th><th style="text-align:center">Turn</th><th>Doanh thu</th><th>Tip</th><th>Tổng cộng</th><th>Tỷ trọng</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--t4)">Chưa có dữ liệu</td></tr>'}</tbody>
      </table>
    </div>`;
}

function exportCSV() {
  const sel = document.getElementById('report-date');
  const date = sel ? sel.value : new Date().toISOString().slice(0, 10);
  const log = dailyLogs.find(l => l.date === date);
  const workers = (log && date !== new Date().toISOString().slice(0,10)) ? log.workers : W;
  const rows = [['Tên','Turn','Doanh thu','Tip','Tổng']];
  workers.forEach(w => rows.push([w.name, w.turns, w.totalRevenue, w.totalTip, w.totalRevenue+w.totalTip]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nail-turn-'+date+'.csv';
  a.click();
}


// ── INIT ──
const mc = document.getElementById('main-content');
mc.innerHTML = getShiftHTML();
renderStats();
renderGrid();
renderGrid();
