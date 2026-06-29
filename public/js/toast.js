function showToast(message, type) {
  var stack = document.getElementById('toastStack');
  if (!stack) return;
  var el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(function () {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s ease';
    setTimeout(function () { el.remove(); }, 220);
  }, 3800);
}

function showAlert(mountId, message, type) {
  var mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = '<div class="alert alert-' + (type || 'error') + '" style="margin-bottom:18px;">' + message + '</div>';
}

function clearAlert(mountId) {
  var mount = document.getElementById(mountId);
  if (mount) mount.innerHTML = '';
}

async function api(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
  }
  options.credentials = 'same-origin';
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const message = (data && data.error) || ('Request failed (' + res.status + ')');
    throw new Error(message);
  }
  return data;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
