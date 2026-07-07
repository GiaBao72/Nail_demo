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
