// ═══════════════════════════════════════
//  main.js — App initialization
//  Phụ thuộc: tabs.js, render.js, kanban.js
// ═══════════════════════════════════════

(function init() {
  const mc = document.getElementById('main-content');
  if (!mc) return;

  // Render màn hình ca (mặc định = kanban)
  mc.innerHTML = getShiftHTML();
  renderStats();
  renderKanban();

  // Ẩn search-filter bar (không dùng trong kanban)
  const sfb = document.querySelector('.search-filter-bar');
  if (sfb) sfb.style.display = 'none';

  // Label nút view
  const vb = document.getElementById('btn-view');
  if (vb) vb.textContent = 'Xem dạng danh sách';
})();
