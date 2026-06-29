document.addEventListener('DOMContentLoaded', function () {
  var currentPath = '';
  var pendingDelete = null;

  var mount = document.getElementById('fileListMount');
  var breadcrumbs = document.getElementById('breadcrumbs');
  var usageLine = document.getElementById('usageLine');

  function folderIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }
  function fileIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }

  function renderBreadcrumbs() {
    var parts = currentPath ? currentPath.split('/').filter(Boolean) : [];
    var html = '<button data-go="">🏠 Home</button>';
    var acc = '';
    parts.forEach(function (part) {
      acc += (acc ? '/' : '') + part;
      html += '<span class="crumb-sep">/</span><button data-go="' + escapeHtml(acc) + '">' + escapeHtml(part) + '</button>';
    });
    breadcrumbs.innerHTML = html;
    breadcrumbs.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () { loadPath(btn.dataset.go); });
    });
  }

  function renderEntries(entries) {
    if (!entries.length) {
      mount.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon">' + folderIcon() + '</div>' +
        '<h3>This folder is empty</h3>' +
        '<p>Create a folder or file, or upload something to get started.</p>' +
        '</div>';
      return;
    }

    var rows = entries.map(function (entry) {
      var nameCell =
        '<td class="file-name-cell"><div class="file-name" data-open="' + escapeHtml(entry.name) + '" data-type="' + entry.type + '">' +
        (entry.type === 'folder' ? folderIcon() : fileIcon()) +
        '<span>' + escapeHtml(entry.name) + '</span></div></td>';
      var sizeCell = '<td class="file-size">' + (entry.sizeLabel || '—') + '</td>';
      var modifiedCell = '<td class="file-modified">' + new Date(entry.modified).toLocaleDateString() + '</td>';
      var actionsCell =
        '<td class="file-actions">' +
        (entry.type === 'file' ? '<button class="icon-btn js-download" data-name="' + escapeHtml(entry.name) + '" title="Download"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' : '') +
        '<button class="icon-btn js-delete-entry" data-name="' + escapeHtml(entry.name) + '" data-type="' + entry.type + '" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '</td>';
      return '<tr class="file-row' + (entry.type === 'folder' ? ' is-folder' : '') + '">' + nameCell + sizeCell + modifiedCell + actionsCell + '</tr>';
    }).join('');

    mount.innerHTML =
      '<table class="file-table"><thead><tr><th>Name</th><th>Size</th><th>Modified</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';

    mount.querySelectorAll('[data-open]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.dataset.type === 'folder') {
          loadPath((currentPath ? currentPath + '/' : '') + el.dataset.open);
        }
      });
    });
    mount.querySelectorAll('.js-download').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = (currentPath ? currentPath + '/' : '') + btn.dataset.name;
        window.location.href = '/api/files/download?path=' + encodeURIComponent(p);
      });
    });
    mount.querySelectorAll('.js-delete-entry').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pendingDelete = (currentPath ? currentPath + '/' : '') + btn.dataset.name;
        document.getElementById('deleteModalText').textContent =
          btn.dataset.type === 'folder' ? 'This will permanently delete the folder and everything inside it.' : 'This file will be permanently deleted.';
        document.getElementById('deleteModal').classList.add('is-open');
      });
    });
  }

  async function loadUsage() {
    try {
      const data = await api('/api/files/usage');
      usageLine.textContent = data.usedLabel + ' of ' + data.totalLabel + ' used';
    } catch (err) { /* non-fatal */ }
  }

  async function loadPath(p) {
    currentPath = p || '';
    renderBreadcrumbs();
    mount.innerHTML = '<div class="empty-state"><p>Loading…</p></div>';
    try {
      const data = await api('/api/files?path=' + encodeURIComponent(currentPath));
      renderEntries(data.entries);
    } catch (err) {
      showToast(err.message, 'error');
    }
    loadUsage();
  }

  // New folder
  document.getElementById('newFolderBtn').addEventListener('click', function () {
    document.getElementById('newFolderName').value = '';
    document.getElementById('newFolderModal').classList.add('is-open');
  });
  document.getElementById('confirmNewFolder').addEventListener('click', async function () {
    var name = document.getElementById('newFolderName').value.trim();
    if (!name) return;
    try {
      await api('/api/files/folder', { method: 'POST', body: JSON.stringify({ path: currentPath, name: name }) });
      document.getElementById('newFolderModal').classList.remove('is-open');
      showToast('Folder created.', 'success');
      loadPath(currentPath);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // New file
  document.getElementById('newFileBtn').addEventListener('click', function () {
    document.getElementById('newFileName').value = '';
    document.getElementById('newFileContent').value = '';
    document.getElementById('newFileModal').classList.add('is-open');
  });
  document.getElementById('confirmNewFile').addEventListener('click', async function () {
    var name = document.getElementById('newFileName').value.trim();
    if (!name) return;
    try {
      await api('/api/files/file', {
        method: 'POST',
        body: JSON.stringify({ path: currentPath, name: name, content: document.getElementById('newFileContent').value }),
      });
      document.getElementById('newFileModal').classList.remove('is-open');
      showToast('File created.', 'success');
      loadPath(currentPath);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Upload
  var uploadInput = document.getElementById('uploadInput');
  document.getElementById('uploadBtn').addEventListener('click', function () { uploadInput.click(); });
  uploadInput.addEventListener('change', async function () {
    if (!uploadInput.files.length) return;
    var formData = new FormData();
    formData.append('path', currentPath);
    Array.from(uploadInput.files).forEach(function (f) { formData.append('files', f); });
    try {
      await api('/api/files/upload', { method: 'POST', body: formData });
      showToast('Upload complete.', 'success');
      loadPath(currentPath);
    } catch (err) {
      showToast(err.message, 'error');
    }
    uploadInput.value = '';
  });

  // Delete confirm
  document.getElementById('confirmDeleteFile').addEventListener('click', async function () {
    if (!pendingDelete) return;
    try {
      await api('/api/files?path=' + encodeURIComponent(pendingDelete), { method: 'DELETE' });
      document.getElementById('deleteModal').classList.remove('is-open');
      showToast('Deleted.', 'success');
      loadPath(currentPath);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  loadPath('');
});
