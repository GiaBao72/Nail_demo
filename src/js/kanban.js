// ═══════════════════════════════════════
//  kanban.js — Kanban view
//  Phụ thuộc: state.js, utils.js, drag.js
// ═══════════════════════════════════════

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
    if (w.status==='busy') sub = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px"><span class="sc-tag t-timer" style="font-size:9px;padding:1px 6px"><i class="ph-bold ph-timer" style="font-size:9px;line-height:1;vertical-align:-1px"></i> <span id="kct-${w.id}">${fmtT(elapsed)}</span></span>${w.service?`<span class="sc-tag t-svc" style="font-size:9px;padding:1px 6px">${svcL(w.service)}</span>`:''}</div>`;
    if (isPen && pt) sub = `<div style="margin-top:6px"><span class="sc-tag t-pen" style="font-size:9px;padding:1px 6px" id="kcpen-${w.id}">${fmtP(pt.ut)}</span></div>`;
    let actionBtn = '';
    if (multiMode && isReady) {
      actionBtn = `<button onclick="event.stopPropagation();toggleChk(${w.id})" style="padding:0 8px;height:26px;border-radius:6px;border:none;background:${isChk?'#1D4ED8':'var(--surface-3)'};color:${isChk?'#fff':'var(--t2)'};font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1;font-family:inherit;white-space:nowrap">${isChk?'<i class="ph-bold ph-check" style="font-size:11px;line-height:1;vertical-align:-1px"></i> Đã chọn':'Chọn'}</button>`;
    } else if (w.status==='busy') {
      actionBtn = `<button onclick="event.stopPropagation();openPopup(${w.id})" style="padding:0 8px;height:26px;border-radius:6px;border:1px solid var(--br2);background:var(--surface-2);color:var(--t2);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Lịch sử</button>`;
    } else if (isReady) {
      actionBtn = `<button onclick="event.stopPropagation();assignW(${w.id})" style="padding:0 12px;height:30px;border-radius:8px;border:none;background:var(--rose);color:#fff;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;font-family:inherit;white-space:nowrap;box-shadow:0 2px 6px rgba(200,73,107,.35)">Vào turn</button>`;
    } else if (w.status==='off') {
      actionBtn = '';
    } else if (isPen) {
      actionBtn = `<button onclick="event.stopPropagation();remPen(${w.id})" style="width:26px;height:26px;border-radius:6px;border:none;background:var(--c-ready);color:#fff;font-size:11px;cursor:pointer;flex-shrink:0" title="Gỡ phạt"><i class="ph-bold ph-check" style="font-size:13px;line-height:1"></i></button>`;
    }
    const clickFn = (multiMode && isReady) ? `toggleChk(${w.id})` : `openDetail(${w.id})`;
    const statusCls = isPen ? 'kc-pen' : w.status==='busy' ? 'kc-busy' : w.status==='off' ? 'kc-off' : 'kc-ready';
    const chkStyle = isChk ? 'background:#EFF6FF;border:2px solid #1D4ED8;' : '';
    const draggable = (!multiMode && isReady) ? 'draggable="true"' : '';
    return `<div class="kc ${statusCls}" ${draggable} data-id="${w.id}" style="${chkStyle}cursor:${(!multiMode && isReady) ? 'grab' : 'pointer'}" onclick="${clickFn}">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="sc-avatar ${avCls}" style="width:44px;height:44px;overflow:hidden;font-size:13px;flex-shrink:0;border-radius:12px">${avImg(w,44)}</div>
        <div style="flex:1;min-width:0;overflow:hidden">
          <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em">${w.name}</div>
          <div style="font-size:11px;color:var(--t4);margin-top:1px;font-weight:500">${w.turns} lượt</div>
        </div>
        ${actionBtn}
      </div>
      ${sub}
    </div>`;
  }

  // group busy workers by groupId
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
      const timerTag = `<span class="sc-tag t-timer" style="font-size:9px;padding:1px 6px"><i class="ph-bold ph-timer" style="font-size:9px;line-height:1;vertical-align:-1px"></i> <span id="kct-${m.id}">${fmtT(me)}</span></span>`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--c-busy-b)" onclick="event.stopPropagation()">
        <div class="sc-avatar av-busy" style="width:28px;height:28px;overflow:hidden;font-size:9px;flex-shrink:0">${avImg(m,28)}</div>
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
            <div style="font-size:10px;color:var(--t3);margin-top:1px"><i class="ph-bold ph-timer" style="font-size:10px;line-height:1;vertical-align:-1px"></i> <span id="ct-g-${gid}">${fmtT(elapsed)}</span></div>
          </div>
        </div>
        <span class="sc-badge sb-busy" style="font-size:9px">Đang làm</span>
      </div>
      <div style="height:2px;background:var(--surface-3);margin:0 10px"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--c-busy),#F97316);border-radius:99px" id="pb-g-${gid}"></div></div>
      <div style="padding:0 10px 8px" onclick="event.stopPropagation()">${memberRows}</div>
    </div>`;
  }

  function renderBusyCol() {
    if (!busySolo.length && !Object.keys(kGroups).length) return '<div style="text-align:center;padding:28px 16px;color:var(--t4)"><div style="font-size:24px;margin-bottom:6px;opacity:.5">○</div><div style="font-size:11px;font-weight:500">Không có ai</div></div>';
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
    <div ${col.key==='ready' ? 'id="kanban-ready-col"' : ''} style="background:var(--surface);border-radius:14px;border:1px solid var(--br2);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.05);${isMobile ? 'min-width:80vw' : 'min-width:0'}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px;background:${col.bg};border-bottom:1px solid rgba(0,0,0,.07)">
        <div style="display:flex;align-items:center;gap:7px">
          <span style="width:8px;height:8px;border-radius:50%;background:${col.color};flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,.8),0 0 8px ${col.color}40"></span>
          <span style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${col.color}">${col.label}</span>
        </div>
        <span style="font-size:13px;font-weight:800;min-width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(255,255,255,.7);color:${col.color};border:1px solid rgba(0,0,0,.08)">${col.count}</span>
      </div>
      <div style="padding:8px;display:flex;flex-direction:column;gap:6px;min-height:80px">
        ${col.key === 'busy' ? renderBusyCol() : (col.items.length ? col.items.map(w => miniCard(w)).join('') : '<div style="text-align:center;padding:28px 16px;color:var(--t4)"><div style="font-size:24px;margin-bottom:6px;opacity:.5">○</div><div style="font-size:11px;font-weight:500">Không có ai</div></div>')}
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
