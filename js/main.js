(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Email: put together here so the address is not in the HTML ---------- */

  document.querySelectorAll('[data-email]').forEach(function (link) {
    link.href = 'mailto:' + link.dataset.user + '@' + link.dataset.domain;
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Theme toggle ---------- */

  var themeListeners = [];
  var toggle = document.getElementById('theme-toggle');

  function paintToggle() {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    toggle.textContent = next;
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    document.querySelector('meta[name="theme-color"]').content =
      getComputedStyle(root).getPropertyValue('--bg').trim();
  }

  toggle.addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    paintToggle();
    themeListeners.forEach(function (listener) { listener(); });
  });

  paintToggle();

  /* ---------- Job title resolves out of random characters on load ---------- */

  function scramble(element) {
    var finalText = element.textContent;
    var glyphs = '01<>/{}[]=+*#';
    var duration = 900;
    var start = null;
    var finished = false;

    // Screen readers get the real title once, not every animation frame.
    element.setAttribute('aria-label', finalText);
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    element.textContent = '';
    element.appendChild(visual);

    function finish() {
      finished = true;
      visual.textContent = finalText;
    }

    function frame(now) {
      if (finished) return;
      if (start === null) start = now;
      var settled = Math.floor((now - start) / duration * finalText.length);
      if (settled >= finalText.length) { finish(); return; }
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        var ch = finalText[i];
        out += i < settled || ch === ' ' ? ch : glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      visual.textContent = out;
      requestAnimationFrame(frame);
    }

    visual.textContent = finalText;
    requestAnimationFrame(frame);
    // Animation frames stop in hidden tabs and some preview tools.
    // The timer makes sure the title can never stay garbled.
    setTimeout(finish, duration + 300);
  }

  if (!reduceMotion) scramble(document.getElementById('role'));

  /* ---------- Resume sections fade in as they scroll into view ---------- */

  var reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Hero background: k-means running live ----------
     Points drift slowly and take the colour of their nearest centroid.
     Two centroids move to the mean of their points, as in k-means.
     The third follows the visitor's pointer or finger. */

  var canvas = document.getElementById('clusters');
  var hero = document.getElementById('top');
  var card = hero.querySelector('.hero__card');
  var ctx = canvas.getContext('2d');
  var width = 0;
  var height = 0;
  var points = [];
  var colors = [];
  var dotAlpha = 0.5;
  var clearZone = { x: 0, y: 0, rx: 1, ry: 1 };
  var centroids = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ];
  var pointer = { active: false, x: 0, y: 0 };
  var running = false;
  var heroVisible = true;

  function readColors() {
    var styles = getComputedStyle(root);
    colors = ['--cluster-1', '--cluster-2', '--cluster-3'].map(function (name) {
      return styles.getPropertyValue(name).trim();
    });
    dotAlpha = parseFloat(styles.getPropertyValue('--dot-alpha')) || 0.5;
  }

  function measure() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var heroBox = hero.getBoundingClientRect();
    var cardBox = card.getBoundingClientRect();
    width = heroBox.width;
    height = heroBox.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    clearZone = {
      x: cardBox.left - heroBox.left + cardBox.width / 2,
      y: cardBox.top - heroBox.top + cardBox.height / 2,
      rx: Math.max(cardBox.width * 0.62, 1),
      ry: Math.max(cardBox.height * 0.62, 1)
    };

    var target = Math.max(40, Math.min(170, Math.round(width * height / 8500)));
    while (points.length < target) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        group: 0
      });
    }
    points.length = target;

    points.forEach(function (p) {
      if (p.x > width) p.x = Math.random() * width;
      if (p.y > height) p.y = Math.random() * height;
    });
  }

  function placeCentroids() {
    centroids[0].x = width * 0.18; centroids[0].y = height * 0.3;
    centroids[1].x = width * 0.82; centroids[1].y = height * 0.3;
    centroids[2].x = width * 0.5;  centroids[2].y = height * 0.85;
  }

  function step(time) {
    var i, j, p, best, bestDistance, dx, dy, distance;
    var sums = [{ x: 0, y: 0, n: 0 }, { x: 0, y: 0, n: 0 }, { x: 0, y: 0, n: 0 }];

    for (i = 0; i < points.length; i++) {
      p = points[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += width; else if (p.x > width) p.x -= width;
      if (p.y < 0) p.y += height; else if (p.y > height) p.y -= height;

      best = 0;
      bestDistance = Infinity;
      for (j = 0; j < centroids.length; j++) {
        dx = p.x - centroids[j].x;
        dy = p.y - centroids[j].y;
        distance = dx * dx + dy * dy;
        if (distance < bestDistance) { bestDistance = distance; best = j; }
      }
      p.group = best;
      sums[best].x += p.x;
      sums[best].y += p.y;
      sums[best].n += 1;
    }

    for (j = 0; j < 2; j++) {
      if (sums[j].n) {
        centroids[j].x += (sums[j].x / sums[j].n - centroids[j].x) * 0.015;
        centroids[j].y += (sums[j].y / sums[j].n - centroids[j].y) * 0.015;
      }
    }

    // With no pointer, the third centroid wanders so the colours keep shifting.
    var targetX = pointer.active ? pointer.x : width * (0.5 + 0.38 * Math.sin(time / 7000));
    var targetY = pointer.active ? pointer.y : height * (0.5 + 0.36 * Math.cos(time / 5300));
    centroids[2].x += (targetX - centroids[2].x) * 0.06;
    centroids[2].y += (targetY - centroids[2].y) * 0.06;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      // Fade the dots behind the text so it stays easy to read.
      var ex = (p.x - clearZone.x) / clearZone.rx;
      var ey = (p.y - clearZone.y) / clearZone.ry;
      var fade = Math.min(1, Math.max(0, (Math.sqrt(ex * ex + ey * ey) - 0.85) / 0.45));
      if (fade <= 0) continue;
      ctx.globalAlpha = dotAlpha * fade;
      ctx.fillStyle = colors[p.group];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    centroids.forEach(function (c, index) {
      ctx.strokeStyle = colors[index];
      ctx.beginPath();
      ctx.moveTo(c.x - 5, c.y - 5); ctx.lineTo(c.x + 5, c.y + 5);
      ctx.moveTo(c.x + 5, c.y - 5); ctx.lineTo(c.x - 5, c.y + 5);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    if (!running) return;
    step(time);
    draw();
    requestAnimationFrame(loop);
  }

  function updateRunning() {
    var shouldRun = heroVisible && !document.hidden && !reduceMotion;
    if (shouldRun && !running) {
      running = true;
      requestAnimationFrame(loop);
    } else if (!shouldRun) {
      running = false;
    }
  }

  // Draws one still frame with up-to-date cluster colours when nothing is animating.
  function drawStill() {
    if (running) return;
    step(0);
    draw();
  }

  function setPointer(event) {
    var box = hero.getBoundingClientRect();
    pointer.active = true;
    pointer.x = event.clientX - box.left;
    pointer.y = event.clientY - box.top;
    if (reduceMotion) {
      centroids[2].x = pointer.x;
      centroids[2].y = pointer.y;
      drawStill();
    }
  }

  readColors();
  measure();
  placeCentroids();
  drawStill();
  updateRunning();

  hero.addEventListener('pointermove', setPointer);
  hero.addEventListener('pointerdown', setPointer);
  hero.addEventListener('pointerleave', function () { pointer.active = false; });

  themeListeners.push(function () {
    readColors();
    drawStill();
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measure();
      drawStill();
    }, 120);
  });

  document.addEventListener('visibilitychange', updateRunning);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      updateRunning();
    }).observe(hero);
  }

  var hint = document.getElementById('clusters-hint');
  hint.textContent = matchMedia('(hover: hover)').matches
    ? 'live k-means: your cursor is one of the centroids'
    : 'live k-means: touch to move a centroid';
  hint.hidden = false;
})();
