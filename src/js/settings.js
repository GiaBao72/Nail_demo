// ═══════════════════════════════════════
//  settings.js — Settings tab (Staff + Services)
//  Phụ thuộc: state.js, utils.js, popups.js
// ═══════════════════════════════════════

let settingsPane = 'staff'; // 'staff' | 'services'

function getSettingsHTML() {
  return `<div class="settings-content" id="settings-content"></div>`;
}

function switchSettingsPane(pane) {
  settingsPane = pane;
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
      <div class="sc-avatar ${isIn?'av-ready':'av-off'}" style="width:30px;height:30px;overflow:hidden;font-size:9px;flex-shrink:0">${avImg(w,30)}</div>
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

  ['add-emoji-val','add-svc-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateAddPreview);
  });
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
  s.v = key; s.l = emoji + ' ' + name;
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

// ── RESET SERVICES ──
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

function openEmojiPicker(idx) { openEditSvc(idx); }

// ── DRAG SERVICE REORDER ──
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

  list.querySelectorAll('.svc-row').forEach(row => row.setAttribute('draggable', 'true'));
}
