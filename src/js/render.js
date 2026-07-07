// ═══════════════════════════════════════
//  render.js — Render stats, grid, cards
//  Phụ thuộc: state.js, utils.js, drag.js, kanban.js
// ═══════════════════════════════════════

// ── STATS BAR ──
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

// ── GRID VIEW ──
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

// ── SEARCH & FILTER ──
function onSearch(val) { searchQ = val; renderGrid(); }

function setFilter(f) {
  filterStatus = f;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.className = 'filter-btn' + (b.dataset.f === f ? ' active' : '');
  });
  renderGrid(); renderStats();
}

// ── MAIN RENDER DISPATCHER ──
function render() {
  if (currentTab !== 'shift') return;
  renderStats();
  if (shiftView === 2) renderKanban(); else renderGrid();
  const sfb = document.querySelector('.search-filter-bar');
  if (sfb) sfb.style.display = shiftView === 2 ? 'none' : '';
  const mb = document.getElementById('multi-bar');
  if (mb) mb.style.display = multiMode ? 'flex' : 'none';
  const mc = document.getElementById('multi-cnt'); if (mc) mc.textContent = multiSel.size;
  const bm = document.getElementById('btn-multi');
  if (bm) { bm.style.background = multiMode ? '#1D4ED8' : ''; bm.style.color = multiMode ? '#fff' : '#3B82F6'; }
  const vb = document.getElementById('btn-view');
  if (vb) vb.textContent = shiftView === 1 ? 'Xem dạng cột' : 'Xem dạng danh sách';
}

function toggleView() {
  shiftView = shiftView === 1 ? 2 : 1;
  const vb = document.getElementById('btn-view');
  if (vb) vb.textContent = shiftView === 1 ? 'Xem dạng cột' : 'Xem dạng danh sách';
  const sfb = document.querySelector('.search-filter-bar');
  if (sfb) sfb.style.display = shiftView === 2 ? 'none' : '';
  if (shiftView === 2) renderKanban(); else renderGrid();
}

// ── LIST CARD ──
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
  if (w.status==='busy' && w.startTime) tags += `<span class="sc-tag t-timer"><i class="ph-bold ph-timer" style="font-size:11px;line-height:1;vertical-align:-1px"></i> <span id="ct-${w.id}">${fmtT(Date.now()-w.startTime)}</span></span>`;
  if (isPen && pt) tags += `<span class="sc-tag t-pen" id="cpen-${w.id}">${fmtP(pt.ut)}</span>`;
  if (w.status==='ready' && avgSpeed(w)) tags += `<span class="sc-tag t-speed"><i class="ph-fill ph-lightning" style="font-size:11px;line-height:1;vertical-align:-1px"></i> ${speedLabel(w)}</span>`;
  const tagsHtml = tags ? `<div class="sc-tags">${tags}</div>` : '';
  let qa = '';
  if (multiMode && w.status==='ready') {
    qa = `<button class="qa-btn ${isChk?'qa-primary':''}" onclick="event.stopPropagation();toggleChk(${w.id})">${isChk?'<i class="ph-bold ph-check" style="font-size:11px;line-height:1;vertical-align:-1px"></i> Đã chọn':'Chọn'}</button>`;
  } else if (w.status==='ready') {
    qa = `<button class="qa-btn qa-primary" onclick="event.stopPropagation();assignW(${w.id})">Vào turn</button>
<button class="qa-btn" onclick="event.stopPropagation();openPopup(${w.id})">Lịch sử</button>`;
  } else if (w.status==='busy') {
    qa = `<button class="qa-btn qa-green" onclick="event.stopPropagation();finishW(${w.id},1)"><i class="ph-bold ph-check" style="font-size:11px;line-height:1;vertical-align:-1px"></i> Xong</button>
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
        <i class="ph-bold ph-caret-down" style="font-size:13px;line-height:1"></i>
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
            ${prog}${tagsHtml}
          </div>
          ${badge}
        </div>
        <div class="sc-actions">${qa}</div>
      </div>
    </div>
    ${hist}
  </div>`;
}

// ── GROUP CARD (list view) ──
function renderGroupCard(gid, members) {
  const elapsed = members[0].startTime ? Date.now()-members[0].startTime : 0;
  const pct = Math.min(100, elapsed/MAX_BUSY_MS*100);
  const avatars = members.map(m=>`<div class="sc-avatar av-busy" style="width:34px;height:34px;font-size:11px;border:2px solid #fff;margin-right:-8px;overflow:hidden">${avImg(m,34)}</div>`).join('');
  const memberRows = members.map(m => {
    const me = m.startTime ? Date.now()-m.startTime : 0;
    const svcTag = m.service ? `<span class="sc-tag t-svc">${svcL(m.service)}</span>` : '';
    const timerTag = `<span class="sc-tag t-timer"><i class="ph-bold ph-timer" style="font-size:11px;line-height:1;vertical-align:-1px"></i> <span id="ct-${m.id}">${fmtT(me)}</span></span>`;
    return `<div class="gm-row">
      <div class="sc-avatar av-busy" style="width:34px;height:34px;font-size:11px;flex-shrink:0;overflow:hidden">${avImg(m,34)}</div>
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
