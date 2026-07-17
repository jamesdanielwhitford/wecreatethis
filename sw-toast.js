// Shared update toast for all apps.
//
// The service workers on this site serve from cache instantly and revalidate
// in the background (stale-while-revalidate). When a background fetch finds
// a newer version of a shell asset, the SW posts {type: 'sw-updated'} to its
// clients and this script shows a small "Updated" pill; tapping Refresh
// reloads the page onto the new version. Reload is always user-initiated.
(() => {
  if (!('serviceWorker' in navigator)) return;
  let shown = false;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'sw-updated' || shown) return;
    shown = true;

    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
      'display:flex', 'align-items:center', 'gap:12px',
      'background:#222', 'color:#fff', 'padding:10px 14px 10px 18px',
      'border-radius:999px', 'font:14px/1.2 system-ui,sans-serif',
      'box-shadow:0 4px 16px rgba(0,0,0,0.35)', 'z-index:2147483647',
      'opacity:0', 'transition:opacity 0.25s ease'
    ].join(';');

    const label = document.createElement('span');
    label.textContent = 'New version available';

    const refresh = document.createElement('button');
    refresh.textContent = 'Refresh';
    refresh.style.cssText = 'background:#fff;color:#222;border:0;border-radius:999px;padding:6px 14px;font:inherit;font-weight:600;cursor:pointer';
    refresh.addEventListener('click', () => location.reload());

    const dismiss = document.createElement('button');
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.textContent = '×';
    dismiss.style.cssText = 'background:none;color:#aaa;border:0;font:18px/1 system-ui,sans-serif;cursor:pointer;padding:4px';
    dismiss.addEventListener('click', () => toast.remove());

    toast.append(label, refresh, dismiss);
    const show = () => {
      document.body.appendChild(toast);
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
    };
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
  });
})();
