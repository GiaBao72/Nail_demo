// ═══════════════════════════════════════
//  NAIL TURN — app.js
// ═══════════════════════════════════════

// ── TELEGRAM CONFIG ──
const TELEGRAM_BOT_TOKEN  = '8796284072:AAF7x6OA2Lh1IwsnhBbUtS50PgoRc5MN1dg';
const TELEGRAM_CHAT_GROUP = '-5122704943'; // group Nail_demo
const TELEGRAM_CHAT_DM    = '1375328147';  // DM cá nhân Gia Bảo

function sendTelegramMsgTo(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  }).catch(() => {});
}

function sendTelegramMsg(text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  [TELEGRAM_CHAT_GROUP, TELEGRAM_CHAT_DM].forEach(chatId => sendTelegramMsgTo(chatId, text));
}

function avImg(w, size) {
  const s = size || 40;
  if (w && w.photo) return '<img src="'+w.photo+'" style="width:'+s+'px;height:'+s+'px;border-radius:inherit;object-fit:cover;display:block">';
  return w ? w.ini : '+';
}

// ── SERVICES — dynamic, persisted ──
const DEFAULT_SVCS = [
  { v: 'Manicure',    l: '💅 Manicure' },
  { v: 'Pedicure',    l: '🦶 Pedicure' },
  { v: 'SpaPedicure', l: '🛁 Spa Pedicure' },
  { v: 'Fullset',     l: '💎 Fullset' },
  { v: 'Fillin',      l: '✨ Fill-in' },
  { v: 'DipPowder',   l: '🌸 Dip Powder' },
  { v: 'Waxing',      l: '🪡 Waxing' },
];
let SVCS_USER = [];
try { SVCS_USER = JSON.parse(localStorage.getItem('nt_svcs') || 'null') || DEFAULT_SVCS.map(s=>({...s})); } catch(e) { SVCS_USER = DEFAULT_SVCS.map(s=>({...s})); }
// SVCS is computed dynamically — always include blank option at front
function getSVCS() { return [{ v: '', l: '— Chọn dịch vụ —' }, ...SVCS_USER]; }
// Keep backward compat — code that reads SVCS will use getSVCS()
function saveSvcs() { try { localStorage.setItem('nt_svcs', JSON.stringify(SVCS_USER)); } catch(e) {} }

// ── STATE ──
function mkW(id, name, ini) {
  return { id, name, ini, turns: 0, status: 'off', note: '', startTime: null,
    service: '', revenue: 0, tip: 0, totalRevenue: 0, totalTip: 0, history: [], groupId: null,
    checkinTime: null, checkoutTime: null,
    avgTurnMs: 0, lastFinishTime: null,
    wageBase: 0, wagePercent: 0,           // lương cơ bản (đ/ca) + % doanh thu
    workLogs: [],                           // [{date, checkin, checkout, hours}]
    telegramId: '',                         // Telegram chat ID cá nhân của thợ
    photo: '',                                  // base64 ảnh đại diện
  };
}

let W = [
  mkW(1,'Lan','LA'), mkW(2,'Hoa','HO'), mkW(3,'Mai','MA'), mkW(4,'Tú','TU'),
  mkW(5,'Bích','BI'), mkW(6,'Linh','LI'), mkW(7,'Ngọc','NG'),
  mkW(8,'Thảo','TH'), mkW(9,'Yến','YE'), mkW(10,'Dung','DU'),
];

let totalTurns = 0, nextId = 11, selId = null;
let exHist = new Set(), multiMode = false, multiSel = new Set(), penT = {};
let searchQ = '', filterStatus = 'all', dragSrcId = null;
let currentTab = 'shift', shiftView = 2; // 1 = list, 2 = kanban
let dailyLogs = [];
try { dailyLogs = JSON.parse(localStorage.getItem('nt_dailyLogs') || '[]'); } catch(e) {}

// ── PERSIST STATE ──
function saveState() {
  try {
    localStorage.setItem('nt_state', JSON.stringify({ W, totalTurns, nextId, penT }));
  } catch(e) {}
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('nt_state'));
    if (!s || !s.W) return;
    W = s.W;
    totalTurns = s.totalTurns || 0;
    nextId = s.nextId || W.length + 1;
    penT = s.penT || {};
    // restore startTime bị mất do JSON serialize (số vẫn giữ được)
  } catch(e) {}
}
loadState();

const MAX_BUSY_MS = 60 * 60 * 1000;

// ── UTILS ──
function svcL(v) {
  if (!v) return v;
  // support multi: "Manicure|Gel" -> "💅 Manicure · ✨ Gel Nails"
  return v.split('|').map(s => { const x = getSVCS().find(i => i.v === s); return x ? x.l : s; }).join(' · ');
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
function fmtM(n) { if (!n) return '0đ'; return n.toLocaleString('vi-VN') + 'đ'; }
function fmtT(ms) {
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h > 0) return h + 'h ' + String(m%60).padStart(2,'0') + 'm';
  return String(m).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}
function fmtP(ut) { return fmtT(Math.max(0, ut - Date.now())); }
function readyW() { return W.filter(w => w.status === 'ready'); }

// ── SMART QUEUE SORT ──
// Sort ready workers: longest time since last finish floats to top
// Workers who just finished a turn go to the back
function smartQueue() {
  const rd = readyW();
  return rd.sort((a, b) => {
    const aT = a.lastFinishTime || a.checkinTime || 0;
    const bT = b.lastFinishTime || b.checkinTime || 0;
    return aT - bT; // earliest finish time → top of queue
  });
}

// ── AVG TURN SPEED ──
function avgSpeed(w) {
  const validH = (w.history || []).filter(h => h.durationMs && h.durationMs > 60000);
  if (!validH.length) return null;
  return validH.reduce((s, h) => s + h.durationMs, 0) / validH.length;
}
function speedLabel(w) {
  const avg = avgSpeed(w);
  if (!avg) return null;
  const m = Math.round(avg / 60000);
  return m + ' phút/turn';
}

// (break feature removed)
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
  const el = document.getElementById('clock');
  if (el) el.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  const ed = document.getElementById('clock-day');
  if (ed) { const days=['CN','T2','T3','T4','T5','T6','T7']; ed.textContent = days[n.getDay()] + ' ' + String(n.getDate()).padStart(2,'0') + '/' + String(n.getMonth()+1).padStart(2,'0'); }
  const st = document.getElementById('shift-tag');
  if (st) st.textContent = n.getHours() < 12 ? 'Ca sáng' : n.getHours() < 17 ? 'Ca chiều' : 'Ca tối';
  W.filter(w => w.status === 'busy' && w.startTime).forEach(w => {
    const t = fmtT(Date.now() - w.startTime);
    ['ct-','pt-','kct-'].forEach(p => { const e = document.getElementById(p+w.id); if(e) e.textContent = t; });
    const pb = document.getElementById('pb-'+w.id);
    if (pb) pb.style.width = Math.min(100, (Date.now()-w.startTime)/MAX_BUSY_MS*100) + '%';
  });
  // group timers
  const grps = {};
  W.filter(w => w.status==='busy' && w.groupId).forEach(w => { if (!grps[w.groupId]) grps[w.groupId]=w; });
  Object.entries(grps).forEach(([gid,w]) => {
    if (!w.startTime) return;
    const e = document.getElementById('ct-g-'+gid); if(e) e.textContent = fmtT(Date.now()-w.startTime);
    const pb = document.getElementById('pb-g-'+gid); if(pb) pb.style.width = Math.min(100,(Date.now()-w.startTime)/MAX_BUSY_MS*100)+'%';
  });
  // overtime alert (> MAX_BUSY_MS)
  W.filter(w => w.status === 'busy' && w.startTime).forEach(w => {
    const card = document.querySelector(`.staff-card[data-id="${w.id}"],.kc[data-id="${w.id}"]`);
    if (!card) return;
    const over = Date.now() - w.startTime > MAX_BUSY_MS;
    card.classList.toggle('overtime', over);
  });

  // penalty countdown
  let rerender = false;
  Object.keys(penT).forEach(sid => {
    const id = parseInt(sid), pt = penT[id]; if (!pt) return;
    if (Date.now() >= pt.ut) {
      const w = W.find(x => x.id===id);
      if (w) { W = W.filter(x => x.id!==id); w.status='ready'; delete penT[id]; W.push(w); }
      rerender = true;
    } else {
      ['cpen-','popen-','kcpen-'].forEach(p => { const e = document.getElementById(p+id); if(e) e.textContent = fmtP(pt.ut); });
    }
  });
  if (rerender) { render(); saveState(); }
}
tick(); setInterval(tick, 1000);

// ── RENDER STATS ──
function renderStats() {
  const rd = smartQueue(), busy = W.filter(w => w.status==='busy');
  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('stat-ready', rd.length); set('stat-busy', busy.length);
  set('stat-turns', totalTurns);
  const nxt = rd[0];
  set('nwc-name', nxt ? nxt.name : '—');
  set('nwc-sub', nxt ? rd.length + ' thợ đang chờ' : 'Không có thợ rảnh');
  set('nwc-label', nxt ? 'LƯỢT TIẾP THEO' : 'HÀNG CHỜ');
  const card = document.getElementById('next-worker-card');
  if (card) card.className = 'next-worker-card' + (nxt ? '' : ' nwc-empty');
}

// ── RENDER GRID ──
function renderGrid() {
  const rd = smartQueue();
  const groups = {};
  W.filter(w => w.status==='busy' && w.groupId).forEach(w => {
    if (!groups[w.groupId]) groups[w.groupId] = [];
    groups[w.groupId].push(w);
  });
  const groupedIds = new Set(Object.values(groups).flat().map(w => w.id));
  const q = searchQ.toLowerCase();
  function visible(w) {
    if (q && !w.name.toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all' && w.status !== filterStatus) return false;
    return true;
  }
  const order = [...rd, ...W.filter(w=>w.status==='busy'&&!w.groupId), ...W.filter(w=>w.status==='off'), ...W.filter(w=>w.status==='penalized')];
  let html = '';
  order.forEach(w => { if (!groupedIds.has(w.id) && visible(w)) html += renderCard(w, rd); });
  Object.entries(groups).forEach(([gid, members]) => {
    if (!members.some(m => visible(m))) return;
    html += renderGroupCard(gid, members);
  });
  if (!html) html = '<div style="text-align:center;padding:40px;color:var(--t4);font-size:13px">Không tìm thấy thợ nào</div>';
  const el = document.getElementById('staff-grid');
  if (el) {
    el.classList.remove('kanban-mode');
    el.style.display = '';
    el.style.flexDirection = '';
    el.innerHTML = html;
    if (shiftView === 1) initDrag();
  }
}

// ── DRAG & DROP ──
let dropPlaceholder = null;

function createPlaceholder() {
  const el = document.createElement('div');
  el.id = 'drag-placeholder';
  el.style.cssText = 'height:6px;border-radius:4px;background:var(--rose);opacity:.7;transition:all .15s;margin:2px 0';
  return el;
}

function removePlaceholder() {
  const el = document.getElementById('drag-placeholder');
  if (el) el.remove();
}

function initDrag() {
  const grid = document.getElementById('staff-grid');
  if (!grid || grid._d) return;
  grid._d = true;

  grid.addEventListener('dragstart', e => {
    const c = e.target.closest('.staff-card[draggable]'); if (!c) return;
    dragSrcId = parseInt(c.dataset.id);
    setTimeout(() => { c.style.opacity = '0.35'; c.style.transform = 'scale(.98)'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const c = e.target.closest('.staff-card[draggable]');
    if (!c || parseInt(c.dataset.id) === dragSrcId) return;
    removePlaceholder();
    const ph = createPlaceholder();
    const rect = c.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      c.parentNode.insertBefore(ph, c);
    } else {
      c.parentNode.insertBefore(ph, c.nextSibling);
    }
    document.querySelectorAll('.staff-card[draggable]').forEach(el => {
      el.style.transform = el.dataset.id == dragSrcId ? 'scale(.98)' : '';
    });
  });

  grid.addEventListener('dragleave', e => {
    if (!grid.contains(e.relatedTarget)) removePlaceholder();
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    const ph = document.getElementById('drag-placeholder');
    if (!ph || dragSrcId === null) { removePlaceholder(); return; }
    // find target position from placeholder
    const siblings = [...grid.querySelectorAll('.staff-card[draggable]')];
    const phIdx = [...ph.parentNode.children].indexOf(ph);
    // drop before which card?
    let targetCard = null;
    for (const s of ph.parentNode.children) {
      if (s === ph) continue;
      if ([...ph.parentNode.children].indexOf(s) > phIdx) { targetCard = s; break; }
    }
    removePlaceholder();
    const src = W.find(x => x.id===dragSrcId);
    if (!src) return;
    const tId = targetCard ? parseInt(targetCard.dataset.id) : null;
    const tgt = tId ? W.find(x => x.id===tId) : null;
    if (!tgt || tgt.status !== 'ready') { renderGrid(); renderStats(); return; }
    const si = W.indexOf(src), ti = W.indexOf(tgt);
    W.splice(si,1); W.splice(ti,0,src);
    renderGrid(); renderStats(); saveState();
  });

  grid.addEventListener('dragend', () => {
    dragSrcId = null;
    removePlaceholder();
    document.querySelectorAll('.staff-card').forEach(el => { el.style.opacity = ''; el.style.transform = ''; });
  });
}

// ── SEARCH & FILTER ──
function onSearch(val) { searchQ = val; renderGrid(); }

function setFilter(f) {
  filterStatus = f;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.className = 'filter-btn' + (b.dataset.f === f ? ' active' : '');
  });
  renderGrid(); renderStats();
}

