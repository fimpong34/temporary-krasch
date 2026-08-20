(function () {
  'use strict';

  const redirectToLogin = function () {
    window.location.replace('/index.html');
  };

  const checkSession = function (attempt) {
    fetch('/api/auth/status', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(function (response) {
        // Only a successful status response can prove that the session ended.
        // A transient 5xx response must not log the user out.
        if (!response.ok) throw new Error('Auth status unavailable');
        return response.json();
      })
      .then(function (status) {
        if (status && status.authenticated === false) redirectToLogin();
      })
      .catch(function () {
        // Cold starts and short network interruptions are common on mobile.
        // Retry once, then keep the current screen instead of manufacturing a
        // logout. The next protected API call will still enforce auth server-side.
        if (attempt === 0) window.setTimeout(function () { checkSession(1); }, 1500);
      });
  };

  checkSession(0);
})();
