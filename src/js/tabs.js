// ═══════════════════════════════════════
//  tabs.js — Tab routing & HTML templates
//  Phụ thuộc: render.js, reports.js, settings.js
// ═══════════════════════════════════════

function setTab(tab) {
  currentTab = tab;
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
<i class="ph-fill ph-user-plus" style="font-size:16px;line-height:1"></i>
            Vào turn
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-multi" onclick="toggleMulti()" style="width:auto;padding:9px 14px;color:#3B82F6;border-color:rgba(59,130,246,.25)">
<i class="ph-bold ph-squares-four" style="font-size:15px;line-height:1"></i>
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
<i class="ph-bold ph-magnifying-glass" style="font-size:15px;color:var(--t4)"></i>
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
