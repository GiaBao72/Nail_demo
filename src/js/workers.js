// ═══════════════════════════════════════
//  workers.js — Hành động thợ
//  Phụ thuộc: state.js, utils.js, config.js, render.js
// ═══════════════════════════════════════

function togHist(e, id) { e.stopPropagation(); exHist.has(id)?exHist.delete(id):exHist.add(id); renderGrid(); }
function toggleChk(id) { multiSel.has(id)?multiSel.delete(id):multiSel.add(id); render(); }

function saveInfo(id) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const nt=document.getElementById('nt-'+id);
  w.service = getCheckedSvc('svc-'+id);
  if(nt) w.note=nt.value.trim();
  toast('Đã lưu thông tin ' + w.name + ' ✓'); renderGrid();
}

// ── ASSIGN TURN ──
function assignNext() {
  const rd = readyW(); if (!rd.length) { toast('Không có thợ rảnh!'); return; }
  assignW(rd[0].id);
}

function assignW(id) {
  const w = W.find(x=>x.id===id); if (!w||w.status!=='ready') return;
  const rd = readyW();
  document.getElementById('popup-head').innerHTML = `<div class="popup-av av-ready" style="overflow:hidden">${avImg(w,44)}</div>
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
  const nt=document.getElementById('asn-note-'+id);
  w.status='busy'; w.turns++; totalTurns++; w.startTime=Date.now();
  w.service = getCheckedSvc('asn-svc-'+id);
  w.note = nt ? nt.value.trim() : '';
  w.revenue=0; w.tip=0;
  toast('Vào turn cho ' + w.name + ' 💅'); closePopup();
  const _tgMsg = w.name + (w.service ? '\n' + svcL(w.service) : '');
  sendTelegramMsg(_tgMsg);
  if (w.telegramId) sendTelegramMsgTo(w.telegramId, _tgMsg);
}

// ── FINISH TURN ──
function finishW(id, tw) {
  const w = W.find(x=>x.id===id); if (!w) return;
  const ne=document.getElementById('nt-'+id);
  if (ne !== null) {
    w.note = ne.value.trim();
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
    const elapsed = w.startTime ? Date.now()-w.startTime : 0;
    const startStr = w.startTime ? new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';
    const twLabel = tw===1 ? '1 turn' : tw===0.5 ? '½ turn' : '0 turn';
    const twColor = tw===0 ? 'var(--t3)' : 'var(--c-ready)';
    document.getElementById('popup-head').innerHTML = `<div class="popup-av av-busy" style="overflow:hidden">${avImg(w,44)}</div>
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
  const svcVal = getCheckedSvc('svc-'+w.id) || getCheckedSvc('rv-svc-'+w.id);
  if (svcVal) w.service = svcVal;
  w.turns=Math.round((w.turns-1+tw)*10)/10; totalTurns=Math.round((totalTurns-1+tw)*10)/10;
  const dur=w.startTime?Date.now()-w.startTime:0, ti=w.startTime?new Date(w.startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'-';
  if (!w.history) w.history=[];
  w.history.push({ti, dur:fmtT(dur), svc:w.service, note:w.note, tw});
  exHist.add(w.id);
  W=W.filter(x=>x.id!==w.id);
  w.status='ready'; w.note=''; w.startTime=null; w.service=''; w.revenue=0; w.tip=0; w.groupId=null;
  W.push(w); selId=null;
  toast(w.name + ' xong việc — về cuối hàng ✓'); closePopup();
}

// ── STATUS & TRANSFER ──
function setSt(id, s) {
  const w=W.find(x=>x.id===id); if (!w) return;
  W=W.filter(x=>x.id!==id); w.status=s; W.push(w); selId=null;
  toast(w.name+': '+(s==='off'?'Cho nghỉ 😴':'Vào làm lại ✅')); closePopup();
}

function openTransferTurn(fromId) {
  const from = W.find(x=>x.id===fromId); if (!from) return;
  const available = W.filter(x=>x.status==='ready' && x.checkinTime);
  if (!available.length) { toast('Không có thợ rảnh để chuyển ca!'); return; }
  document.getElementById('popup-head').innerHTML = `
    <div class="popup-av av-busy" style="overflow:hidden">${avImg(from,44)}</div>
    <div><div class="popup-name">Chuyển ca</div><div class="popup-meta">Từ ${from.name} → chọn thợ nhận</div></div>
    <button class="popup-close" onclick="closePopup()">✕</button>`;
  const opts = available.map(w => `
    <button onclick="confirmTransfer(${fromId},${w.id})" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:10px;border:1.5px solid var(--br2);background:var(--surface-2);cursor:pointer;font-family:inherit;transition:all .15s;text-align:left" onmouseover="this.style.borderColor='var(--c-ready)';this.style.background='var(--c-ready-bg)'" onmouseout="this.style.borderColor='var(--br2)';this.style.background='var(--surface-2)'">
      <div class="sc-avatar av-ready" style="width:36px;height:36px;overflow:hidden;font-size:11px;flex-shrink:0">${avImg(w,36)}</div>
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
  to.status    = 'busy';
  to.startTime = from.startTime || Date.now();
  to.service   = from.service;
  to.note      = from.note;
  to.groupId   = from.groupId;
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

// ── MULTI-SELECT ──
function toggleMulti() { multiMode=!multiMode; multiSel.clear(); selId=null; render(); }
function cancelMulti() { multiMode=false; multiSel.clear(); render(); }

function assignMulti() {
  if (multiSel.size < 2) { toast('Chọn ít nhất 2 thợ!'); return; }
  const members = [...multiSel].map(id => W.find(x=>x.id===id)).filter(w=>w&&w.status==='ready');
  if (members.length < 2) { toast('Cần ít nhất 2 thợ rảnh!'); return; }
  const memberRows = members.map(w => `
    <div style="border:1px solid var(--br);border-radius:10px;padding:10px;background:var(--surface-2)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div class="sc-avatar av-ready" style="width:30px;height:30px;overflow:hidden;font-size:10px;flex-shrink:0">${avImg(w,30)}</div>
        <div style="font-size:13px;font-weight:700">${w.name}</div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px">Dịch vụ</div>
      ${svcCheckboxes('', 'mgrp-'+w.id)}
    </div>`).join('');
  document.getElementById('popup-head').innerHTML = `
    <div style="display:flex;gap:4px">${members.map(m=>`<div class="sc-avatar av-ready" style="width:32px;height:32px;overflow:hidden;font-size:10px">${avImg(m,32)}</div>`).join('')}</div>
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
  members.forEach(m => {
    const _mMsg = m.name + (m.service ? '\n' + svcL(m.service) : '');
    sendTelegramMsg(_mMsg);
    if (m.telegramId) sendTelegramMsgTo(m.telegramId, _mMsg);
  });
}

// ── PENALTY ──
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

// ── GROUP POPUP ──
function openGroupPopup(gid) {
  const members = W.filter(w=>w.groupId===gid&&w.status==='busy'); if (!members.length) return;
  const elapsed = members[0].startTime ? Date.now()-members[0].startTime : 0;
  const startStr = members[0].startTime ? new Date(members[0].startTime).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--';
  const memberRows = members.map(m => `
    <div style="border:1px solid var(--br);border-radius:10px;padding:10px;background:var(--surface-2)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div class="sc-avatar av-busy" style="width:28px;height:28px;overflow:hidden;font-size:9px;flex-shrink:0">${avImg(m,28)}</div>
        <div style="font-size:13px;font-weight:700">${m.name}</div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px">Dịch vụ</div>
      ${svcCheckboxes(m.service, 'gsvc-'+gid+'-'+m.id)}
      <div style="margin-top:6px"><div class="f-label" style="font-size:10px">Ghi chú</div>
        <textarea class="f-textarea" id="gnote-${gid}-${m.id}" rows="1" placeholder="Ghi chú riêng..." style="font-size:11px;padding:5px 8px;margin-top:3px">${m.note||''}</textarea>
      </div>
    </div>`).join('');
  document.getElementById('popup-head').innerHTML = `
    <div style="display:flex;gap:4px">${members.map(m=>`<div class="sc-avatar av-busy" style="width:32px;height:32px;overflow:hidden;font-size:10px">${avImg(m,32)}</div>`).join('')}</div>
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

function finishGroup(gid, tw) {
  const members = W.filter(w=>w.groupId===gid&&w.status==='busy');
  members.forEach(w => {
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
  totalTurns=Math.round((totalTurns-members.length+members.length*tw)*10)/10;
  members.forEach(w => {
    W=W.filter(x=>x.id!==w.id);
    w.status='ready'; w.note=''; w.startTime=null; w.service=''; w.revenue=0; w.tip=0; w.groupId=null;
    W.push(w);
  });
  toast('Nhóm '+members.length+' thợ xong việc ✓'); closePopup();
}
