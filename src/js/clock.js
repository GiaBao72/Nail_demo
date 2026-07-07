// ═══════════════════════════════════════
//  clock.js — Đồng hồ & cập nhật timer
//  Phụ thuộc: state.js, utils.js, render.js
// ═══════════════════════════════════════

function tick() {
  const n = new Date();
  const el = document.getElementById('clock');
  if (el) el.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  const ed = document.getElementById('clock-day');
  if (ed) {
    const days = ['CN','T2','T3','T4','T5','T6','T7'];
    ed.textContent = days[n.getDay()] + ' ' + String(n.getDate()).padStart(2,'0') + '/' + String(n.getMonth()+1).padStart(2,'0');
  }
  const st = document.getElementById('shift-tag');
  if (st) st.textContent = n.getHours() < 12 ? 'Ca sáng' : n.getHours() < 17 ? 'Ca chiều' : 'Ca tối';

  // cập nhật timer từng thợ đang làm
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

  // overtime highlight (> MAX_BUSY_MS)
  W.filter(w => w.status === 'busy' && w.startTime).forEach(w => {
    const card = document.querySelector(`.staff-card[data-id="${w.id}"],.kc[data-id="${w.id}"]`);
    if (!card) return;
    card.classList.toggle('overtime', Date.now() - w.startTime > MAX_BUSY_MS);
  });

  // penalty countdown & auto-release
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

tick();
setInterval(tick, 1000);
