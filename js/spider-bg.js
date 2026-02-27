(function () {
  const canvas = document.getElementById("drawingCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particleCount = reduceMotion ? 120 : 260;
  const particles = [];
  const sparks = [];
  const cyan = "121,236,255";
  const violet = "127,77,255";
  const webBlue = "97,145,255";
  const white = "232,244,255";
  const modeIdleTimeoutMs = 850;
  const spiderConfig = {
    spring: 0.024,
    damping: 0.88,
    phaseSpeed: 0.08,
    linkDist: 300,
    strands: 10,
    particleAlpha: 0.68,
    trailAlpha: 0.28,
    curve: 30,
    maxSpeed: 3.1,
    roamJitter: 0.1,
    pounceBoost: 10.5
  };

  let pounceEnergy = 0;

  const cursor = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    lastMoveAt: performance.now(),
    lastX: window.innerWidth * 0.5,
    lastY: window.innerHeight * 0.5,
    lastSampleAt: performance.now(),
    speed: 0
  };

  const spider = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    vx: 0,
    vy: 0,
    radius: 5.5,
    phase: 0,
    roamTargetX: window.innerWidth * 0.6,
    roamTargetY: window.innerHeight * 0.45,
    nextRoamShiftAt: performance.now() + 1000 + Math.random() * 1800
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticle() {
    const speed = 0.07 + Math.random() * 0.35;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 0.45 + Math.random() * 1.15
    };
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < particleCount; i += 1) particles.push(createParticle());
  }

  function drawParticles() {
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -4) p.x = window.innerWidth + 4;
      if (p.x > window.innerWidth + 4) p.x = -4;
      if (p.y < -4) p.y = window.innerHeight + 4;
      if (p.y > window.innerHeight + 4) p.y = -4;

      ctx.beginPath();
      ctx.fillStyle = "rgba(" + cyan + "," + spiderConfig.particleAlpha + ")";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function chooseRoamTarget() {
    const margin = 40;
    spider.roamTargetX = margin + Math.random() * Math.max(80, window.innerWidth - margin * 2);
    spider.roamTargetY = margin + Math.random() * Math.max(80, window.innerHeight - margin * 2);
    spider.nextRoamShiftAt = performance.now() + 1000 + Math.random() * 2300;
  }

  function isCursorActive() {
    return performance.now() - cursor.lastMoveAt < modeIdleTimeoutMs;
  }

  function setPointerTarget(x, y) {
    const now = performance.now();
    const dt = Math.max(16, now - cursor.lastSampleAt);
    const dist = Math.hypot(x - cursor.lastX, y - cursor.lastY);
    const pxPerSec = (dist / dt) * 1000;
    cursor.speed = cursor.speed * 0.75 + pxPerSec * 0.25;
    cursor.x = x;
    cursor.y = y;
    cursor.lastMoveAt = now;
    cursor.lastX = x;
    cursor.lastY = y;
    cursor.lastSampleAt = now;
  }

  function updateSpider() {
    const active = isCursorActive();
    if (!active) {
      const roamDist = Math.hypot(spider.roamTargetX - spider.x, spider.roamTargetY - spider.y);
      if (roamDist < 36 || performance.now() >= spider.nextRoamShiftAt) chooseRoamTarget();
    }

    const targetX = active ? cursor.x : spider.roamTargetX;
    const targetY = active ? cursor.y : spider.roamTargetY;
    const dx = targetX - spider.x;
    const dy = targetY - spider.y;
    const spring = spiderConfig.spring * (active ? 1.1 : 0.58);

    spider.vx += dx * spring + (Math.random() - 0.5) * spiderConfig.roamJitter;
    spider.vy += dy * spring + (Math.random() - 0.5) * spiderConfig.roamJitter;
    spider.vx *= spiderConfig.damping;
    spider.vy *= spiderConfig.damping;

    const speed = Math.hypot(spider.vx, spider.vy);
    const speedCap = spiderConfig.maxSpeed * (active ? 1.15 : 0.85);
    if (speed > speedCap) {
      const scale = speedCap / speed;
      spider.vx *= scale;
      spider.vy *= scale;
    }

    spider.x += spider.vx;
    spider.y += spider.vy;

    if (spider.x < 0) spider.x = window.innerWidth;
    if (spider.x > window.innerWidth) spider.x = 0;
    if (spider.y < 0) spider.y = window.innerHeight;
    if (spider.y > window.innerHeight) spider.y = 0;

    spider.phase += spiderConfig.phaseSpeed;
    pounceEnergy *= 0.88;
    cursor.speed *= 0.95;
  }

  function getNearestParticles(x, y, count, maxDist) {
    const candidates = [];
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < maxDist) candidates.push({ p, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    return candidates.slice(0, count);
  }

  function drawSpiderWeb() {
    const active = isCursorActive();
    const strandCount = spiderConfig.strands + (active ? 2 : 0);
    const nearest = getNearestParticles(spider.x, spider.y, strandCount, spiderConfig.linkDist);
    const bodyRadius = spider.radius + pounceEnergy * 1.8;

    for (let i = 0; i < nearest.length; i += 1) {
      const target = nearest[i];
      const endX = target.p.x;
      const endY = target.p.y;
      const angle = Math.atan2(endY - spider.y, endX - spider.x);
      const startX = spider.x + Math.cos(angle) * (bodyRadius + 1.2);
      const startY = spider.y + Math.sin(angle) * (bodyRadius + 1.2);
      const bend = spiderConfig.curve * (active ? 1.25 : 0.8);
      const phaseOffset = spider.phase + i * 0.7;
      const midX = (startX + endX) * 0.5 + Math.cos(phaseOffset) * bend;
      const midY = (startY + endY) * 0.5 + Math.sin(phaseOffset * 1.15) * bend;
      const alpha = Math.max(0.22, (1 - target.d / spiderConfig.linkDist) * (active ? 1 : 0.8));

      ctx.strokeStyle = "rgba(" + webBlue + "," + alpha.toFixed(3) + ")";
      ctx.lineWidth = active ? 1.25 : 1.0;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = "rgba(" + white + "," + Math.min(1, alpha + 0.25).toFixed(3) + ")";
      ctx.arc(endX, endY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (active) {
      ctx.strokeStyle = "rgba(" + cyan + "," + spiderConfig.trailAlpha + ")";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(spider.x, spider.y);
      ctx.lineTo(cursor.x, cursor.y);
      ctx.stroke();
    }
  }

  function drawSpiderBody() {
    const speedBoost = Math.min(1.45, cursor.speed / 1400);
    const bodyRadius = (spider.radius + pounceEnergy * 1.8) * (1 + speedBoost);

    ctx.beginPath();
    ctx.fillStyle = "rgba(" + white + ",0.9)";
    ctx.arc(spider.x, spider.y, bodyRadius * 0.88, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(" + webBlue + ",0.65)";
    ctx.arc(spider.x, spider.y, bodyRadius * 1.22, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(" + cyan + ",0.35)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function burstSparks(x, y) {
    const count = 14;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 1.8 + Math.random() * 2.8;
      sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 26 + Math.random() * 24, age: 0 });
    }
  }

  function drawSparks() {
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.97;
      s.vy *= 0.97;
      s.age += 1;
      const alpha = Math.max(0, 1 - s.age / s.life);

      ctx.fillStyle = "rgba(" + cyan + "," + (alpha * 0.95).toFixed(3) + ")";
      ctx.fillRect(s.x, s.y, 2.2, 2.2);
      if (alpha > 0.4) {
        ctx.fillStyle = "rgba(" + violet + "," + (alpha * 0.65).toFixed(3) + ")";
        ctx.fillRect(s.x + 1.1, s.y + 1.1, 1.2, 1.2);
      }
      if (s.age >= s.life) sparks.splice(i, 1);
    }
  }

  function pounceTo(x, y) {
    if (reduceMotion) return;
    const dx = x - spider.x;
    const dy = y - spider.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    spider.vx += (dx / d) * spiderConfig.pounceBoost;
    spider.vy += (dy / d) * spiderConfig.pounceBoost;
    pounceEnergy = 0.95;
    burstSparks(spider.x, spider.y);
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawParticles();
    if (!reduceMotion) updateSpider();
    drawSpiderWeb();
    drawSpiderBody();
    drawSparks();
    requestAnimationFrame(frame);
  }

  window.addEventListener("mousemove", (e) => setPointerTarget(e.clientX, e.clientY));
  window.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches[0]) setPointerTarget(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener("touchstart", (e) => {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    setPointerTarget(t.clientX, t.clientY);
    pounceTo(t.clientX, t.clientY);
    burstSparks(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener("click", (e) => {
    setPointerTarget(e.clientX, e.clientY);
    pounceTo(e.clientX, e.clientY);
    burstSparks(e.clientX, e.clientY);
  });
  window.addEventListener("resize", () => {
    resize();
    initParticles();
    chooseRoamTarget();
  });

  resize();
  initParticles();
  chooseRoamTarget();
  frame();
})();
