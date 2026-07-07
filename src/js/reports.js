// ═══════════════════════════════════════
//  reports.js — Báo cáo & Reset ca
//  Phụ thuộc: state.js, utils.js
// ═══════════════════════════════════════

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
      <button class="btn btn-ghost btn-sm" onclick="exportCSV()" style="width:auto;padding:8px 14px">
        ⬇️ Xuất CSV
      </button>
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
          <div class="sc-avatar av-ready" style="width:28px;height:28px;overflow:hidden;font-size:10px">${avImg(w,28)}</div>
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
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
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
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'nail-turn-'+date+'.csv'; a.click();
}
