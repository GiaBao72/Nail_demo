// ═══════════════════════════════════════
//  popups.js — Popup dialogs & staff management
//  Phụ thuộc: state.js, utils.js, render.js
// ═══════════════════════════════════════

// ── HISTORY POPUP ──
function openPopup(id) {
  selId = id;
  const w = W.find(x=>x.id===id); if (!w) return;
  const avCls = w.status==='busy'?'av-busy':w.status==='penalized'?'av-pen':w.status==='off'?'av-off':'av-ready';
  document.getElementById('popup-head').innerHTML = `<div class="popup-av ${avCls}" style="overflow:hidden">${avImg(w,44)}</div>
    <div><div class="popup-name">${w.name}</div><div class="popup-meta">${w.turns} turn</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
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
    <button class="btn btn-ghost" onclick="closePopup()">Đóng</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

// ── DETAIL / ACTIONS POPUP ──
function openDetail(id) {
  selId = id;
  const w = W.find(x=>x.id===id); if (!w) return;
  const avCls = w.status==='busy'?'av-busy':w.status==='penalized'?'av-pen':w.status==='off'?'av-off':'av-ready';
  const stLbl = w.status==='ready'?'Rảnh':w.status==='busy'?'Đang làm':w.status==='penalized'?'Bị phạt':'Nghỉ';
  document.getElementById('popup-head').innerHTML = `<div class="popup-av ${avCls}" style="overflow:hidden">${avImg(w,44)}</div>
    <div><div class="popup-name">${w.name}</div><div class="popup-meta">${w.turns} turn · ${stLbl}</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
  let body = '';
  if (w.status === 'busy') {
    const elapsed = w.startTime ? Date.now()-w.startTime : 0;
    const startStr = w.startTime ? new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';
    body = `<div class="popup-timer"><div class="pt-val" id="pt-${w.id}">${fmtT(elapsed)}</div><div class="pt-sub">Bắt đầu lúc ${startStr}</div></div>
      <div><div class="f-label" style="margin-bottom:6px">Dịch vụ</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${svcCheckboxes(w.service,'svc-'+w.id)}</div></div>
      <div><div class="f-label">Ghi chú</div><textarea class="f-textarea" id="nt-${w.id}" rows="2" placeholder="Khách VIP, hẹn lại...">${w.note||''}</textarea></div>
      <button class="btn btn-dark" onclick="saveInfo(${w.id})" style="margin-top:2px">
        <i class="ph-fill ph-floppy-disk" style="font-size:15px;line-height:1"></i>
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
        <i class="ph-bold ph-swap" style="font-size:15px;line-height:1"></i>
        Chuyển ca cho thợ khác
      </button>`;
  } else if (w.status === 'penalized') {
    const pt = penT[w.id];
    body = `<div class="pen-timer-display"><div class="ptd-val" id="popen-${w.id}">${pt?fmtP(pt.ut):'--:--'}</div><div class="ptd-sub">Còn lại</div></div>
      <button class="btn btn-green" onclick="remPen(${w.id})"><i class="ph-fill ph-check-circle" style="font-size:14px;line-height:1"></i> Gỡ phạt sớm</button>`;
  } else if (w.status === 'ready') {
    body = `<button class="btn btn-rose" onclick="assignW(${w.id})">
        <i class="ph-fill ph-user" style="font-size:15px;line-height:1"></i>
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

// ── STAFF DETAIL (readonly) ──
function openStaffDetail(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const avCls = w.status==='busy'?'av-busy':w.status==='off'?'av-off':w.status==='penalized'?'av-pen':'av-ready';
  const histRows = w.history.length ? w.history.map(h=>`<div class="hr">
    <div><div class="hr-t">${h.ti}</div><div class="hr-d">${h.dur}</div></div>
    <div><div class="hr-s">${h.svc?svcL(h.svc):'—'}</div>${h.note?'<div class="hr-n">'+h.note+'</div>':''}</div>
  </div>`).join('') : '<div style="text-align:center;padding:20px;color:var(--t4)">Chưa có lịch sử</div>';
  document.getElementById('popup-head').innerHTML = `<div class="popup-av ${avCls}" style="overflow:hidden">${avImg(w,44)}</div>
    <div><div class="popup-name">${w.name}</div><div class="popup-meta">${w.turns} turn</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr;gap:8px">
      <div class="mini-stat"><div class="ms-val">${w.turns}</div><div class="ms-lbl">Turn hôm nay</div></div>
    </div>
    <div><div class="f-label" style="margin-bottom:8px">Lịch sử ca hôm nay</div>
    <div style="max-height:260px;overflow-y:auto">${histRows}</div></div>
    <button class="btn btn-ghost" onclick="closePopup()">Đóng</button>`;
  document.getElementById('popup-overlay').style.display = 'flex';
}

// ── ADD STAFF ──
function openAddStaff() {
  document.getElementById('popup-head').innerHTML = `<div class="popup-av av-ready">+</div>
    <div><div class="popup-name">Thêm nhân viên</div><div class="popup-meta">Nhập thông tin thợ mới</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
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
  saveState();
  toast('Đã thêm ' + nm + ' ✨');
  closePopup();
  if (currentTab==='settings') renderSettingsPane();
}

// ── EDIT STAFF ──
function openEditStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  document.getElementById('popup-head').innerHTML = `<div class="popup-av av-ready" style="overflow:hidden">${avImg(w,46)}</div>
    <div><div class="popup-name">Sửa thông tin</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
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

// ── CHECK-IN / CHECK-OUT ──
function checkinStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const now = new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-ready" style="overflow:hidden">${avImg(w,44)}</div>
    <div><div class="popup-name">Check-in</div><div class="popup-meta">${w.name} · ${now}</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
  document.getElementById('popup-body').innerHTML = `
    <div style="text-align:center;padding:8px 0 4px;font-size:13px;color:var(--t2);line-height:1.8">
      Xác nhận <strong>${w.name}</strong> bắt đầu ca làm việc lúc <strong>${now}</strong>?
    </div>
    <button class="btn btn-green" onclick="doCheckin(${id})">
      <i class="ph-fill ph-check-circle" style="font-size:15px;line-height:1"></i>
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
    <div class="popup-av av-off" style="overflow:hidden">${avImg(w,44)}</div>
    <div><div class="popup-name">Check-out</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
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
      <i class="ph-bold ph-sign-out" style="font-size:15px;line-height:1"></i>
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

// ── REMOVE STAFF ──
function confirmRemoveStaff(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  document.getElementById('popup-head').innerHTML = `<div class="popup-av" style="background:var(--c-pen-bg);color:var(--c-pen)">!</div>
    <div><div class="popup-name">Xóa nhân viên</div><div class="popup-meta">${w.name}</div></div>
    <button class="popup-close" onclick="closePopup()" title="Đóng"><i class="ph-bold ph-x" style="font-size:16px;line-height:1"></i></button>`;
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
