'use strict';
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var form = $('pairForm'), numberInput = $('number'), submitBtn = $('submitBtn');
  var statusBox = $('statusBox'), statusText = $('statusText');
  var codeBox = $('codeBox'), codeEl = $('code'), timerEl = $('timer');
  var copyBtn = $('copyBtn'), cancelBtn = $('cancelBtn'), retryBtn = $('retryBtn');

  var attemptId = null, pollTimer = null, countdownTimer = null, expiresAt = 0, networkFailures = 0;

  function setStatus(kind, text) {
    statusBox.hidden = false;
    statusBox.className = 'status ' + (kind || '');
    statusText.textContent = text;
  }

  function stopTimers() {
    clearTimeout(pollTimer); clearInterval(countdownTimer);
    pollTimer = null; countdownTimer = null;
  }

  function resetUi() {
    stopTimers();
    attemptId = null;
    codeBox.hidden = true; cancelBtn.hidden = true; retryBtn.hidden = true;
    submitBtn.disabled = false; numberInput.disabled = false;
  }

  function startCountdown() {
    clearInterval(countdownTimer);
    function tick() {
      var left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      var m = Math.floor(left / 60), s = left % 60;
      timerEl.textContent = 'Code expires in ' + m + ':' + (s < 10 ? '0' : '') + s;
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function finish(kind, text) {
    stopTimers();
    codeBox.hidden = true; cancelBtn.hidden = true;
    setStatus(kind, text);
    retryBtn.hidden = (kind === 'ok');
    numberInput.disabled = false; submitBtn.disabled = false;
  }

  function render(d) {
    if (d.expiresInSeconds != null) expiresAt = Date.now() + d.expiresInSeconds * 1000;
    switch (d.status) {
      case 'starting':
        setStatus('wait', d.message); codeBox.hidden = true; break;
      case 'code_ready':
        setStatus('wait', 'Enter this code in WhatsApp now. Waiting for you to link the device...');
        codeEl.textContent = d.code || '';
        codeBox.hidden = false; startCountdown(); break;
      case 'linking':
        setStatus('wait', d.message); codeBox.hidden = true; break;
      case 'connected':
        finish('ok', '\u2705 ' + d.message); break;
      case 'expired': case 'failed': case 'cancelled':
        finish('err', d.message); break;
      default:
        setStatus('', d.message || '');
    }
  }

  function poll() {
    if (!attemptId) return;
    fetch('/api/pair/' + encodeURIComponent(attemptId), { cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        networkFailures = 0;
        if (!res.ok) { finish('err', res.body.error || 'Pairing attempt not found. Please try again.'); return; }
        render(res.body);
        if (['connected', 'expired', 'failed', 'cancelled'].indexOf(res.body.status) === -1) {
          pollTimer = setTimeout(poll, 2000);
        }
      })
      .catch(function () {
        networkFailures += 1;
        if (networkFailures >= 5) { finish('err', 'Lost connection to the server. Check your internet and try again.'); return; }
        setStatus('wait', 'Connection problem, retrying...');
        pollTimer = setTimeout(poll, 3000);
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var number = numberInput.value.replace(/[\s\-().+]/g, '');
    if (!/^[1-9]\d{7,14}$/.test(number)) {
      setStatus('err', 'Enter a valid number with country code, digits only (no + and no leading 0).');
      return;
    }
    resetUi();
    submitBtn.disabled = true; numberInput.disabled = true;
    setStatus('wait', 'Requesting a pairing code...');
    fetch('/api/pair', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: number }),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) { finish('err', res.body.error || 'Could not start pairing.'); return; }
        attemptId = res.body.id; networkFailures = 0;
        cancelBtn.hidden = false;
        render(res.body);
        pollTimer = setTimeout(poll, 1500);
      })
      .catch(function () { finish('err', 'Could not reach the server. Please try again.'); });
  });

  copyBtn.addEventListener('click', function () {
    var code = codeEl.textContent;
    if (!code) return;
    var done = function () { copyBtn.textContent = 'Copied!'; setTimeout(function () { copyBtn.textContent = 'Copy code'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () {});
  });

  cancelBtn.addEventListener('click', function () {
    var id = attemptId;
    stopTimers();
    if (id) fetch('/api/pair/' + encodeURIComponent(id), { method: 'DELETE' }).catch(function () {});
    resetUi(); statusBox.hidden = true;
  });

  retryBtn.addEventListener('click', function () { resetUi(); statusBox.hidden = true; numberInput.focus(); });

  fetch('/api/info').then(function (r) { return r.json(); }).then(function (i) {
    document.title = i.botName + ' - Pair your WhatsApp';
    $('botName').textContent = i.botName;
    var img = $('botImage'); img.src = i.image; img.alt = i.botName;
    img.onload = function () { img.hidden = false; }; img.onerror = function () { img.hidden = true; };
    $('channelLink').href = i.channelLink; $('channelLink').textContent = 'Channel: ' + i.channelName;
    $('groupLink').href = i.groupLink; $('groupLink').textContent = 'Group: ' + i.groupName;
    $('githubLink').href = i.githubUrl;
    $('footer').textContent = i.botName + ' \u2022 Owner: ' + i.ownerName;
  }).catch(function () { /* page still works without info */ });
})();