// ── RENDER FUNCTION ──
function render() {
  if (currentTab !== 'shift') return;
  renderStats();
  if (shiftView === 2) renderKanban(); else renderGrid();
  // ẩn/hiện search bar theo view
  const sfb = document.querySelector('.search-filter-bar');
  if (sfb) sfb.style.display = shiftView === 2 ? 'none' : '';
  const mb = document.getElementById('multi-bar');
  if (mb) mb.style.display = multiMode ? 'flex' : 'none';
  const mc = document.getElementById('multi-cnt'); if (mc) mc.textContent = multiSel.size;
  const bm = document.getElementById('btn-multi');
  if (bm) { bm.style.background = multiMode ? '#1D4ED8' : ''; bm.style.color = multiMode ? '#fff' : '#3B82F6'; }
  // update view toggle btn
  const vb = document.getElementById('btn-view');
  if (vb) vb.textContent = shiftView === 1 ? 'Xem dạng cột' : 'Xem dạng danh sách';
}

function toggleView() {
  shiftView = shiftView === 1 ? 2 : 1;
  const vb = document.getElementById('btn-view');
  if (vb) vb.textContent = shiftView === 1 ? 'Xem dạng cột' : 'Xem dạng danh sách';
  // show/hide search-filter bar (not useful in kanban)
  const sfb = document.querySelector('.search-filter-bar');
  if (sfb) sfb.style.display = shiftView === 2 ? 'none' : '';
  if (shiftView === 2) renderKanban(); else renderGrid();
}

