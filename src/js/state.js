// ═══════════════════════════════════════
//  state.js — Data model & persistence
//  Phụ thuộc: config.js
// ═══════════════════════════════════════

// ── AVATAR ──
function avImg(w, size) {
  const s = size || 40;
  if (w && w.photo) return '<img src="'+w.photo+'" style="width:'+s+'px;height:'+s+'px;border-radius:inherit;object-fit:cover;display:block">';
  return w ? w.ini : '+';
}

// ── SERVICES ──
let SVCS_USER = [];
try { SVCS_USER = JSON.parse(localStorage.getItem('nt_svcs') || 'null') || DEFAULT_SVCS.map(s=>({...s})); }
catch(e) { SVCS_USER = DEFAULT_SVCS.map(s=>({...s})); }

function getSVCS() { return [{ v: '', l: '— Chọn dịch vụ —' }, ...SVCS_USER]; }
function saveSvcs() { try { localStorage.setItem('nt_svcs', JSON.stringify(SVCS_USER)); } catch(e) {} }

// ── WORKER MODEL ──
function mkW(id, name, ini) {
  return {
    id, name, ini, turns: 0, status: 'off', note: '', startTime: null,
    service: '', revenue: 0, tip: 0, totalRevenue: 0, totalTip: 0, history: [], groupId: null,
    checkinTime: null, checkoutTime: null,
    avgTurnMs: 0, lastFinishTime: null,
    wageBase: 0, wagePercent: 0,   // lương cơ bản (đ/ca) + % doanh thu
    workLogs: [],                   // [{date, checkin, checkout, hours}]
    telegramId: '',                 // Telegram chat ID cá nhân của thợ
    photo: '',                      // base64 ảnh đại diện
  };
}

// ── APP STATE ──
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

// ── PERSISTENCE ──
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
  } catch(e) {}
}
loadState();
