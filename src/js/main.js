// ═══════════════════════════════════════
//  main.js — App initialization
//  Phụ thuộc: tabs.js, render.js, kanban.js
// ═══════════════════════════════════════

(function init() {
  const mc = document.getElementById('main-content');
  if (!mc) return;

  mc.innerHTML = getShiftHTML();
  renderStats();
  renderKanban();

  const sfb = document.querySelector('.search-filter-bar');
  if (sfb) sfb.style.display = 'none';

  const vb = document.getElementById('btn-view');
  if (vb) vb.textContent = 'Xem dạng danh sách';

  // Nhắc backup nếu chưa backup hôm nay và có dữ liệu
  setTimeout(function() {
    if (!totalTurns && !W.some(function(w) { return w.turns > 0; })) return;
    var lastBackup = localStorage.getItem('nt_last_backup');
    var today = new Date().toISOString().slice(0, 10);
    var lastDate = lastBackup
      ? new Date(parseInt(lastBackup)).toISOString().slice(0, 10)
      : null;
    if (lastDate !== today) {
      toast('💾 Nhớ backup dữ liệu hôm nay! (Hệ thống → Backup)');
    }
  }, 4000);
})();