// ── KANBAN VIEW ──
function renderKanban() {
  const rd = readyW();
  const busy = W.filter(w => w.status === 'busy');
  const off = W.filter(w => w.status === 'off');
  const pen = W.filter(w => w.status === 'penalized');

  function miniCard(w) {
    const isPen = w.status === 'penalized', pt = penT[w.id];
    const elapsed = w.startTime ? Date.now() - w.startTime : 0;
    const isChk = multiSel.has(w.id);
    const isReady = w.status === 'ready';
    const avCls = w.status==='busy'?'av-busy':isPen?'av-pen':w.status==='off'?'av-off':'av-ready';
    let sub = '';
    if (w.status==='busy') sub = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px"><span class="sc-tag t-timer" style="font-size:9px;padding:1px 6px">⏱ <span id="kct-${w.id}">${fmtT(elapsed)}</span></span>${w.service?`<span class="sc-tag t-svc" style="font-size:9px;padding:1px 6px">${svcL(w.service)}</span>`:''}</div>`;
    if (isPen && pt) sub = `<div style="margin-top:6px"><span class="sc-tag t-pen" style="font-size:9px;padding:1px 6px" id="kcpen-${w.id}">${fmtP(pt.ut)}</span></div>`;
    let actionBtn = '';
    if (multiMode && isReady) {
      actionBtn = `<button onclick="event.stopPropagation();toggleChk(${w.id})" style="padding:0 8px;height:26px;border-radius:6px;border:none;background:${isChk?'#1D4ED8':'var(--surface-3)'};color:${isChk?'#fff':'var(--t2)'};font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1;font-family:inherit;white-space:nowrap">${isChk?'✓ Đã chọn':'Chọn'}</button>`;
    } else if (w.status==='busy') {
      actionBtn = `<button onclick="event.stopPropagation();openPopup(${w.id})" style="padding:0 8px;height:26px;border-radius:6px;border:1px solid var(--br2);background:var(--surface-2);color:var(--t2);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Lịch sử</button>`;
    } else if (isReady) {
      actionBtn = `<button onclick="event.stopPropagation();assignW(${w.id})" style="padding:0 8px;height:26px;border-radius:6px;border:none;background:var(--rose);color:#fff;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1;font-family:inherit;white-space:nowrap">Vào turn</button>`;
    } else if (w.status==='off') {
      actionBtn = ``;
    } else if (isPen) {
      actionBtn = `<button onclick="event.stopPropagation();remPen(${w.id})" style="width:26px;height:26px;border-radius:6px;border:none;background:var(--c-ready);color:#fff;font-size:11px;cursor:pointer;flex-shrink:0" title="Gỡ phạt">✓</button>`;
    }
    const clickFn = (multiMode && isReady) ? `toggleChk(${w.id})` : `openDetail(${w.id})`;
    const statusCls = isPen ? 'kc-pen' : w.status==='busy' ? 'kc-busy' : w.status==='off' ? 'kc-off' : 'kc-ready';
    const chkStyle = isChk ? 'background:#EFF6FF;border:2px solid #1D4ED8;' : '';
    const draggable = (!multiMode && isReady) ? 'draggable="true"' : '';
    return `<div class="kc ${statusCls}" ${draggable} data-id="${w.id}" style="${chkStyle}cursor:${(!multiMode && isReady) ? 'grab' : 'pointer'}" onclick="${clickFn}">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="sc-avatar ${avCls}" style="width:32px;height:32px;font-size:11px;flex-shrink:0">${w.ini}</div>
        <div style="flex:1;min-width:0;overflow:hidden">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.name}</div>
          <div style="font-size:10px;color:var(--t3);margin-top:1px">${w.turns} turn</div>
        </div>
        ${actionBtn}
      </div>
      ${sub}
    </div>`;
  }

  // ── group busy workers by groupId ──
  const kGroups = {};
  busy.filter(w => w.groupId).forEach(w => {
    if (!kGroups[w.groupId]) kGroups[w.groupId] = [];
    kGroups[w.groupId].push(w);
  });
  const kGroupedIds = new Set(Object.values(kGroups).flat().map(w => w.id));
  const busySolo = busy.filter(w => !w.groupId);

  function miniGroupCard(gid, members) {
    const elapsed = members[0].startTime ? Date.now() - members[0].startTime : 0;
    const pct = Math.min(100, elapsed / MAX_BUSY_MS * 100);
    const memberRows = members.map(m => {
      const me = m.startTime ? Date.now() - m.startTime : 0;
      const svcTag = m.service ? `<span class="sc-tag t-svc" style="font-size:9px;padding:1px 6px">${svcL(m.service)}</span>` : '';
      const timerTag = `<span class="sc-tag t-timer" style="font-size:9px;padding:1px 6px">⏱ <span id="kct-${m.id}">${fmtT(me)}</span></span>`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--c-busy-b)" onclick="event.stopPropagation()">
        <div class="sc-avatar av-busy" style="width:28px;height:28px;font-size:9px;flex-shrink:0">${m.ini}</div>
        <div style="flex:1;min-width:0;cursor:default">
          <div style="font-size:12px;font-weight:700">${m.name}</div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px">${svcTag}${timerTag}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button onclick="event.stopPropagation();openDetail(${m.id})" style="padding:0 8px;height:26px;border-radius:6px;border:1px solid var(--br2);background:var(--surface-2);color:var(--t2);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Chi tiết</button>
        </div>
      </div>`;
    }).join('');
    return `<div style="background:var(--c-busy-bg);border:1.5px solid var(--c-busy-b);border-radius:10px;overflow:hidden;cursor:pointer" onclick="openGroupPopup('${gid}')">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px 6px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px">👥</span>
          <div>
            <div style="font-size:11px;font-weight:800;color:var(--c-busy)">Nhóm ${members.length} thợ</div>
            <div style="font-size:10px;color:var(--t3);margin-top:1px">⏱ <span id="ct-g-${gid}">${fmtT(elapsed)}</span></div>
          </div>
        </div>
        <span class="sc-badge sb-busy" style="font-size:9px">Đang làm</span>
      </div>
      <div style="height:2px;background:var(--surface-3);margin:0 10px"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--c-busy),#F97316);border-radius:99px" id="pb-g-${gid}"></div></div>
      <div style="padding:0 10px 8px" onclick="event.stopPropagation()">${memberRows}</div>
    </div>`;
  }

  function renderBusyCol() {
    if (!busySolo.length && !Object.keys(kGroups).length) return '<div style="text-align:center;padding:20px 0;color:var(--t4);font-size:12px">Trống</div>';
    return [
      ...Object.entries(kGroups).map(([gid, members]) => miniGroupCard(gid, members)),
      ...busySolo.map(w => miniCard(w))
    ].join('');
  }

  const busyCount = busySolo.length + Object.keys(kGroups).length;

  const cols = [
    { key:'ready',     label:'Rảnh',    count:rd.length,   color:'#059669', bg:'#ECFDF5', items:rd  },
    { key:'busy',      label:'Đang làm', count:busyCount,  color:'#D97706', bg:'#FFFBEB', items:null },
    { key:'off',       label:'Nghỉ',    count:off.length,  color:'#94A3B8', bg:'#F8FAFC', items:off  },
    { key:'penalized', label:'Bị phạt', count:pen.length,  color:'#DC2626', bg:'#FEF2F2', items:pen  },
  ];

  const isMobile = window.innerWidth <= 480;
  const colsHtml = cols.map(col => `
    <div ${col.key==='ready' ? 'id="kanban-ready-col"' : ''} style="background:var(--surface-2);border-radius:12px;border:1px solid var(--br);overflow:hidden;${isMobile ? 'min-width:80vw' : 'min-width:0'}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface);border-bottom:2px solid ${col.color}">
        <span style="font-size:12px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:${col.color}">${col.label}</span>
        <span style="font-size:11px;font-weight:800;padding:2px 9px;border-radius:20px;background:${col.bg};color:${col.color}">${col.count}</span>
      </div>
      <div style="padding:8px;display:flex;flex-direction:column;gap:6px;min-height:80px">
        ${col.key === 'busy' ? renderBusyCol() : (col.items.length ? col.items.map(w => miniCard(w)).join('') : '<div style="text-align:center;padding:20px 0;color:var(--t4);font-size:12px">Trống</div>')}
      </div>
    </div>`).join('');

  const gridStyle = isMobile
    ? 'display:grid;grid-template-columns:repeat(4,80vw);gap:10px;width:max-content'
    : 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:start;width:100%';

  const html = isMobile
    ? `<div class="kanban-mobile-wrap"><div style="${gridStyle}">${colsHtml}</div></div>`
    : `<div style="${gridStyle}">${colsHtml}</div>`;

  const sg = document.getElementById('staff-grid');
  if (sg) {
    sg.classList.add('kanban-mode');
    sg.style.cssText = 'display:block;flex-direction:unset;gap:0';
    sg.innerHTML = html;
    initKanbanDrag();
  }
}

function initKanbanDrag() {
  const col = document.getElementById('kanban-ready-col');
  if (!col) return;
  let dragId = null;

  col.addEventListener('dragstart', e => {
    const card = e.target.closest('.kc[draggable]'); if (!card) return;
    dragId = parseInt(card.dataset.id);
    setTimeout(() => { card.style.opacity = '0.35'; card.style.transform = 'scale(.97)'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  col.addEventListener('dragend', () => {
    col.querySelectorAll('.kc').forEach(c => { c.style.opacity = ''; c.style.transform = ''; c.classList.remove('kc-drag-over'); });
    removePlaceholder();
    dragId = null;
  });

  col.addEventListener('dragover', e => {
    e.preventDefault();
    const card = e.target.closest('.kc[draggable]');
    if (!card || parseInt(card.dataset.id) === dragId) return;
    removePlaceholder();
    col.querySelectorAll('.kc').forEach(c => c.classList.remove('kc-drag-over'));
    const ph = createPlaceholder();
    const rect = card.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      card.parentNode.insertBefore(ph, card);
    } else {
      card.parentNode.insertBefore(ph, card.nextSibling);
    }
    card.classList.add('kc-drag-over');
  });

  col.addEventListener('drop', e => {
    e.preventDefault();
    const ph = document.getElementById('drag-placeholder');
    if (!ph || !dragId) { removePlaceholder(); return; }
    const after = [...ph.parentNode.children].find((el, i, arr) => {
      return el !== ph && arr.indexOf(el) > arr.indexOf(ph) && el.classList.contains('kc');
    });
    removePlaceholder();
    const src = W.find(x => x.id === dragId);
    const tId = after ? parseInt(after.dataset.id) : null;
    const tgt = tId ? W.find(x => x.id === tId) : null;
    if (!src || !tgt || src.status !== 'ready' || tgt.status !== 'ready') return;
    const si = W.indexOf(src), ti = W.indexOf(tgt);
    W.splice(si, 1); W.splice(ti, 0, src);
    renderKanban(); renderStats(); saveState();
    initKanbanDrag();
  });
}

// ── TABS ──
function setTab(tab) {
  currentTab = tab;
  // sync cả sidebar và bottom nav — dùng data-tab thay vì parse onclick
  document.querySelectorAll('.nav-btn').forEach(b => {
    const btnTab = b.dataset.tab || '';
    b.className = 'nav-btn' + (btnTab === tab ? ' active' : '');
  });
  const mc = document.getElementById('main-content');
  if (tab === 'shift') {
    mc.innerHTML = getShiftHTML();
    renderStats();
    if (shiftView === 2) {
      renderKanban();
      const sfb = document.querySelector('.search-filter-bar');
      if (sfb) sfb.style.display = 'none';
      const vb = document.getElementById('btn-view');
      if (vb) vb.textContent = 'Xem dạng danh sách';
    } else {
      renderGrid();
    }
  } else if (tab === 'report') {
    mc.innerHTML = getReportHTML();
    setTimeout(() => renderReport(), 0);
  } else if (tab === 'settings') {
    mc.innerHTML = getSettingsHTML();
    renderSettingsTab();
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
        <div class="nwc-actions" style="margin-left:auto;display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
          <button class="btn btn-rose btn-sm" onclick="assignNext()" style="width:auto;padding:9px 18px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Vào turn
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-multi" onclick="toggleMulti()" style="width:auto;padding:9px 14px;color:#3B82F6;border-color:rgba(59,130,246,.25)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Chọn nhóm
          </button>
          <button id="btn-view" class="btn btn-ghost btn-sm" onclick="toggleView()" style="width:auto;padding:9px 14px;color:var(--t2);border-color:var(--br2)">
            ${shiftView === 1 ? 'Xem dạng cột' : 'Xem dạng danh sách'}
          </button>
        </div>
      </div>
    </div>
    <div id="multi-bar" class="multi-bar" style="display:none">
      <div>
        <div class="mb-txt">Đã chọn <span id="multi-cnt">0</span> thợ — giao cùng 1 khách</div>
        <div class="mb-sub">Click thợ rảnh để chọn/bỏ chọn</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-rose btn-sm" onclick="assignMulti()" style="width:auto">Giao ca</button>
        <button class="btn btn-ghost btn-sm" onclick="cancelMulti()" style="width:auto">✕</button>
      </div>
    </div>
    <div class="search-filter-bar" style="${shiftView === 2 ? 'display:none' : ''}">
      <div class="search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" placeholder="Tìm thợ..." oninput="onSearch(this.value)" value="">
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

// ── STAFF TAB ──
function getStaffHTML() {
  return `<div class="tab-header">
    <div><div class="tab-title">Quản lý nhân viên</div><div class="tab-sub">Danh sách thợ trong tiệm</div></div>
    <button class="btn btn-rose btn-sm" onclick="openAddStaff()" style="width:auto;padding:9px 18px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Thêm nhân viên
    </button>
  </div>
  <div id="staff-table-wrap"></div>`;
}

function renderStaffTab() {
  const sorted = [...W].sort((a,b) => {
    // checked-in trước, chưa checkin sau
    const aIn = a.checkinTime ? 1 : 0, bIn = b.checkinTime ? 1 : 0;
    if (bIn !== aIn) return bIn - aIn;
    return (a.checkinTime||0) - (b.checkinTime||0);
  });
  const rows = sorted.map(w => {
    const avCls = w.status==='busy'?'av-busy':w.status==='off'?'av-off':w.status==='penalized'?'av-pen':'av-ready';
    const stB = w.status==='busy'?'<span class="sc-badge sb-busy">Đang làm</span>'
      :w.status==='off'?'<span class="sc-badge sb-off">Nghỉ</span>'
      :w.status==='penalized'?'<span class="sc-badge sb-pen">Bị phạt</span>'
      :'<span class="sc-badge sb-ready">Rảnh</span>';
    const ciTime = w.checkinTime ? new Date(w.checkinTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '—';
    const isCheckedIn = !!w.checkinTime;
    const ciBtn = isCheckedIn
      ? `<button class="qa-btn" onclick="event.stopPropagation();checkoutStaff(${w.id})" style="flex:none;padding:6px 10px;font-size:11px;color:var(--c-pen);border-color:var(--c-pen-b)">Check-out</button>`
      : `<button class="qa-btn qa-primary" onclick="event.stopPropagation();checkinStaff(${w.id})" style="flex:none;padding:6px 12px;font-size:11px">Check-in</button>`;
    return `<tr onclick="openStaffDetail(${w.id})" style="cursor:pointer;${!isCheckedIn?'opacity:.55':''}">
      <td style="padding:14px 16px"><div style="display:flex;align-items:center;gap:10px">
        <div class="sc-avatar ${avCls}" style="width:38px;height:38px;font-size:11px;overflow:hidden">${avImg(w,38)}</div>
        <div>
          <div style="font-size:14px;font-weight:700">${w.name}</div>
          <div style="font-size:11px;color:var(--t3)">${isCheckedIn ? '✅ Check-in lúc '+ciTime : '⏸ Chưa check-in'}</div>
        </div>
      </div></td>
      <td>${stB}</td>
      <td style="font-weight:700;text-align:center">${w.turns}</td>
      <td style="font-size:12px;color:var(--t3)">${w.history.length} ca</td>
      <td><div style="display:flex;gap:5px;flex-wrap:wrap">
        ${ciBtn}
        <button class="qa-btn" onclick="event.stopPropagation();openEditStaff(${w.id})" style="flex:none;padding:6px 10px;font-size:11px">Sửa</button>
        <button class="qa-btn" onclick="event.stopPropagation();confirmRemoveStaff(${w.id})" style="flex:none;padding:6px 10px;font-size:11px;color:var(--c-pen);border-color:var(--c-pen-b)">Xóa</button>
      </div></td>
    </tr>`;
  }).join('');
  document.getElementById('staff-table-wrap').innerHTML = `<div class="data-table-wrap">
    <table class="data-table">
      <thead><tr><th>Nhân viên</th><th>Trạng thái</th><th style="text-align:center">Turn</th><th>Lịch sử</th><th>Hành động</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function openStaffDetail(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const avCls = w.status==='busy'?'av-busy':w.status==='off'?'av-off':w.status==='penalized'?'av-pen':'av-ready';
  const histRows = w.history.length ? w.history.map(h=>`<div class="hr">
    <div><div class="hr-t">${h.ti}</div><div class="hr-d">${h.dur}</div></div>
    <div><div class="hr-s">${h.svc?svcL(h.svc):'—'}</div>${h.note?'<div class="hr-n">'+h.note+'</div>':''}</div>
  </div>`).join('') : '<div style="text-align:center;padding:20px;color:var(--t4)">Chưa có lịch sử</div>';
  document.getElementById('popup-head').innerHTML = `<div class="popup-av ${avCls}">${w.ini}</div>
    <div><div class="popup-name">${w.name}</div><div class="popup-meta">${w.turns} turn</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr;gap:8px">
      <div class="mini-stat"><div class="ms-val">${w.turns}</div><div class="ms-lbl">Turn hôm nay</div></div>
    </div>
    <div><div class="f-label" style="margin-bottom:8px">Lịch sử ca hôm nay</div>
    <div style="max-height:260px;overflow-y:auto">${histRows}</div></div>
    <button class="btn btn-ghost" onclick="closePopup()">Đóng</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function openAddStaff() {
  document.getElementById('popup-head').innerHTML = `<div class="popup-av av-ready">+</div>
    <div><div class="popup-name">Thêm nhân viên</div><div class="popup-meta">Nhập thông tin thợ mới</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div><div class="f-label">Tên nhân viên</div><input class="f-input" id="add-name" placeholder="VD: Nguyễn Thị Lan" style="font-size:13px;font-weight:500"></div>
    <div><div class="f-label">Chữ viết tắt (2 ký tự)</div><input class="f-input" id="add-ini" placeholder="VD: LA" maxlength="2" style="text-transform:uppercase;font-size:13px;font-weight:700"></div>
    <button class="btn btn-rose" onclick="saveAddStaff()">Thêm nhân viên</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
  setTimeout(() => { const el=document.getElementById('add-name'); if(el) el.focus(); }, 100);
}

function saveAddStaff() {
  const nm = document.getElementById('add-name').value.trim();
  const ini = document.getElementById('add-ini').value.trim().toUpperCase();
  if (!nm) { toast('Nhập tên nhân viên!'); return; }
  const autoIni = ini || nm.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);
  W.push(mkW(nextId++, nm, autoIni));
  toast('Đã thêm ' + nm + ' ✨');
  closePopup();
  if (currentTab==='settings') renderSettingsPane();
}

function openEditStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  document.getElementById('popup-head').innerHTML = `<div class="popup-av av-ready" style="overflow:hidden">${avImg(w,46)}</div>
    <div><div class="popup-name">Sửa thông tin</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div>
      <div class="f-label">Ảnh đại diện</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:6px">
        <div id="photo-preview" style="width:56px;height:56px;border-radius:14px;background:var(--c-surface2);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:var(--t3);flex-shrink:0">${avImg(w,56)}</div>
        <div style="flex:1">
          <label class="btn btn-ghost" style="cursor:pointer;display:inline-block;padding:6px 14px;font-size:12px;margin-bottom:4px">
            📷 Chọn ảnh
            <input type="file" accept="image/*" style="display:none" onchange="previewEditPhoto(event,${id})">
          </label>
          ${w.photo ? `<button class="btn btn-ghost" style="padding:6px 14px;font-size:12px;color:var(--rose)" onclick="clearEditPhoto(${id})">Xóa ảnh</button>` : ''}
        </div>
      </div>
    </div>
    <div><div class="f-label">Tên nhân viên</div><input class="f-input" id="edit-name" value="${w.name}" style="font-size:13px;font-weight:500"></div>
    <div><div class="f-label">Chữ viết tắt</div><input class="f-input" id="edit-ini" value="${w.ini}" maxlength="2" style="text-transform:uppercase;font-size:13px;font-weight:700"></div>
    <div>
      <div class="f-label">Telegram ID <span style="color:var(--t4);font-weight:400;text-transform:none">(để bot nhắn riêng khi đến turn)</span></div>
      <input class="f-input" id="edit-tgid" value="${w.telegramId||''}" placeholder="VD: 123456789" inputmode="numeric" style="font-size:13px">
      <div style="font-size:11px;color:var(--t4);margin-top:4px">Nhân viên nhắn /start cho @VGB_AssistantBot rồi gửi ID tại <a href="https://t.me/userinfobot" target="_blank" style="color:var(--rose)">@userinfobot</a></div>
    </div>
    <button class="btn btn-dark" onclick="saveEditStaff(${id})">Lưu thay đổi</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function saveEditStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const nm = document.getElementById('edit-name').value.trim();
  const ini = document.getElementById('edit-ini').value.trim().toUpperCase();
  const tgid = (document.getElementById('edit-tgid')?.value || '').trim();
  const photoEl = document.getElementById('edit-photo-data');
  if (!nm) { toast('Tên không được để trống!'); return; }
  w.name = nm; if (ini) w.ini = ini;
  w.telegramId = tgid;
  if (photoEl) { if (photoEl.value === '__clear__') w.photo = ''; else if (photoEl.value !== '') w.photo = photoEl.value; }
  toast('Đã cập nhật ' + nm);
  closePopup();
  render(); saveState();
  if (currentTab==='settings') renderSettingsPane();
}

function previewEditPhoto(evt, id) {
  const file = evt.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = e.target.result;
    const prev = document.getElementById('photo-preview');
    if (prev) prev.innerHTML = '<img src="'+data+'" style="width:56px;height:56px;border-radius:14px;object-fit:cover">';
    let hid = document.getElementById('edit-photo-data');
    if (!hid) { hid = document.createElement('input'); hid.type='hidden'; hid.id='edit-photo-data'; document.getElementById('popup-body').appendChild(hid); }
    hid.value = data;
  };
  reader.readAsDataURL(file);
}
function clearEditPhoto(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  let hid = document.getElementById('edit-photo-data');
  if (!hid) { hid = document.createElement('input'); hid.type='hidden'; hid.id='edit-photo-data'; document.getElementById('popup-body').appendChild(hid); }
  hid.value = '__clear__';
  const prev = document.getElementById('photo-preview');
  if (prev) prev.innerHTML = w.ini;
  toast('Đã xóa ảnh');
}

function checkinStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const now = new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-ready">${w.ini}</div>
    <div><div class="popup-name">Check-in</div><div class="popup-meta">${w.name} · ${now}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0 4px;font-size:13px;color:var(--t2);line-height:1.8">
      Xác nhận <strong>${w.name}</strong> bắt đầu ca làm việc lúc <strong>${now}</strong>?
    </div>
    <button class="btn btn-green" onclick="doCheckin(${id})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Xác nhận Check-in
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}
function doCheckin(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  w.checkinTime = Date.now();
  if (w.status === 'off') w.status = 'ready';
  toast(w.name + ' đã check-in ✅');
  closePopup();
  saveState(); renderSettingsPane();
}
function checkoutStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  if (w.status === 'busy') { toast(w.name + ' đang phục vụ khách, chưa thể check-out!'); return; }
  const now = Date.now();
  const nowStr = new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  const hours = w.checkinTime ? Math.round((now - w.checkinTime) / 36000) / 100 : 0;
  const ciStr = w.checkinTime ? new Date(w.checkinTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-off">${w.ini}</div>
    <div><div class="popup-name">Check-out</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="mini-stat"><div class="ms-val">${ciStr}</div><div class="ms-lbl">Check-in</div></div>
      <div class="mini-stat"><div class="ms-val">${nowStr}</div><div class="ms-lbl">Check-out</div></div>
      <div class="mini-stat"><div class="ms-val" style="color:var(--c-ready)">${hours}h</div><div class="ms-lbl">Tổng giờ</div></div>
    </div>
    <div style="text-align:center;padding:4px 0;font-size:13px;color:var(--t2)">
      ${w.turns ? `<strong>${w.name}</strong> đã hoàn thành <strong>${w.turns} turn</strong> hôm nay.` : `<strong>${w.name}</strong> chưa có turn nào hôm nay.`}
    </div>
    <button class="btn btn-dark" onclick="doCheckout(${id},${now})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Xác nhận Check-out
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}
function doCheckout(id, now) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const hours = w.checkinTime ? Math.round((now - w.checkinTime) / 36000) / 100 : 0;
  const today = new Date().toISOString().slice(0,10);
  if (!w.workLogs) w.workLogs = [];
  const todayLog = w.workLogs.find(l => l.date === today);
  if (todayLog) { todayLog.checkout = now; todayLog.hours = hours; }
  else w.workLogs.push({ date: today, checkin: w.checkinTime || now, checkout: now, hours });
  w.checkoutTime = now;
  w.checkinTime = null;
  w.status = 'off';
  toast(w.name + ' đã check-out 👋 · ' + hours + 'h làm việc');
  closePopup();
  saveState(); renderSettingsPane();
}
function confirmRemoveStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  document.getElementById('popup-head').innerHTML = `<div class="popup-av" style="background:var(--c-pen-bg);color:var(--c-pen)">!</div>
    <div><div class="popup-name">Xóa nhân viên</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0;color:var(--t2);font-size:13px;line-height:1.7">Xóa <strong>${w.name}</strong> khỏi danh sách?<br><span style="color:var(--t3);font-size:12px">Lịch sử ca sẽ mất đi.</span></div>
    <button class="btn btn-ghost" style="color:var(--c-pen);border-color:var(--c-pen-b)" onclick="doRemoveStaff(${id})">Xác nhận xóa</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function doRemoveStaff(id) {
  const w = W.find(x=>x.id===id);
  W = W.filter(x=>x.id!==id); delete penT[id];
  toast((w?w.name:'Thợ') + ' đã xóa');
  closePopup();
  if (currentTab==='settings') renderSettingsPane();
}

// ── REPORT TAB ──
function saveDayLog() {
  const today = new Date().toISOString().slice(0,10);
  const snap = W.map(w => ({ id:w.id, name:w.name, ini:w.ini, turns:w.turns, totalRevenue:w.totalRevenue, totalTip:w.totalTip, history:w.history }));
  const idx = dailyLogs.findIndex(l=>l.date===today);
  const entry = { date:today, workers:snap, totalTurns };
  if (idx>=0) dailyLogs[idx]=entry; else dailyLogs.push(entry);
  try { localStorage.setItem('nt_dailyLogs', JSON.stringify(dailyLogs)); } catch(e) {}
}

function getReportHTML() {
  saveDayLog();
  const today = new Date().toISOString().slice(0,10);
  const dates = [...new Set(dailyLogs.map(l=>l.date))].sort().reverse();
  if (!dates.includes(today)) dates.unshift(today);
  const dateOpts = dates.map(d=>`<option value="${d}"${d===today?' selected':''}>${d}</option>`).join('');
  return `<div class="tab-header">
    <div><div class="tab-title">Báo cáo lịch sử</div><div class="tab-sub">Toàn bộ lịch sử thao tác ca</div></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select class="f-select" id="report-date" onchange="renderReport()" style="width:160px;font-size:13px">
        ${dateOpts||'<option value="">Chưa có dữ liệu</option>'}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="confirmResetCa()" style="width:auto;padding:8px 14px;color:var(--c-pen);border-color:var(--c-pen-b)">
        🔄 Reset ca
      </button>
    </div>
  </div>
  <div id="report-wrap"></div>`;
}

function renderReport() {
  const wrap = document.getElementById('report-wrap'); if (!wrap) return;
  const sel = document.getElementById('report-date');
  const date = sel ? sel.value : new Date().toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  const log = dailyLogs.find(l=>l.date===date);
  const workers = (log && date!==today) ? log.workers : W.map(w=>({...w}));
  const tTurns = (log && date!==today) ? log.totalTurns : totalTurns;

  // Leaderboard — turns only
  const lbWorkers = [...workers].filter(w=>w.turns>0).sort((a,b)=>b.turns-a.turns);
  const medals = ['🥇','🥈','🥉'];
  const maxTurns = lbWorkers[0] ? lbWorkers[0].turns : 1;
  const lbRows = lbWorkers.slice(0,10).map((w,i) => {
    const barW = Math.round(w.turns/maxTurns*100);
    const avMins = w.avgTurnMs ? Math.round(w.avgTurnMs/60000) : null;
    return `<div class="lb-row" style="${i===0?'background:linear-gradient(90deg,rgba(200,73,107,.06),transparent)':''}">
      <div class="lb-rank" style="${i<3?'font-size:16px':'font-size:12px;color:var(--t4);font-weight:700'}">${medals[i]||i+1}</div>
      <div class="sc-avatar ${i===0?'av-busy':i===1?'av-next':'av-ready'}" style="width:32px;height:32px;font-size:10px;flex-shrink:0">${w.ini}</div>
      <div class="lb-info">
        <div class="lb-name">${w.name}${avMins?` <span style="font-size:10px;color:var(--t4);font-weight:500">· ⚡${avMins}p/turn</span>`:''}</div>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${barW}%"></div></div>
      </div>
      <div class="lb-stats">
        <div class="lb-turns">${w.turns}<span class="lb-unit"> turn</span></div>
      </div>
    </div>`;
  }).join('');

  // Tất cả turn — gộp lại, sort theo giờ
  const allTurns = [];
  workers.forEach(w => {
    (w.history||[]).forEach(h => allTurns.push({...h, wName: w.name, wIni: w.ini}));
  });
  allTurns.sort((a,b) => (a.ti||'').localeCompare(b.ti||''));

  const histRows = allTurns.map(h => `<tr>
    <td style="padding:10px 14px">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="sc-avatar av-ready" style="width:30px;height:30px;font-size:10px">${h.wIni}</div>
        <span style="font-size:13px;font-weight:700">${h.wName}</span>
      </div>
    </td>
    <td style="font-size:12px;color:var(--t2);font-variant-numeric:tabular-nums">${h.ti||'—'}</td>
    <td style="font-size:12px;color:var(--t3)">${h.dur||'—'}</td>
    <td style="font-size:12px">${h.svc ? svcL(h.svc) : '—'}</td>
    <td style="font-size:12px;color:var(--t3);font-style:italic">${h.note||'—'}</td>
  </tr>`).join('');

  const turnRows = [...workers].filter(w=>w.turns>0).sort((a,b)=>b.turns-a.turns)
    .map(w=>`<tr>
      <td style="padding:8px 14px">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="sc-avatar av-ready" style="width:28px;height:28px;font-size:10px">${w.ini}</div>
          <span style="font-size:13px;font-weight:600">${w.name}</span>
        </div>
      </td>
      <td style="font-size:13px;font-weight:700;color:var(--c-busy);text-align:center">${w.turns}</td>
    </tr>`).join('');

  wrap.innerHTML = `
    ${turnRows ? `<div class="data-table-wrap" style="margin-bottom:12px"><table class="data-table">
      <thead><tr><th>Nhân viên</th><th style="text-align:center">Số turn</th></tr></thead>
      <tbody>${turnRows}</tbody>
    </table></div>` : ''}
    <div class="data-table-wrap"><table class="data-table">
      <thead><tr><th>Thợ</th><th>Giờ</th><th>Thời gian</th><th>Dịch vụ</th><th>Ghi chú</th></tr></thead>
      <tbody>${histRows||'<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--t4)">Chưa có lịch sử trong ngày này</td></tr>'}</tbody>
    </table></div>`;
}

function confirmResetCa() {
  document.getElementById('popup-head').innerHTML = `<div class="popup-av" style="background:var(--c-pen-bg);color:var(--c-pen)">🔄</div>
    <div><div class="popup-name">Reset ca hôm nay</div><div class="popup-meta">Xóa toàn bộ dữ liệu ca hiện tại</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0;color:var(--t2);font-size:13px;line-height:1.8">
      Tất cả turn và lịch sử hôm nay sẽ về 0.<br>
      <span style="color:var(--t3);font-size:12px">Danh sách thợ vẫn giữ nguyên.<br>Dữ liệu báo cáo các ngày trước không bị ảnh hưởng.</span>
    </div>
    <button class="btn btn-ghost" style="color:var(--c-pen);border-color:var(--c-pen-b)" onclick="doResetCa()">Xác nhận Reset</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}
function doResetCa() {
  W.forEach(w => {
    w.turns = 0; w.status = 'off'; w.note = ''; w.startTime = null;
    w.service = ''; w.history = []; w.groupId = null; w.checkinTime = null;
  });
  totalTurns = 0;
  Object.keys(penT).forEach(k => delete penT[k]);
  localStorage.removeItem('nt_state');
  toast('Đã reset ca mới ✅');
  closePopup();
  setTab('shift');
}

function exportCSV() {
  const sel = document.getElementById('report-date');
  const date = sel ? sel.value : new Date().toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  const log = dailyLogs.find(l=>l.date===date);
  const workers = (log && date!==today) ? log.workers : W;
  const rows = [['Tên','Turn']];
  workers.forEach(w => rows.push([w.name, w.turns]));
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'nail-turn-'+date+'.csv'; a.click();
}

// ── POPUP: HISTORY ──
function openPopup(id) {
  selId = id;
  const w = W.find(x=>x.id===id); if (!w) return;
  const avCls = w.status==='busy'?'av-busy':w.status==='penalized'?'av-pen':w.status==='off'?'av-off':'av-ready';
  document.getElementById('popup-head').innerHTML = `<div class="popup-av ${avCls}">${w.ini}</div>
    <div><div class="popup-name">${w.name}</div><div class="popup-meta">${w.turns} turn</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  const histRows = w.history.length ? w.history.map(h=>`<div class="hr">
    <div><div class="hr-t">${h.ti}</div><div class="hr-d">${h.dur}</div></div>
    <div><div class="hr-s">${h.svc?svcL(h.svc):'—'}</div>${h.note?'<div class="hr-n">'+h.note+'</div>':''}</div>
  </div>`).join('') : '<div style="text-align:center;padding:24px 0;color:var(--t4);font-size:13px">Chưa có lịch sử ca nào</div>';
  document.getElementById('popup-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr;gap:8px">
      <div class="mini-stat"><div class="ms-val">${w.turns}</div><div class="ms-lbl">Turn hôm nay</div></div>
    </div>
    <div><div class="f-label" style="margin-bottom:8px">Lịch sử ca hôm nay</div>
    <div style="max-height:280px;overflow-y:auto">${histRows}</div></div>
    ${w.status==='ready'?`<button class="btn btn-ghost" onclick="closePopup();openPopup(${w.id})">📋 Xem lịch sử ca</button>`:''}
    <button class="btn btn-ghost" onclick="closePopup()">Đóng</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

// ── POPUP: DETAIL / ACTIONS ──
function openDetail(id) {
  selId = id;
  const w = W.find(x=>x.id===id); if (!w) return;
  const avCls = w.status==='busy'?'av-busy':w.status==='penalized'?'av-pen':w.status==='off'?'av-off':'av-ready';
  const stLbl = w.status==='ready'?'Rảnh':w.status==='busy'?'Đang làm':w.status==='penalized'?'Bị phạt':'Nghỉ';
  document.getElementById('popup-head').innerHTML = `<div class="popup-av ${avCls}">${w.ini}</div>
    <div><div class="popup-name">${w.name}</div><div class="popup-meta">${w.turns} turn · ${stLbl}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  let body = '';
  if (w.status === 'busy') {
    const elapsed = w.startTime ? Date.now()-w.startTime : 0;
    const startStr = w.startTime ? new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';
    body = `<div class="popup-timer"><div class="pt-val" id="pt-${w.id}">${fmtT(elapsed)}</div><div class="pt-sub">Bắt đầu lúc ${startStr}</div></div>
      <div><div class="f-label" style="margin-bottom:6px">Dịch vụ</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${svcCheckboxes(w.service,'svc-'+w.id)}</div></div>
      
      <div><div class="f-label">Ghi chú</div><textarea class="f-textarea" id="nt-${w.id}" rows="2" placeholder="Khách VIP, hẹn lại...">${w.note||''}</textarea></div>
      <button class="btn btn-dark" onclick="saveInfo(${w.id})" style="margin-top:2px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Lưu thông tin
      </button>
      <div class="sec-div"><div class="sec-div-line"></div><div class="sec-div-txt">Xong việc — tính turn</div><div class="sec-div-line"></div></div>
      <div class="btn-row">
        <button class="btn btn-dark btn-sm" style="flex:1" onclick="finishW(${w.id},1)">1 turn</button>
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="finishW(${w.id},0.5)">½ turn</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--t3)" onclick="finishW(${w.id},0)">0 turn</button>
      </div>
      <div class="sec-div"><div class="sec-div-line"></div><div class="sec-div-txt">Chuyển ca</div><div class="sec-div-line"></div></div>
      <button class="btn btn-ghost" onclick="openTransferTurn(${w.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        Chuyển ca cho thợ khác
      </button>`;
  } else if (w.status === 'penalized') {
    const pt = penT[w.id];
    body = `<div class="pen-timer-display"><div class="ptd-val" id="popen-${w.id}">${pt?fmtP(pt.ut):'--:--'}</div><div class="ptd-sub">Còn lại</div></div>
      <button class="btn btn-green" onclick="remPen(${w.id})">✅ Gỡ phạt sớm</button>`;
  } else if (w.status === 'ready') {
    body = `<button class="btn btn-rose" onclick="assignW(${w.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        Vào turn ngay
      </button>
      <button class="btn btn-ghost" onclick="setSt(${w.id},'off')">😴 Cho nghỉ</button>
      <div><div class="f-label" style="margin-bottom:8px">🔒 Phạt / Khóa ca</div>
        <div class="pen-grid">
          <button class="pen-opt" onclick="penW(${w.id},0.5)">30 phút</button>
          <button class="pen-opt" onclick="penW(${w.id},1)">1 giờ</button>
          <button class="pen-opt" onclick="penW(${w.id},2)">2 giờ</button>
          <button class="pen-opt" onclick="penW(${w.id},3)">3 giờ</button>
        </div>
      </div>`;
  } else {
    body = `<div style="text-align:center;padding:12px 0;color:var(--t3);font-size:13px">Chưa check-in hôm nay.<br>Vào <strong>Quản lý nhân viên</strong> để check-in.</div>
      <button class="btn btn-ghost" style="color:var(--c-pen);border-color:var(--c-pen-b)" onclick="removeW(${w.id})">Xóa khỏi ca</button>`;
  }
  document.getElementById('popup-body').innerHTML = body;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function closePopup() {
  document.getElementById('popup-overlay').style.display = 'none';
  selId = null; render(); saveState();
}
function closePopupOnOverlay(e) { if (e.target===document.getElementById('popup-overlay')) closePopup(); }

// ── ACTIONS ──
function togHist(e, id) { e.stopPropagation(); exHist.has(id)?exHist.delete(id):exHist.add(id); renderGrid(); }
function toggleChk(id) { multiSel.has(id)?multiSel.delete(id):multiSel.add(id); render(); }
function saveInfo(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const nt=document.getElementById('nt-'+id);
  w.service = getCheckedSvc('svc-'+id);
  if(nt) w.note=nt.value.trim();
  toast('Đã lưu thông tin ' + w.name + ' ✓'); renderGrid();
}

function assignNext() {
  const rd = readyW(); if (!rd.length) { toast('Không có thợ rảnh!'); return; }
  // Dùng chung flow với assignW — mở popup đầy đủ cho thợ đầu hàng
  assignW(rd[0].id);
}
function confirmAssignNext(id) {
  const w = W.find(x=>x.id===id); if (!w||w.status!=='ready') return;
  w.status='busy'; w.turns++; totalTurns++; w.note=''; w.startTime=Date.now(); w.service=''; w.revenue=0; w.tip=0;
  toast('Vào turn cho ' + w.name + ' 💅'); closePopup();
}
function assignW(id) {
  const w = W.find(x=>x.id===id); if (!w||w.status!=='ready') return;
  const rd = readyW();
  document.getElementById('popup-head').innerHTML = `<div class="popup-av av-ready">${w.ini}</div>
    <div><div class="popup-name">${w.name}</div><div class="popup-meta">Hàng chờ #${rd.indexOf(w)+1} · ${rd.length} thợ rảnh</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div><div class="f-label" style="margin-bottom:6px">Dịch vụ</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${svcCheckboxes('','asn-svc-'+id)}</div></div>
    <div><div class="f-label">Ghi chú khách</div><textarea class="f-textarea" id="asn-note-${id}" rows="2" placeholder="Khách VIP, yêu cầu đặc biệt..."></textarea></div>
    <button class="btn btn-rose" onclick="doAssignW(${id})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      Xác nhận vào turn
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
  setTimeout(() => { const el=document.getElementById('asn-svc-'+id); if(el) el.focus(); }, 100);
}
function doAssignW(id) {
  const w = W.find(x=>x.id===id); if (!w||w.status!=='ready') return;
  const sv=document.getElementById('asn-svc-'+id), nt=document.getElementById('asn-note-'+id);
  w.status='busy'; w.turns++; totalTurns++; w.startTime=Date.now();
  w.service = getCheckedSvc('asn-svc-'+id);
  w.note = nt ? nt.value.trim() : '';
  w.revenue=0; w.tip=0;
  toast('Vào turn cho ' + w.name + ' 💅'); closePopup();
  const _svcLbl = w.service ? '\nDịch vụ: ' + svcL(w.service) : '';
  const _noteLbl = w.note ? '\nGhi chú: ' + w.note : '';
  const _timeStr = new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  const _tgMsg = w.name + (w.service ? '\n' + svcL(w.service) : '');
  sendTelegramMsg(_tgMsg);
  if (w.telegramId) sendTelegramMsgTo(w.telegramId, _tgMsg);
}
function finishW(id, tw) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const ne=document.getElementById('nt-'+id);
  if (ne !== null) {
    // Gọi từ popup chi tiết — lưu note rồi hiển thị màn xác nhận, KHÔNG finish ngay
    w.note = ne.value.trim();
    // Lưu dịch vụ đang chọn
    const svcEl = document.getElementById('svc-'+id) || document.getElementById('rv-svc-'+id);
    if (svcEl) w.service = svcEl.value;
    const elapsed = w.startTime ? Date.now()-w.startTime : 0;
    const startStr = w.startTime ? new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';
    const twLabel = tw===1 ? '1 turn' : tw===0.5 ? '½ turn' : '0 turn';
    const twColor = tw===0 ? 'var(--t3)' : 'var(--c-ready)';
    document.getElementById('popup-body').innerHTML = `
      <div style="text-align:center;padding:12px 0 8px">
        <div style="font-size:13px;color:var(--t3);margin-bottom:4px">Thời gian làm việc</div>
        <div class="pt-val" style="font-size:34px;color:var(--c-busy)">${fmtT(elapsed)}</div>
        <div style="font-size:11.5px;color:var(--t4);margin-top:4px">Bắt đầu lúc ${startStr}</div>
      </div>
      <div style="background:var(--surface-2);border:1px solid var(--br2);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px;color:var(--t3)">Tính turn</span>
        <span style="font-size:16px;font-weight:800;color:${twColor}">${twLabel}</span>
      </div>
      ${w.note ? `<div style="background:var(--surface-2);border:1px solid var(--br);border-radius:var(--r);padding:10px 14px;font-size:12px;color:var(--t3)"><span style="font-weight:700;color:var(--t2)">Ghi chú:</span> ${w.note}</div>` : ''}
      <button class="btn btn-green" onclick="_doFinishW(W.find(x=>x.id===${id}), ${tw}, 0, 0); closePopup();">
        ✅ Xác nhận hoàn thành
      </button>
      <button class="btn btn-ghost" onclick="openDetail(${id})">← Quay lại</button>`;
    return;
  } else {
    // Gọi từ nút quick — nhảy thẳng vào màn xác nhận
    const elapsed = w.startTime ? Date.now()-w.startTime : 0;
    const startStr = w.startTime ? new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';
    const twLabel = tw===1 ? '1 turn' : tw===0.5 ? '½ turn' : '0 turn';
    const twColor = tw===0 ? 'var(--t3)' : 'var(--c-ready)';
    document.getElementById('popup-head').innerHTML = `<div class="popup-av av-busy">${w.ini}</div>
      <div><div class="popup-name">${w.name}</div><div class="popup-meta">Xong việc · ${fmtT(elapsed)}</div></div>
      <button class="popup-close" onclick="closePopup()">✕</button>`;
    document.getElementById('popup-body').innerHTML = `
      <div style="text-align:center;padding:12px 0 8px">
        <div style="font-size:13px;color:var(--t3);margin-bottom:4px">Thời gian làm việc</div>
        <div class="pt-val" style="font-size:34px;color:var(--c-busy)">${fmtT(elapsed)}</div>
        <div style="font-size:11.5px;color:var(--t4);margin-top:4px">Bắt đầu lúc ${startStr}</div>
      </div>
      <div style="background:var(--surface-2);border:1px solid var(--br2);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px;color:var(--t3)">Tính turn</span>
        <span style="font-size:16px;font-weight:800;color:${twColor}">${twLabel}</span>
      </div>
      <button class="btn btn-green" onclick="_doFinishW(W.find(x=>x.id===${id}), ${tw}, 0, 0); closePopup();">
        ✅ Xác nhận hoàn thành
      </button>
      <button class="btn btn-ghost" onclick="openDetail(${id})">📝 Thêm ghi chú / đổi turn</button>`;
    document.getElementById('popup-overlay').style.display = 'flex';
  }
}
function _doFinishW(w, tw, rev, tip) {
  // đọc dịch vụ từ popup đang mở
  const svcVal = getCheckedSvc('svc-'+w.id) || getCheckedSvc('rv-svc-'+w.id);
  if (svcVal) w.service = svcVal;
  w.turns=Math.round((w.turns-1+tw)*10)/10; totalTurns=Math.round((totalTurns-1+tw)*10)/10;
  const dur=w.startTime?Date.now()-w.startTime:0, ti=w.startTime?new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'-';
  if (!w.history) w.history=[];
  w.history.push({ti, dur:fmtT(dur), svc:w.service, note:w.note, tw});
  exHist.add(w.id);
  const _finSvc = w.service ? '\nDịch vụ: ' + svcL(w.service) : '';
  const _finTw  = tw===1 ? '1 turn' : tw===0.5 ? '½ turn' : '0 turn (không tính)';
  W=W.filter(x=>x.id!==w.id);
  w.status='ready'; w.note=''; w.startTime=null; w.service=''; w.revenue=0; w.tip=0; w.groupId=null;
  W.push(w); selId=null;
  toast(w.name + ' xong việc — về cuối hàng ✓'); closePopup();
}
function setSt(id, s) {
  const w=W.find(x=>x.id===id); if (!w) return;
  W=W.filter(x=>x.id!==id); w.status=s; W.push(w); selId=null;
  toast(w.name+': '+(s==='off'?'Cho nghỉ 😴':'Vào làm lại ✅')); closePopup();
}
function openTransferTurn(fromId) {
  const from = W.find(x=>x.id===fromId); if (!from) return;
  const available = W.filter(x=>x.status==='ready' && x.checkinTime);
  if (!available.length) {
    toast('Không có thợ rảnh để chuyển ca!'); return;
  }
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-busy">${from.ini}</div>
    <div><div class="popup-name">Chuyển ca</div><div class="popup-meta">Từ ${from.name} → chọn thợ nhận</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  const opts = available.map(w => `
    <button onclick="confirmTransfer(${fromId},${w.id})" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:10px;border:1.5px solid var(--br2);background:var(--surface-2);cursor:pointer;font-family:inherit;transition:all .15s;text-align:left" onmouseover="this.style.borderColor='var(--c-ready)';this.style.background='var(--c-ready-bg)'" onmouseout="this.style.borderColor='var(--br2)';this.style.background='var(--surface-2)'">
      <div class="sc-avatar av-ready" style="width:36px;height:36px;font-size:11px;flex-shrink:0">${w.ini}</div>
      <div style="text-align:left">
        <div style="font-size:13px;font-weight:700;color:var(--t1)">${w.name}</div>
        <div style="font-size:11px;color:var(--c-ready)">● Rảnh · ${w.turns} turn hôm nay</div>
      </div>
    </button>`).join('');
  document.getElementById('popup-body').innerHTML = `
    <div style="font-size:12px;color:var(--t3);margin-bottom:4px">Dịch vụ &amp; ghi chú sẽ được giữ nguyên khi chuyển.</div>
    <div style="display:flex;flex-direction:column;gap:8px">${opts}</div>
    <button class="btn btn-ghost" onclick="openDetail(${fromId})" style="margin-top:4px">← Quay lại</button>`;
}

function confirmTransfer(fromId, toId) {
  const from = W.find(x=>x.id===fromId);
  const to   = W.find(x=>x.id===toId);
  if (!from || !to || to.status !== 'ready') { toast('Thợ này không còn rảnh!'); return; }

  // Chuyển thông tin turn sang thợ mới
  to.status    = 'busy';
  to.startTime = from.startTime || Date.now();
  to.service   = from.service;
  to.note      = from.note;
  to.groupId   = from.groupId;

  // Thợ cũ về rảnh, không tính turn
  from.status    = 'ready';
  from.startTime = null;
  from.service   = '';
  from.note      = '';
  from.groupId   = null;

  saveState(); render();
  toast(`Đã chuyển ca từ ${from.name} → ${to.name} ✅`);
  closePopup();
}

function removeW(id) {
  const w=W.find(x=>x.id===id);
  if (!confirm('Xóa '+(w?w.name:'thợ')+' khỏi ca?')) return;
  W=W.filter(x=>x.id!==id); selId=null; closePopup();
}
function addWorker() {
  const nm=prompt('Tên thợ mới:'); if (!nm||!nm.trim()) return;
  const n=nm.trim(), ini=n.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);
  W.push(mkW(nextId++, n, ini)); toast('Đã thêm '+n+' ✨'); render();
}
function toggleMulti() { multiMode=!multiMode; multiSel.clear(); selId=null; render(); }
function cancelMulti() { multiMode=false; multiSel.clear(); render(); }
function assignMulti() {
  if (multiSel.size < 2) { toast('Chọn ít nhất 2 thợ!'); return; }
  const members = [...multiSel].map(id => W.find(x=>x.id===id)).filter(w=>w&&w.status==='ready');
  if (members.length < 2) { toast('Cần ít nhất 2 thợ rảnh!'); return; }

  const memberRows = members.map(w => `
    <div style="border:1px solid var(--br);border-radius:10px;padding:10px;background:var(--surface-2)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div class="sc-avatar av-ready" style="width:30px;height:30px;font-size:10px;flex-shrink:0">${w.ini}</div>
        <div style="font-size:13px;font-weight:700">${w.name}</div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px">Dịch vụ</div>
      ${svcCheckboxes('', 'mgrp-'+w.id)}
    </div>`).join('');

  document.getElementById('popup-head').innerHTML = `
    <div style="display:flex;gap:4px">${members.map(m=>`<div class="sc-avatar av-ready" style="width:32px;height:32px;font-size:10px">${m.ini}</div>`).join('')}</div>
    <div><div class="popup-name">Giao ca nhóm</div><div class="popup-meta">${members.length} thợ · chọn dịch vụ cho từng người</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;max-height:60dvh;overflow-y:auto">${memberRows}</div>
    <div><div class="f-label">Ghi chú chung</div><textarea class="f-textarea" id="mgrp-note" rows="2" placeholder="Khách VIP, yêu cầu đặc biệt..."></textarea></div>
    <button class="btn btn-rose" onclick="doAssignMulti()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      Xác nhận giao ca nhóm
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function doAssignMulti() {
  const members = [...multiSel].map(id => W.find(x=>x.id===id)).filter(w=>w&&w.status==='ready');
  if (members.length < 2) { toast('Cần ít nhất 2 thợ rảnh!'); return; }
  const gid = 'G'+Date.now();
  const note = (document.getElementById('mgrp-note')||{}).value || '';
  members.forEach(w => {
    w.status='busy'; w.turns++; w.startTime=Date.now(); w.groupId=gid;
    w.service = getCheckedSvc('mgrp-'+w.id);
    w.note = note; w.revenue=0; w.tip=0;
  });
  totalTurns += members.length;
  toast('Đã giao ca cho '+members.length+' thợ 👥');
  multiMode=false; multiSel.clear(); closePopup();
  const _grpTime = new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  const _grpLines = members.map(m => `  • ${m.name}${m.service?' — '+svcL(m.service):''}`).join('\n');
  members.forEach(m => {
    const _mMsg = m.name + (m.service ? '\n' + svcL(m.service) : '');
    sendTelegramMsg(_mMsg);
    if (m.telegramId) sendTelegramMsgTo(m.telegramId, _mMsg);
  });
}
function penW(id, hours) {
  const w=W.find(x=>x.id===id); if (!w) return;
  const lbl = hours < 1 ? (hours*60)+' phút' : hours+' giờ';
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0 4px;font-size:13px;color:var(--t2);line-height:1.8">
      Phạt <strong>${w.name}</strong> trong <strong>${lbl}</strong>?<br>
      <span style="font-size:12px;color:var(--t3)">Thợ sẽ không nhận turn trong thời gian này.</span>
    </div>
    <button class="btn btn-ghost" style="color:var(--c-pen);border-color:var(--c-pen-b)" onclick="doPenW(${id},${hours})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Xác nhận phạt ${lbl}
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
}
function doPenW(id, hours) {
  const w=W.find(x=>x.id===id); if (!w) return;
  const lbl = hours < 1 ? (hours*60)+' phút' : hours+' giờ';
  W=W.filter(x=>x.id!==id); w.status='penalized';
  penT[w.id]={ut:Date.now()+hours*3600000}; W.push(w); selId=null;
  toast(w.name+' bị phạt '+lbl+' 🔒'); closePopup();
}
function remPen(id) {
  const w=W.find(x=>x.id===id); if (!w) return;
  const pt = penT[id];
  const remaining = pt ? fmtP(pt.ut) : '';
  // replace popup body with confirm
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0 4px;font-size:13px;color:var(--t2);line-height:1.8">
      Gỡ phạt sớm cho <strong>${w.name}</strong>?${remaining ? `<br><span style="font-size:12px;color:var(--t3)">Còn ${remaining} chưa hết hạn.</span>` : ''}
    </div>
    <button class="btn btn-green" onclick="doRemPen(${id})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
      Xác nhận gỡ phạt
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
}
function doRemPen(id) {
  const w=W.find(x=>x.id===id); if (!w) return;
  W=W.filter(x=>x.id!==id); w.status='ready'; delete penT[id]; W.push(w); selId=null;
  toast('Gỡ phạt cho '+w.name+' ✅'); closePopup();
}
function openGroupPopup(gid) {
  const members = W.filter(w=>w.groupId===gid&&w.status==='busy'); if (!members.length) return;
  const elapsed = members[0].startTime ? Date.now()-members[0].startTime : 0;
  const startStr = members[0].startTime ? new Date(members[0].startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';

  const memberRows = members.map(m => `
    <div style="border:1px solid var(--br);border-radius:10px;padding:10px;background:var(--surface-2)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div class="sc-avatar av-busy" style="width:28px;height:28px;font-size:9px;flex-shrink:0">${m.ini}</div>
        <div style="font-size:13px;font-weight:700">${m.name}</div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px">Dịch vụ</div>
      ${svcCheckboxes(m.service, 'gsvc-'+gid+'-'+m.id)}
      <div style="margin-top:6px"><div class="f-label" style="font-size:10px">Ghi chú</div>
        <textarea class="f-textarea" id="gnote-${gid}-${m.id}" rows="1" placeholder="Ghi chú riêng..." style="font-size:11px;padding:5px 8px;margin-top:3px">${m.note||''}</textarea>
      </div>
    </div>`).join('');

  document.getElementById('popup-head').innerHTML = `
    <div style="display:flex;gap:4px">${members.map(m=>`<div class="sc-avatar av-busy" style="width:32px;height:32px;font-size:10px">${m.ini}</div>`).join('')}</div>
    <div><div class="popup-name">Nhóm ${members.length} thợ</div><div class="popup-meta">${members.map(m=>m.name).join(', ')}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div class="popup-timer"><div class="pt-val" id="pt-g-${gid}">${fmtT(elapsed)}</div><div class="pt-sub">Bắt đầu lúc ${startStr}</div></div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:55dvh;overflow-y:auto">${memberRows}</div>
    <div class="sec-div"><div class="sec-div-line"></div><div class="sec-div-txt">Xong việc</div><div class="sec-div-line"></div></div>
    <div class="btn-row">
      <button class="btn btn-dark btn-sm" style="flex:1" onclick="finishGroup('${gid}',1)">1 turn / thợ</button>
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="finishGroup('${gid}',0.5)">½ turn / thợ</button>
      <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--t3)" onclick="finishGroup('${gid}',0)">0 turn</button>
    </div>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}
