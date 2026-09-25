// Runtime behaviour for the static build. Mirrors route() in source/app.js,
// minus the hash routing (each page is its own file now).
(function () {
  var nav = document.getElementById('nav');
  document.getElementById('burger').onclick = function () { nav.classList.toggle('open'); };

  // Home: device showcase (source/device.js)
  if (window.mountSites) {
    window.mountSites();
    // The mock client sites are pictures of other sites: hide them from screen readers and search snippets.
    var track = document.getElementById('dev-track');
    if (track) { track.setAttribute('aria-hidden', 'true'); track.setAttribute('data-nosnippet', ''); }
  }

  // Contact: toggleable interest chips + form
  var main = document.getElementById('main');
  main.querySelectorAll('.chip').forEach(function (c) { c.onclick = function () { c.classList.toggle('on'); }; });

  var f = document.getElementById('form');
  if (f) {
    var TO = 'Andrew@copacetic.web';
    var started = Date.now();
    // Honeypot: invisible to people and screen readers; bots that fill every field give themselves away.
    var trap = document.createElement('input');
    trap.name = 'website'; trap.tabIndex = -1; trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    document.getElementById('ff').appendChild(trap);
    var done = function () {
      document.getElementById('ff').style.display = 'none';
      document.getElementById('sent').style.display = 'block';
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      var val = function (id) { return document.getElementById(id).value.trim(); };
      var data = {
        name: val('fn'),
        company: val('fc'),
        email: val('fe'),
        interests: Array.prototype.map.call(f.querySelectorAll('.chip.on'), function (c) { return c.textContent; }),
        message: val('fm'),
        website: trap.value,
        elapsed: Date.now() - started,
      };
      var btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        done();
      }).catch(function () {
        // Endpoint unreachable (offline or not configured): hand the message to the visitor's mail app.
        var body = 'Name: ' + data.name + '\nCompany: ' + data.company + '\nEmail: ' + data.email +
          '\nInterested in: ' + data.interests.join(', ') + '\n\n' + data.message;
        location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent('Project enquiry from ' + data.name) +
          '&body=' + encodeURIComponent(body);
        done();
      });
    };
  }

  if ('serviceWorker' in navigator) {
    addEventListener('load', function () { navigator.serviceWorker.register('/sw.js'); });
  }
})();
