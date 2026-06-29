document.addEventListener('DOMContentLoaded', function () {
  var tabSignIn = document.getElementById('tabSignIn');
  var tabSignUp = document.getElementById('tabSignUp');
  var sectionSignIn = document.getElementById('sectionSignIn');
  var sectionSignUp = document.getElementById('sectionSignUp');
  var switchHint = document.getElementById('switchHint');
  var switchToSignUp = document.getElementById('switchToSignUp');

  function activate(which) {
    var isSignIn = which === 'signin';
    tabSignIn.classList.toggle('is-active', isSignIn);
    tabSignUp.classList.toggle('is-active', !isSignIn);
    sectionSignIn.classList.toggle('is-active', isSignIn);
    sectionSignUp.classList.toggle('is-active', !isSignIn);
    switchHint.innerHTML = isSignIn
      ? 'New here? <a href="#" id="switchToSignUp" class="help-link">Create an account</a>'
      : 'Already have an account? <a href="#" id="switchToSignIn" class="help-link">Sign in</a>';
    clearAlert('alertMount');
    bindSwitchLinks();
  }

  function bindSwitchLinks() {
    var su = document.getElementById('switchToSignUp');
    var si = document.getElementById('switchToSignIn');
    if (su) su.addEventListener('click', function (e) { e.preventDefault(); activate('signup'); });
    if (si) si.addEventListener('click', function (e) { e.preventDefault(); activate('signin'); });
  }

  tabSignIn.addEventListener('click', function () { activate('signin'); });
  tabSignUp.addEventListener('click', function () { activate('signup'); });
  bindSwitchLinks();

  function getTurnstileToken(form) {
    var widget = form.querySelector('.cf-turnstile');
    if (!widget) return null;
    var input = widget.querySelector('input[name="cf-turnstile-response"]');
    return input ? input.value : null;
  }

  document.getElementById('signInForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAlert('alertMount');
    var btn = document.getElementById('signInSubmit');
    btn.disabled = true;
    try {
      const payload = {
        username: document.getElementById('siUsername').value.trim(),
        password: document.getElementById('siPassword').value,
        turnstileToken: getTurnstileToken(this),
      };
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      window.location.href = data.redirect || '/dashboard';
    } catch (err) {
      showAlert('alertMount', err.message, 'error');
      btn.disabled = false;
    }
  });

  document.getElementById('signUpForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAlert('alertMount');
    var btn = document.getElementById('signUpSubmit');
    btn.disabled = true;
    try {
      const payload = {
        username: document.getElementById('suUsername').value.trim(),
        password: document.getElementById('suPassword').value,
        confirmPassword: document.getElementById('suConfirm').value,
        turnstileToken: getTurnstileToken(this),
      };
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
      window.location.href = data.redirect || '/dashboard';
    } catch (err) {
      showAlert('alertMount', err.message, 'error');
      btn.disabled = false;
    }
  });
});