function saveGroupSvc(gid, val) { W.filter(w=>w.groupId===gid).forEach(w=>w.service=val); }
function finishGroup(gid, tw) {
  const members = W.filter(w=>w.groupId===gid&&w.status==='busy');
  members.forEach(w => {
    // đọc dịch vụ riêng từng thợ
    const svc = getCheckedSvc('gsvc-'+gid+'-'+w.id);
    if (svc !== undefined) w.service = svc || w.service;
    const noteEl = document.getElementById('gnote-'+gid+'-'+w.id);
    if (noteEl) w.note = noteEl.value.trim();
    w.turns=Math.round((w.turns-1+tw)*10)/10;
    const dur=w.startTime?Date.now()-w.startTime:0, ti=w.startTime?new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'-';
    if (!w.history) w.history=[];
    w.history.push({ti, dur:fmtT(dur), svc:w.service, note:w.note, tw});
    exHist.add(w.id);
  });
  const _grpDur = members[0].startTime ? Date.now()-members[0].startTime : 0;
  totalTurns=Math.round((totalTurns-members.length+members.length*tw)*10)/10;
  members.forEach(w => {
    W=W.filter(x=>x.id!==w.id);
    w.status='ready'; w.note=''; w.startTime=null; w.service=''; w.revenue=0; w.tip=0; w.groupId=null;
    W.push(w);
  });
  toast('Nhóm '+members.length+' thợ xong việc ✓'); closePopup();
  const _grpTw = tw===1 ? '1 turn/thợ' : tw===0.5 ? '½ turn/thợ' : '0 turn';
}


