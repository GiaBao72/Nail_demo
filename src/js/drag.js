// ═══════════════════════════════════════
//  drag.js — Drag & drop (list + kanban)
//  Phụ thuộc: state.js
// ═══════════════════════════════════════

let dropPlaceholder = null;

function createPlaceholder() {
  const el = document.createElement('div');
  el.id = 'drag-placeholder';
  el.style.cssText = 'height:6px;border-radius:4px;background:var(--rose);opacity:.7;transition:all .15s;margin:2px 0';
  return el;
}

function removePlaceholder() {
  const el = document.getElementById('drag-placeholder');
  if (el) el.remove();
}

// ── LIST VIEW DRAG ──
function initDrag() {
  const grid = document.getElementById('staff-grid');
  if (!grid || grid._d) return;
  grid._d = true;

  grid.addEventListener('dragstart', e => {
    const c = e.target.closest('.staff-card[draggable]'); if (!c) return;
    dragSrcId = parseInt(c.dataset.id);
    setTimeout(() => { c.style.opacity = '0.35'; c.style.transform = 'scale(.98)'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const c = e.target.closest('.staff-card[draggable]');
    if (!c || parseInt(c.dataset.id) === dragSrcId) return;
    removePlaceholder();
    const ph = createPlaceholder();
    const rect = c.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      c.parentNode.insertBefore(ph, c);
    } else {
      c.parentNode.insertBefore(ph, c.nextSibling);
    }
    document.querySelectorAll('.staff-card[draggable]').forEach(el => {
      el.style.transform = el.dataset.id == dragSrcId ? 'scale(.98)' : '';
    });
  });

  grid.addEventListener('dragleave', e => {
    if (!grid.contains(e.relatedTarget)) removePlaceholder();
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    const ph = document.getElementById('drag-placeholder');
    if (!ph || dragSrcId === null) { removePlaceholder(); return; }
    const phIdx = [...ph.parentNode.children].indexOf(ph);
    let targetCard = null;
    for (const s of ph.parentNode.children) {
      if (s === ph) continue;
      if ([...ph.parentNode.children].indexOf(s) > phIdx) { targetCard = s; break; }
    }
    removePlaceholder();
    const src = W.find(x => x.id===dragSrcId);
    if (!src) return;
    const tId = targetCard ? parseInt(targetCard.dataset.id) : null;
    const tgt = tId ? W.find(x => x.id===tId) : null;
    if (!tgt || tgt.status !== 'ready') { renderGrid(); renderStats(); return; }
    const si = W.indexOf(src), ti = W.indexOf(tgt);
    W.splice(si,1); W.splice(ti,0,src);
    renderGrid(); renderStats(); saveState();
  });

  grid.addEventListener('dragend', () => {
    dragSrcId = null;
    removePlaceholder();
    document.querySelectorAll('.staff-card').forEach(el => { el.style.opacity = ''; el.style.transform = ''; });
  });
}

// ── KANBAN DRAG ──
function initKanbanDrag() {
  const col = document.getElementById('kanban-ready-col');
  if (!col) return;
  let dragId = null;

  col.addEventListener('dragstart', e => {
    const card = e.target.closest('.kc[draggable]'); if (!card) return;
    dragId = parseInt(card.dataset.id);
    setTimeout(() => { card.style.opacity = '0.35'; card.style.transform = 'scale(.97)'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  col.addEventListener('dragend', () => {
    col.querySelectorAll('.kc').forEach(c => { c.style.opacity = ''; c.style.transform = ''; c.classList.remove('kc-drag-over'); });
    removePlaceholder();
    dragId = null;
  });

  col.addEventListener('dragover', e => {
    e.preventDefault();
    const card = e.target.closest('.kc[draggable]');
    if (!card || parseInt(card.dataset.id) === dragId) return;
    removePlaceholder();
    col.querySelectorAll('.kc').forEach(c => c.classList.remove('kc-drag-over'));
    const ph = createPlaceholder();
    const rect = card.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      card.parentNode.insertBefore(ph, card);
    } else {
      card.parentNode.insertBefore(ph, card.nextSibling);
    }
    card.classList.add('kc-drag-over');
  });

  col.addEventListener('drop', e => {
    e.preventDefault();
    const ph = document.getElementById('drag-placeholder');
    if (!ph || !dragId) { removePlaceholder(); return; }
    const after = [...ph.parentNode.children].find((el, i, arr) => {
      return el !== ph && arr.indexOf(el) > arr.indexOf(ph) && el.classList.contains('kc');
    });
    removePlaceholder();
    const src = W.find(x => x.id === dragId);
    const tId = after ? parseInt(after.dataset.id) : null;
    const tgt = tId ? W.find(x => x.id === tId) : null;
    if (!src || !tgt || src.status !== 'ready' || tgt.status !== 'ready') return;
    const si = W.indexOf(src), ti = W.indexOf(tgt);
    W.splice(si, 1); W.splice(ti, 0, src);
    renderKanban(); renderStats(); saveState();
    initKanbanDrag();
  });
}
