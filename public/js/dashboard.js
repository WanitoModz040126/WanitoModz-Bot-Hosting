document.addEventListener('DOMContentLoaded', function () {
  var modal = document.getElementById('confirmModal');
  var pendingDeleteId = null;

  document.querySelectorAll('.js-start').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        await api('/api/bots/' + btn.dataset.id + '/start', { method: 'POST' });
        showToast('Bot starting…', 'success');
        setTimeout(function () { window.location.reload(); }, 700);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll('.js-stop').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        await api('/api/bots/' + btn.dataset.id + '/stop', { method: 'POST' });
        showToast('Bot stopped.', 'success');
        setTimeout(function () { window.location.reload(); }, 500);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll('.js-delete').forEach(function (btn) {
    btn.addEventListener('click', function () {
      pendingDeleteId = btn.dataset.id;
      modal.classList.add('is-open');
    });
  });

  document.getElementById('confirmCancel').addEventListener('click', function () {
    pendingDeleteId = null;
    modal.classList.remove('is-open');
  });

  document.getElementById('confirmDelete').addEventListener('click', async function () {
    if (!pendingDeleteId) return;
    try {
      await api('/api/bots/' + pendingDeleteId, { method: 'DELETE' });
      showToast('Bot deleted.', 'success');
      modal.classList.remove('is-open');
      setTimeout(function () { window.location.reload(); }, 400);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});
