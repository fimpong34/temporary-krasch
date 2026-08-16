(function () {
  'use strict';

  fetch('/api/auth/status', {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  })
    .then(function (response) {
      if (!response.ok) return null;
      return response.json();
    })
    .then(function (status) {
      if (!status || !status.authenticated) {
        window.location.replace('/index.html');
      }
    })
    .catch(function () {
      // Leave an already-loaded page usable during a temporary offline period.
    });
})();
