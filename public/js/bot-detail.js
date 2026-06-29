document.addEventListener('DOMContentLoaded', function () {
  var page = document.querySelector('.page-pad[data-bot-id]');
  var botId = page.dataset.botId;
  var logBody = document.getElementById('logBody');
  var statusPill = document.getElementById('statusPill');
  var startBtn = document.getElementById('startBtn');
  var stopBtn = document.getElementById('stopBtn');

  function appendLine(text) {
    var emptyNotice = logBody.querySelector('.terminal-empty');
    if (emptyNotice) emptyNotice.remove();
    var div = document.createElement('div');
    div.className = 'log-line' + (text.indexOf('[err]') === 0 ? ' is-err' : (text.indexOf('[system]') === 0 ? ' is-system' : ''));
    div.textContent = text;
    logBody.appendChild(div);
    logBody.scrollTop = logBody.scrollHeight;
  }

  function setStatus(status) {
    statusPill.textContent = status;
    statusPill.className = 'status-pill ' + status;
    if (status === 'running') {
      startBtn.style.display = 'none';
      stopBtn.style.display = '';
    } else {
      startBtn.style.display = '';
      stopBtn.style.display = 'none';
    }
  }

  var source = new EventSource('/api/bots/' + botId + '/logs/stream');
  source.addEventListener('log', function (e) {
    var data = JSON.parse(e.data);
    appendLine(data.line);
  });
  source.addEventListener('status', function (e) {
    var data = JSON.parse(e.data);
    setStatus(data.status);
  });
  source.onerror = function () { /* browser auto-reconnects EventSource */ };

  startBtn.addEventListener('click', async function () {
    startBtn.disabled = true;
    try {
      await api('/api/bots/' + botId + '/start', { method: 'POST' });
      showToast('Bot starting…', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    startBtn.disabled = false;
  });

  stopBtn.addEventListener('click', async function () {
    stopBtn.disabled = true;
    try {
      await api('/api/bots/' + botId + '/stop', { method: 'POST' });
      showToast('Bot stopped.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    stopBtn.disabled = false;
  });

  document.getElementById('clearViewBtn').addEventListener('click', function () {
    logBody.innerHTML = '<div class="terminal-empty">View cleared — new output will appear below.</div>';
  });

  var modal = document.getElementById('confirmModal');
  document.getElementById('deleteBotBtn').addEventListener('click', function () { modal.classList.add('is-open'); });
  document.getElementById('confirmCancel').addEventListener('click', function () { modal.classList.remove('is-open'); });
  document.getElementById('confirmDelete').addEventListener('click', async function () {
    try {
      await api('/api/bots/' + botId, { method: 'DELETE' });
      showToast('Bot deleted.', 'success');
      setTimeout(function () { window.location.href = '/dashboard'; }, 400);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});
