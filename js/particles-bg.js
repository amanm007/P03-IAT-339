(function () {
  const canvas = document.getElementById("drawingCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particleCount = reduceMotion ? 120 : 260;
  const particles = [];
  const cyan = "121,236,255";

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
    for (let i = 0; i < particleCount; i += 1) {
      particles.push(createParticle());
    }
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
      ctx.fillStyle = "rgba(" + cyan + ",0.68)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawParticles();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => {
    resize();
    initParticles();
  });

  resize();
  initParticles();
  frame();
})();
