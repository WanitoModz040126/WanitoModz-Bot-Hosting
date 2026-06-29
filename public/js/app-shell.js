document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('sidebarToggle');
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('sidebarScrim');

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-open');
  }

  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('is-open');
      if (scrim) scrim.classList.toggle('is-open');
    });
  }
  if (scrim) scrim.addEventListener('click', closeSidebar);

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch (e) { /* ignore, redirect anyway */ }
      window.location.href = '/login';
    });
  }

  // Generic modal close-on-backdrop-click + [data-close-modal] buttons
  document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) backdrop.classList.remove('is-open');
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var modal = document.getElementById(btn.getAttribute('data-close-modal'));
      if (modal) modal.classList.remove('is-open');
    });
  });
});