// ══════════════════════════════════════════
//  SETTINGS TAB — Staff + Services
// ══════════════════════════════════════════

let settingsPane = 'staff'; // 'staff' | 'services'

function getSettingsHTML() {
  return `<div class="settings-content" id="settings-content"></div>`;
}

function switchSettingsPane(pane) {
  settingsPane = pane;
  // active đúng nút sidebar theo data-pane
  document.querySelectorAll('.nav-btn[data-tab="settings"]').forEach(b => {
    b.classList.toggle('active', b.dataset.pane === pane);
  });
  renderSettingsPane();
}

function renderSettingsTab() {
  settingsPane = 'staff';
  renderSettingsPane();
}

function renderSettingsPane() {
  const content = document.getElementById('settings-content');
  if (!content) return;
  if (settingsPane === 'staff') renderStaffPane(content);
  else renderServicesPane(content);
  // update counts
  const sc = document.getElementById('snav-staff-count'); if(sc) sc.textContent = W.length;
  const vc = document.getElementById('snav-svc-count'); if(vc) vc.textContent = SVCS_USER.length;
}

// ── STAFF PANE ──
function renderStaffPane(container) {
  const sorted = [...W].sort((a,b) => {
    const aIn = a.checkinTime ? 1 : 0, bIn = b.checkinTime ? 1 : 0;
    if (bIn !== aIn) return bIn - aIn;
    return (a.checkinTime||0) - (b.checkinTime||0);
  });

  const rows = sorted.map(w => {
    const avCls = w.status==='busy'?'av-busy':w.status==='off'?'av-off':w.status==='penalized'?'av-pen':'av-ready';
    const isIn = !!w.checkinTime;
    const ciTime = isIn ? new Date(w.checkinTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : null;
    const statusDot = w.status==='busy' ? 'var(--c-busy)' : w.status==='penalized' ? 'var(--c-pen)' : isIn ? 'var(--c-ready)' : 'var(--c-off)';
    const statusLbl = w.status==='busy'?'Đang làm':w.status==='penalized'?'Bị phạt':isIn?'Rảnh':'Chưa check-in';
    return `<div class="staff-row" onclick="openStaffDetail(${w.id})">
      <div class="staff-row-av" style="${!isIn?'opacity:.45':''}">
        <div class="sc-avatar ${avCls}" style="width:40px;height:40px;font-size:12px;overflow:hidden">${avImg(w,40)}</div>
        <div class="staff-row-dot" style="background:${statusDot}"></div>
      </div>
      <div class="staff-row-info" style="${!isIn?'opacity:.5':''}">
        <div class="staff-row-name">${w.name}</div>
        <div class="staff-row-meta">
          <span style="color:${statusDot};font-weight:600">${statusLbl}</span>
          ${isIn ? `<span style="color:var(--t4)">· check-in ${ciTime}</span>` : ''}
          ${w.turns ? `<span style="color:var(--t4)">· ${w.turns} turn</span>` : ''}
          ${w.telegramId ? `<span style="color:#2BA5F7;font-size:10px">· ✈️ TG</span>` : `<span style="color:var(--t5);font-size:10px">· chưa có TG</span>`}
        </div>
      </div>
      <div class="staff-row-actions" onclick="event.stopPropagation()">
        ${isIn
          ? `<button class="qa-btn" onclick="checkoutStaff(${w.id})" style="font-size:11px;padding:5px 10px;color:var(--c-pen);border-color:var(--c-pen-b)">Check-out</button>`
          : `<button class="qa-btn qa-primary" onclick="checkinStaff(${w.id})" style="font-size:11px;padding:5px 12px">Check-in</button>`
        }
        <button class="qa-btn" onclick="openEditStaff(${w.id})" style="font-size:11px;padding:5px 10px">Sửa</button>
        <button class="qa-btn" onclick="confirmRemoveStaff(${w.id})" style="font-size:11px;padding:5px 10px;color:var(--c-pen);border-color:var(--c-pen-b)">Xóa</button>
      </div>
    </div>`;
  }).join('');

  // attendance table
  const todayDate = new Date().toISOString().slice(0,10);
  const totalHrs = W.reduce((s,w) => {
    const log = (w.workLogs||[]).find(l=>l.date===todayDate);
    return s + (log ? log.hours : 0);
  }, 0);
  const attendRows = W.map(w => {
    const log = (w.workLogs||[]).find(l=>l.date===todayDate);
    const ci = w.checkinTime
      ? new Date(w.checkinTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})
      : (log ? new Date(log.checkin).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '—');
    const co = (w.checkoutTime && !w.checkinTime)
      ? new Date(w.checkoutTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})
      : (w.checkinTime ? '<span style="color:var(--c-busy);font-size:10px">Đang ca</span>' : '—');
    const hrs = log ? log.hours + 'h' : (w.checkinTime ? '…' : '—');
    const isIn = !!w.checkinTime;
    return `<div class="attend-row">
      <div class="sc-avatar ${isIn?'av-ready':'av-off'}" style="width:30px;height:30px;font-size:9px;flex-shrink:0">${w.ini}</div>
      <div class="attend-name">${w.name}</div>
      <div class="attend-cell" style="color:${isIn?'var(--c-ready)':'var(--t3)'}">${ci}</div>
      <div class="attend-cell">${co}</div>
      <div class="attend-cell" style="font-weight:700">${hrs}</div>
      <div class="attend-cell" style="color:var(--rose);font-weight:700">${w.turns||0} turn</div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="settings-pane-head">
      <div>
        <div class="settings-section-title">Nhân viên</div>
        <div class="settings-section-sub">${W.length} nhân viên · ${W.filter(w=>w.checkinTime).length} đang trong ca · ${W.filter(w=>w.checkoutTime&&!w.checkinTime).length} đã checkout</div>
      </div>
      <button class="btn btn-rose btn-sm" onclick="openAddStaff()" style="width:auto;padding:9px 18px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Thêm nhân viên
      </button>
    </div>

    <div class="settings-section">
      <div class="staff-list" id="staff-list">
        ${rows || '<div style="text-align:center;padding:40px;color:var(--t4);font-size:13px">Chưa có nhân viên nào.</div>'}
      </div>
    </div>

    <div class="settings-section" style="margin-top:10px">
      <div class="settings-section-head">
        <div>
          <div class="settings-section-title">📋 Chấm công hôm nay</div>
          <div class="settings-section-sub">Tổng ${totalHrs.toFixed(1)}h · ${W.filter(w=>w.checkinTime).length} đang làm</div>
        </div>
      </div>
      <div class="attend-table">
        <div class="attend-header">
          <div style="width:30px"></div>
          <div class="attend-name" style="font-weight:700;color:var(--t4)">Tên</div>
          <div class="attend-cell" style="font-weight:700;color:var(--t4)">Check-in</div>
          <div class="attend-cell" style="font-weight:700;color:var(--t4)">Check-out</div>
          <div class="attend-cell" style="font-weight:700;color:var(--t4)">Giờ</div>
          <div class="attend-cell" style="font-weight:700;color:var(--t4)">Turn</div>
        </div>
        ${attendRows}
      </div>
    </div>`;
}

// ── SERVICES PANE ──
// Emoji list for quick pick
const EMOJI_LIST = ['💅','🦶','✨','🌸','💎','🎨','🪡','👁','⭐','💆','💇','🌺','🌟','💄','🪮','🫧','💋','🧖','🫶','🌈','🏆','🔥','💫','🎀','🩷'];

function renderServicesPane(container) {
  const rows = SVCS_USER.map((s, i) => `
    <div class="svc-row" data-idx="${i}" id="svcrow-${i}">
      <div class="svc-drag-handle" title="Kéo để sắp xếp">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
      </div>
      <div class="svc-emoji-btn" onclick="openEmojiPicker(${i})" title="Chọn icon">${s.l.split(' ')[0]}</div>
      <div class="svc-name-display">${s.l.replace(/^\S+\s*/, '')}</div>
      <div class="svc-key-badge">${s.v}</div>
      <div class="svc-actions">
        <button class="qa-btn" onclick="openEditSvc(${i})" style="padding:5px 10px;font-size:11px">Sửa</button>
        <button class="qa-btn" onclick="confirmDeleteSvc(${i})" style="padding:5px 10px;font-size:11px;color:var(--c-pen);border-color:var(--c-pen-b)">Xóa</button>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="settings-pane-head">
      <div>
        <div class="settings-section-title">Dịch vụ</div>
        <div class="settings-section-sub">${SVCS_USER.length} dịch vụ · Kéo để sắp xếp thứ tự hiển thị</div>
      </div>
      <button class="btn btn-rose btn-sm" onclick="openAddSvc()" style="width:auto;padding:9px 18px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Thêm dịch vụ
      </button>
    </div>

    <div class="settings-section">
      <div class="svc-list" id="svc-list">
        ${rows || '<div style="text-align:center;padding:40px;color:var(--t4);font-size:13px">Chưa có dịch vụ nào. Bấm <strong>Thêm dịch vụ</strong> để bắt đầu.</div>'}
      </div>
    </div>

    <div class="settings-section" style="margin-top:10px">
      <div class="settings-section-head" style="border-bottom:none">
        <div>
          <div class="settings-section-title">Xem trước</div>
          <div class="settings-section-sub">Giao diện khi chọn dịch vụ cho thợ</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="confirmResetSvcs()" style="width:auto;padding:7px 12px;font-size:11px;color:var(--t3)">Khôi phục mặc định</button>
      </div>
      <div class="svc-preview-wrap">
        ${SVCS_USER.map(s => `<span class="svc-preview-pill">${s.l}</span>`).join('')}
        ${!SVCS_USER.length ? '<span style="color:var(--t4);font-size:12px;padding:4px">Chưa có dịch vụ</span>' : ''}
      </div>
    </div>`;

  initSvcDrag();
}

// ── ADD SERVICE ──
function openAddSvc() {
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av" style="background:var(--rose-bg);color:var(--rose);font-size:20px">✨</div>
    <div><div class="popup-name">Thêm dịch vụ mới</div><div class="popup-meta">Điền thông tin dịch vụ</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div>
      <div class="f-label">Icon dịch vụ</div>
      <div class="emoji-grid" id="add-emoji-grid">
        ${EMOJI_LIST.map(e => `<button class="emoji-btn" onclick="selectEmoji('add',this,'${e}')">${e}</button>`).join('')}
      </div>
      <input type="hidden" id="add-emoji-val" value="💅">
    </div>
    <div>
      <div class="f-label">Tên dịch vụ</div>
      <input class="f-input" id="add-svc-name" placeholder="VD: Nail Art, Combo Set..." maxlength="40">
    </div>
    <div>
      <div class="f-label">Mã dịch vụ <span style="color:var(--t4);font-weight:400;text-transform:none">(dùng nội bộ, không dấu)</span></div>
      <input class="f-input" id="add-svc-key" placeholder="VD: Art, Combo, GelX..." maxlength="20" style="text-transform:uppercase">
    </div>
    <div id="add-preview-wrap" style="padding:10px 12px;background:var(--surface-2);border-radius:var(--r-sm);border:1px solid var(--br);text-align:center;font-size:14px;font-weight:600;color:var(--t2)">
      💅 Dịch vụ mới
    </div>
    <button class="btn btn-rose" onclick="doAddSvc()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Thêm dịch vụ
    </button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';

  // live preview
  ['add-emoji-val','add-svc-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateAddPreview);
  });
  // auto-generate key from name
  const nameEl = document.getElementById('add-svc-name');
  const keyEl = document.getElementById('add-svc-key');
  if (nameEl && keyEl) {
    nameEl.addEventListener('input', () => {
      const raw = nameEl.value.trim();
      if (raw && !keyEl._manualEdit) {
        keyEl.value = raw.replace(/[^a-zA-Z0-9]/g,'').slice(0,12).toUpperCase() || raw.slice(0,8).toUpperCase();
      }
      updateAddPreview();
    });
    keyEl.addEventListener('input', () => { keyEl._manualEdit = true; });
  }
  setTimeout(() => { document.getElementById('add-svc-name')?.focus(); }, 100);
}

function updateAddPreview() {
  const emoji = document.getElementById('add-emoji-val')?.value || '💅';
  const name = document.getElementById('add-svc-name')?.value.trim() || 'Dịch vụ mới';
  const prev = document.getElementById('add-preview-wrap');
  if (prev) prev.textContent = emoji + ' ' + name;
}

function selectEmoji(ctx, btn, emoji) {
  document.querySelectorAll(`#${ctx}-emoji-grid .emoji-btn`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const hidden = document.getElementById(ctx + '-emoji-val');
  if (hidden) hidden.value = emoji;
  if (ctx === 'add') updateAddPreview();
  if (ctx.startsWith('edit')) updateEditPreview(ctx);
}

function doAddSvc() {
  const name = document.getElementById('add-svc-name')?.value.trim();
  const key = document.getElementById('add-svc-key')?.value.trim().replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
  const emoji = document.getElementById('add-emoji-val')?.value || '💅';
  if (!name) { toast('Nhập tên dịch vụ!'); return; }
  if (!key) { toast('Nhập mã dịch vụ!'); return; }
  if (SVCS_USER.find(s => s.v === key)) { toast('Mã dịch vụ đã tồn tại!'); return; }
  SVCS_USER.push({ v: key, l: emoji + ' ' + name });
  saveSvcs();
  toast('Đã thêm dịch vụ: ' + emoji + ' ' + name + ' ✨');
  closePopup();
  renderSettingsTab();
}

// ── EDIT SERVICE ──
function openEditSvc(idx) {
  const s = SVCS_USER[idx]; if (!s) return;
  const parts = s.l.match(/^(\S+)\s(.+)$/);
  const emoji = parts ? parts[1] : '💅';
  const name = parts ? parts[2] : s.l;
  const ctxId = 'edit' + idx;
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av" style="background:var(--rose-bg);color:var(--rose);font-size:20px">${emoji}</div>
    <div><div class="popup-name">Sửa dịch vụ</div><div class="popup-meta">${s.l}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div>
      <div class="f-label">Icon dịch vụ</div>
      <div class="emoji-grid" id="${ctxId}-emoji-grid">
        ${EMOJI_LIST.map(e => `<button class="emoji-btn${e===emoji?' selected':''}" onclick="selectEmoji('${ctxId}',this,'${e}')">${e}</button>`).join('')}
      </div>
      <input type="hidden" id="${ctxId}-emoji-val" value="${emoji}">
    </div>
    <div>
      <div class="f-label">Tên dịch vụ</div>
      <input class="f-input" id="${ctxId}-name" value="${name}" maxlength="40">
    </div>
    <div>
      <div class="f-label">Mã dịch vụ</div>
      <input class="f-input" id="${ctxId}-key" value="${s.v}" maxlength="20" style="text-transform:uppercase">
    </div>
    <div id="${ctxId}-preview-wrap" style="padding:10px 12px;background:var(--surface-2);border-radius:var(--r-sm);border:1px solid var(--br);text-align:center;font-size:14px;font-weight:600;color:var(--t2)">
      ${s.l}
    </div>
    <button class="btn btn-dark" onclick="doEditSvc(${idx},'${ctxId}')">Lưu thay đổi</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;

  ['name'].forEach(field => {
    document.getElementById(ctxId+'-'+field)?.addEventListener('input', () => updateEditPreview(ctxId));
  });
  document.getElementById(ctxId+'-emoji-val')?.addEventListener('input', () => updateEditPreview(ctxId));

  document.getElementById('popup-overlay').style.display = 'flex';
  setTimeout(() => { document.getElementById(ctxId+'-name')?.focus(); }, 100);
}

function updateEditPreview(ctxId) {
  const emoji = document.getElementById(ctxId + '-emoji-val')?.value || '💅';
  const name = document.getElementById(ctxId + '-name')?.value.trim() || 'Dịch vụ';
  const prev = document.getElementById(ctxId + '-preview-wrap');
  if (prev) prev.textContent = emoji + ' ' + name;
}

function doEditSvc(idx, ctxId) {
  const s = SVCS_USER[idx]; if (!s) return;
  const name = document.getElementById(ctxId+'-name')?.value.trim();
  const key = document.getElementById(ctxId+'-key')?.value.trim().replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
  const emoji = document.getElementById(ctxId+'-emoji-val')?.value || '💅';
  if (!name) { toast('Nhập tên dịch vụ!'); return; }
  if (!key) { toast('Nhập mã dịch vụ!'); return; }
  const conflict = SVCS_USER.find((x,i) => x.v === key && i !== idx);
  if (conflict) { toast('Mã dịch vụ đã tồn tại!'); return; }
  const oldKey = s.v;
  s.v = key;
  s.l = emoji + ' ' + name;
  // Update existing worker history if key changed
  if (oldKey !== key) {
    W.forEach(w => {
      if (w.service) w.service = w.service.split('|').map(v => v === oldKey ? key : v).join('|');
      if (w.history) w.history.forEach(h => {
        if (h.svc) h.svc = h.svc.split('|').map(v => v === oldKey ? key : v).join('|');
      });
    });
  }
  saveSvcs(); saveState();
  toast('Đã cập nhật: ' + s.l + ' ✓');
  closePopup();
  renderSettingsTab();
}

// ── DELETE SERVICE ──
function confirmDeleteSvc(idx) {
  const s = SVCS_USER[idx]; if (!s) return;
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av" style="background:var(--c-pen-bg);color:var(--c-pen)">!</div>
    <div><div class="popup-name">Xóa dịch vụ</div><div class="popup-meta">${s.l}</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0;font-size:13px;color:var(--t2);line-height:1.8">
      Xóa <strong>${s.l}</strong>?<br>
      <span style="font-size:12px;color:var(--t3)">Lịch sử đã ghi nhận sẽ vẫn hiển thị bằng mã cũ.</span>
    </div>
    <button class="btn btn-ghost" style="color:var(--c-pen);border-color:var(--c-pen-b)" onclick="doDeleteSvc(${idx})">Xác nhận xóa</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function doDeleteSvc(idx) {
  const s = SVCS_USER[idx]; if (!s) return;
  const name = s.l;
  SVCS_USER.splice(idx, 1);
  saveSvcs();
  toast('Đã xóa: ' + name);
  closePopup();
  renderSettingsTab();
}

// ── RESET TO DEFAULTS ──
function confirmResetSvcs() {
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av" style="background:var(--rose-bg);color:var(--rose)">🔄</div>
    <div><div class="popup-name">Khôi phục mặc định</div><div class="popup-meta">Đặt lại danh sách dịch vụ</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0;font-size:13px;color:var(--t2);line-height:1.8">
      Danh sách dịch vụ sẽ về <strong>7 dịch vụ mặc định</strong>.<br>
      <span style="font-size:12px;color:var(--t3)">Các dịch vụ bạn tự thêm sẽ bị xóa.</span>
    </div>
    <button class="btn btn-dark" onclick="doResetSvcs()">Khôi phục mặc định</button>
    <button class="btn btn-ghost" onclick="closePopup()">Hủy</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

function doResetSvcs() {
  SVCS_USER.length = 0;
  DEFAULT_SVCS.forEach(s => SVCS_USER.push({...s}));
  saveSvcs();
  toast('Đã khôi phục 7 dịch vụ mặc định ✅');
  closePopup();
  renderSettingsTab();
}

// ── EMOJI PICKER inside edit row (inline) ──
function openEmojiPicker(idx) { openEditSvc(idx); }

// ── DRAG & DROP reorder services ──
function initSvcDrag() {
  const list = document.getElementById('svc-list');
  if (!list || list._svcdrag) return;
  list._svcdrag = true;
  let dragIdx = null;

  list.addEventListener('dragstart', e => {
    const row = e.target.closest('.svc-row'); if (!row) return;
    dragIdx = parseInt(row.dataset.idx);
    setTimeout(() => { row.style.opacity = '0.35'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    const row = e.target.closest('.svc-row');
    if (!row || parseInt(row.dataset.idx) === dragIdx) return;
    list.querySelectorAll('.svc-row').forEach(r => r.classList.remove('svc-drag-over'));
    row.classList.add('svc-drag-over');
  });

  list.addEventListener('dragleave', e => {
    if (!list.contains(e.relatedTarget))
      list.querySelectorAll('.svc-row').forEach(r => r.classList.remove('svc-drag-over'));
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const row = e.target.closest('.svc-row.svc-drag-over');
    list.querySelectorAll('.svc-row').forEach(r => r.classList.remove('svc-drag-over'));
    if (!row || dragIdx === null) return;
    const tIdx = parseInt(row.dataset.idx);
    if (tIdx === dragIdx) return;
    const [moved] = SVCS_USER.splice(dragIdx, 1);
    SVCS_USER.splice(tIdx, 0, moved);
    saveSvcs();
    renderSettingsTab();
    toast('Đã cập nhật thứ tự dịch vụ ✓');
  });

  list.addEventListener('dragend', () => {
    list.querySelectorAll('.svc-row').forEach(r => { r.style.opacity = ''; r.classList.remove('svc-drag-over'); });
    dragIdx = null;
  });

  // Make rows draggable
  list.querySelectorAll('.svc-row').forEach(row => row.setAttribute('draggable', 'true'));
}

// ── INIT ──
const mc = document.getElementById('main-content');
mc.innerHTML = getShiftHTML();
renderStats();
renderKanban();
// ẩn search-filter bar vì mặc định là kanban
const _sfb = document.querySelector('.search-filter-bar');
if (_sfb) _sfb.style.display = 'none';
const _vb = document.getElementById('btn-view');
if (_vb) _vb.textContent = 'Xem dạng danh sách';

function renderCard(w, rd) {
  const isNext = w===rd[0], isSel = w.id===selId, isChk = multiSel.has(w.id), isPen = w.status==='penalized';
  const hasH = w.history && w.history.length > 0, isExp = exHist.has(w.id), pt = penT[w.id];
  let cc = 'staff-card';
  if (isNext) cc += ' sc-next'; if (w.status==='busy') cc += ' sc-busy';
  if (w.status==='off') cc += ' sc-off'; if (isPen) cc += ' sc-pen'; if (isSel) cc += ' sc-selected';
  const drag = w.status==='ready' && !multiMode ? `draggable="true" data-id="${w.id}"` : '';
  const strip = 'sc-strip strip-' + (isNext?'next':isPen?'pen':w.status);
  const av = 'sc-avatar av-' + (isNext?'next':isPen?'pen':w.status==='busy'?'busy':w.status==='off'?'off':'ready');
  let badge = isPen ? '<span class="sc-badge sb-pen">Bị phạt</span>'
    : isNext ? '<span class="sc-badge sb-next">Tiếp theo</span>'
    : w.status==='ready' ? '<span class="sc-badge sb-ready">Rảnh</span>'
    : w.status==='busy' ? '<span class="sc-badge sb-busy">Đang làm</span>'
    : '<span class="sc-badge sb-off">Nghỉ</span>';
  const rank = w.status==='ready' ? rd.indexOf(w)+1 : null;
  let prog = '';
  if (w.status==='busy' && w.startTime) {
    const pct = Math.min(100,(Date.now()-w.startTime)/MAX_BUSY_MS*100);
    prog = `<div class="sc-progress"><div class="sc-progress-fill" id="pb-${w.id}" style="width:${pct}%"></div></div>`;
  }
  let tags = '';
  if (w.service) tags += `<span class="sc-tag t-svc">${svcL(w.service)}</span>`;
  if (w.status==='busy' && w.startTime) tags += `<span class="sc-tag t-timer">⏱ <span id="ct-${w.id}">${fmtT(Date.now()-w.startTime)}</span></span>`;
  if (isPen && pt) tags += `<span class="sc-tag t-pen" id="cpen-${w.id}">${fmtP(pt.ut)}</span>`;
  if (w.status==='ready' && avgSpeed(w)) tags += `<span class="sc-tag t-speed">⚡ ${speedLabel(w)}</span>`;
  const tagsHtml = tags ? `<div class="sc-tags">${tags}</div>` : '';
  const revHtml = '';
  let qa = '';
  if (multiMode && w.status==='ready') {
    qa = `<button class="qa-btn ${isChk?'qa-primary':''}" onclick="event.stopPropagation();toggleChk(${w.id})">${isChk?'✓ Đã chọn':'Chọn'}</button>`;
  } else if (w.status==='ready') {
    qa = `<button class="qa-btn qa-primary" onclick="event.stopPropagation();assignW(${w.id})">Vào turn</button>
<button class="qa-btn" onclick="event.stopPropagation();openPopup(${w.id})">Lịch sử</button>`;
  } else if (w.status==='busy') {
    qa = `<button class="qa-btn qa-green" onclick="event.stopPropagation();finishW(${w.id},1)">✓ Xong</button>
      <button class="qa-btn" onclick="event.stopPropagation();openDetail(${w.id})">Chi tiết</button>`;
  } else if (isPen) {
    qa = `<button class="qa-btn qa-green" onclick="event.stopPropagation();remPen(${w.id})">Gỡ phạt</button>
      <button class="qa-btn" onclick="event.stopPropagation();openDetail(${w.id})">Chi tiết</button>`;
  } else {
    qa = `<span style="font-size:11px;color:var(--t4)">Chưa check-in</span>`;
  }
  const click = multiMode && w.status==='ready' ? `toggleChk(${w.id})` : `openDetail(${w.id})`;
  let hist = '';
  if (hasH) {
    hist = `<div class="hist-wrap">
      <div class="hist-toggle${isExp?' open':''}" onclick="togHist(event,${w.id})">
        <span>Lịch sử (${w.history.length})</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="hist-body">
        ${w.history.map(h=>`<div class="hr">
          <div><div class="hr-t">${h.ti}</div><div class="hr-d">${h.dur}</div></div>
          <div><div class="hr-s">${h.svc?svcL(h.svc):'—'}</div>${h.note?'<div class="hr-n">'+h.note+'</div>':''}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }
  return `<div>
    <div class="${cc}" ${drag} onclick="${click}">
      <div class="${strip}"></div>
      <div class="sc-body">
        <div class="sc-top">
          <div class="${av}" style="overflow:hidden">${avImg(w)}</div>
          <div class="sc-info">
            <div class="sc-name">${rank?`<span style="font-size:10px;color:var(--t4);font-weight:700;margin-right:4px">#${rank}</span>`:''} ${w.name}</div>
            <div class="sc-turns">${w.turns} turn hôm nay</div>
            ${prog}${tagsHtml}${revHtml}
          </div>
          ${badge}
        </div>
        <div class="sc-actions">${qa}</div>
      </div>
    </div>
    ${hist}
  </div>`;
}

function renderGroupCard(gid, members) {
  const elapsed = members[0].startTime ? Date.now()-members[0].startTime : 0;
  const pct = Math.min(100, elapsed/MAX_BUSY_MS*100);
  const svc = members[0].service;
  const avatars = members.map(m=>`<div class="sc-avatar av-busy" style="width:34px;height:34px;font-size:11px;border:2px solid #fff;margin-right:-8px">${m.ini}</div>`).join('');
  const memberRows = members.map(m => {
    const me = m.startTime ? Date.now()-m.startTime : 0;
    const svcTag = m.service ? `<span class="sc-tag t-svc">${svcL(m.service)}</span>` : '';
    const timerTag = `<span class="sc-tag t-timer">⏱ <span id="ct-${m.id}">${fmtT(me)}</span></span>`;
    return `<div class="gm-row">
      <div class="sc-avatar av-busy" style="width:34px;height:34px;font-size:11px;flex-shrink:0">${m.ini}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700">${m.name}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${svcTag}${timerTag}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
        <button class="qa-btn" style="padding:5px 10px;font-size:11px" onclick="event.stopPropagation();openDetail(${m.id})">Chi tiết</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="group-card">
    <div class="group-card-header">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">👥</span>
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--c-busy)">Nhóm ${members.length} thợ</div>
          <div style="font-size:11px;color:var(--t3);margin-top:1px">Cùng 1 khách · <span id="ct-g-${gid}">${fmtT(elapsed)}</span></div>
        </div>
      </div>
      <span class="sc-badge sb-busy">Đang làm</span>
    </div>
    <div class="sc-progress" style="margin:0 14px 10px"><div class="sc-progress-fill" id="pb-g-${gid}" style="width:${pct}%"></div></div>
    <div class="group-members">${memberRows}</div>
  </div>`;
}