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
      // Fail closed so a logged-out or unverifiable session cannot keep a
      // protected screen such as Profile open from the service-worker cache.
      window.location.replace('/index.html');
    });
})();
