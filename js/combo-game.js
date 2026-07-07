/* ==========================================================================
   combo-game.js — "game mode"
   A tiny playable nod to the GAS melee combat system: a pixel swordsman
   runs and jumps across the page's real headings and cards (the page IS
   the level), hunting down 5 patrolling training dummies with a
   stamina-gated sword. Defeat them all to clear the combo.
   ========================================================================== */

(function () {
    "use strict";

    var toggle = document.getElementById("game-toggle");
    if (!toggle) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 860) return;

    /* ---------------- constants ---------------- */

    var GRAVITY = 0.22;
    var JUMP_FORCE = -6.6;
    var ACCEL = 0.34;
    var MAX_SPEED = 2.4;
    var FRICTION = 0.82;
    var DUMMY_COUNT = 5;
    var DUMMY_SPEED = 0.45;
    var SLASH_COST = 30;
    var STAMINA_REGEN = 0.45;
    var SLASH_FRAMES = 12;
    var BANNER_FRAMES = 260;

    var COLORS = {
        body: "#ded9f0",
        turban: "#a88bff",
        scarf: "#a88bff",
        blade: "#f4f1ff",
        platform: "rgba(168, 139, 255, 0.55)",
        dummyBody: "#4a3d7d",
        dummyBand: "#ffcc4d",
        dummyEye: "#f4f1ff",
        stamina: "#a88bff",
        staminaLow: "#ff7a7a",
        text: "#b5afce",
        accent: "#a88bff"
    };

    /* ---------------- state ---------------- */

    var active = false;
    var canvas = null, ctx = null, rafId = null, info = null;
    var keys = {};
    var platforms = [];
    var dummies = [];
    var particles = [];
    var frame = 0;
    var winTimer = 0;
    var bannerTimer = 0;

    var player = {
        w: 22, h: 30,
        x: 0, docY: 0, vx: 0, vy: 0,
        facing: 1, grounded: false, jumpLatch: false,
        slash: 0, stamina: 100, kills: 0, denyFlash: 0
    };

    /* ---------------- level building ---------------- */

    function buildPlatforms() {
        platforms = [];
        var sels = [
            ".rd-hero-title", ".rd-section-heading", ".rd-exp-panel.is-active h3",
            ".rd-slider", ".rd-card", ".rd-contact h2", ".rd-cta"
        ];
        document.querySelectorAll(sels.join(",")).forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (r.width < 60 || r.height < 8) return;
            platforms.push({
                x: r.left,
                y: r.top + window.scrollY,
                w: r.width
            });
        });
        platforms.sort(function (a, b) { return a.y - b.y; });
    }

    function buildDummies() {
        dummies = [];
        if (platforms.length < 2) return;
        // spread dummies across the page on wide-enough platforms
        var usable = platforms.slice(1).filter(function (p) { return p.w > 120; });
        if (!usable.length) usable = platforms.slice(1);
        var step = Math.max(1, Math.floor(usable.length / DUMMY_COUNT));
        for (var i = 0; i < DUMMY_COUNT && i * step < usable.length; i++) {
            var p = usable[i * step];
            dummies.push({
                platform: p,
                w: 16, h: 22,
                x: p.x + p.w * 0.3,
                vx: DUMMY_SPEED * (Math.random() < 0.5 ? 1 : -1),
                dead: false,
                stagger: 0
            });
        }
    }

    function respawn() {
        var p = platforms[0];
        player.x = p ? p.x + 30 : 100;
        player.docY = p ? p.y - player.h - 2 : window.scrollY + 100;
        player.vx = 0;
        player.vy = 0;
    }

    /* ---------------- input ---------------- */

    function onKeyDown(e) {
        if (e.key === "Escape") { stop(); return; }
        keys[e.key.toLowerCase()] = true;
        if (["arrowleft", "arrowright", "arrowup", " ", "arrowdown"].indexOf(e.key.toLowerCase()) !== -1) {
            e.preventDefault();
        }
    }

    function onKeyUp(e) {
        keys[e.key.toLowerCase()] = false;
    }

    /* ---------------- game loop ---------------- */

    function step() {
        frame++;
        if (bannerTimer > 0) bannerTimer--;

        var left = keys.arrowleft || keys.a;
        var right = keys.arrowright || keys.d;
        var jump = keys.arrowup || keys.w || keys[" "];
        var slash = keys.x || keys.j;

        if (left)  { player.vx = Math.max(player.vx - ACCEL, -MAX_SPEED); player.facing = -1; }
        if (right) { player.vx = Math.min(player.vx + ACCEL, MAX_SPEED); player.facing = 1; }
        if (!left && !right) player.vx *= FRICTION;

        if (jump && player.grounded && !player.jumpLatch) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumpLatch = true;
        }
        if (!jump) player.jumpLatch = false;

        // slash: stamina-gated, like the real thing
        if (slash && player.slash === 0) {
            if (player.stamina >= SLASH_COST) {
                player.slash = SLASH_FRAMES;
                player.stamina -= SLASH_COST;
            } else {
                player.denyFlash = 14;
            }
            keys.x = keys.j = false; // one swing per press
        }
        if (player.slash > 0) player.slash--;
        player.stamina = Math.min(100, player.stamina + STAMINA_REGEN);
        if (player.denyFlash > 0) player.denyFlash--;

        player.vy = Math.min(player.vy + GRAVITY, 8);
        player.x += player.vx;
        var prevBot = player.docY + player.h;
        player.docY += player.vy;

        // platform landings (one-way, from above)
        player.grounded = false;
        var bot = player.docY + player.h;
        for (var i = 0; i < platforms.length; i++) {
            var p = platforms[i];
            if (player.x + player.w > p.x && player.x < p.x + p.w &&
                prevBot <= p.y + 5 && bot >= p.y - 1 && player.vy >= 0) {
                player.docY = p.y - player.h;
                player.vy = 0;
                player.grounded = true;
                break;
            }
        }

        // keep inside horizontal bounds
        player.x = Math.max(4, Math.min(window.innerWidth - player.w - 4, player.x));

        // fell off the visible screen -> respawn
        var sy = player.docY - window.scrollY;
        if (sy > window.innerHeight + 60 || sy < -800) respawn();

        // gentle camera follow when near screen edges
        if (sy > window.innerHeight - 130) window.scrollBy(0, 6);
        if (sy < 110) window.scrollBy(0, -6);

        // dummies patrol their platform
        dummies.forEach(function (d) {
            if (d.dead) return;
            if (d.stagger > 0) { d.stagger--; return; }
            d.x += d.vx;
            if (d.x < d.platform.x + 4) { d.x = d.platform.x + 4; d.vx = Math.abs(d.vx); }
            if (d.x + d.w > d.platform.x + d.platform.w - 4) {
                d.x = d.platform.x + d.platform.w - 4 - d.w;
                d.vx = -Math.abs(d.vx);
            }
        });

        // slash hits
        if (player.slash > SLASH_FRAMES - 8) {
            var hx = player.facing === 1 ? player.x + player.w : player.x - 36;
            var hw = 36;
            var hy = player.docY - 6;
            var hh = player.h + 12;
            dummies.forEach(function (d) {
                if (d.dead) return;
                var dy = d.platform.y - d.h;
                if (d.x + d.w > hx && d.x < hx + hw && dy + d.h > hy && dy < hy + hh) {
                    d.dead = true;
                    player.kills++;
                    burst(d.x + d.w / 2, dy + d.h / 2);
                    if (player.kills >= dummies.length) winTimer = 170;
                }
            });
        }

        if (winTimer > 0) {
            winTimer--;
            if (winTimer === 0) {
                player.kills = 0;
                buildDummies();
            }
        }

        // particles
        for (var j = particles.length - 1; j >= 0; j--) {
            var pa = particles[j];
            pa.x += pa.vx; pa.docY += pa.vy; pa.vy += 0.1; pa.life -= 0.03;
            if (pa.life <= 0) particles.splice(j, 1);
        }

        draw();
        rafId = requestAnimationFrame(step);
    }

    function burst(x, docY) {
        for (var i = 0; i < 18; i++) {
            var a = Math.random() * 6.28, s = 1 + Math.random() * 3;
            particles.push({
                x: x, docY: docY,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
                life: 1, gold: Math.random() < 0.4
            });
        }
    }

    /* ---------------- rendering ---------------- */

    function drawDummy(d, sc) {
        var y = d.platform.y - d.h - sc;
        var wobble = Math.sin(frame * 0.15 + d.x) * 1;
        // body
        ctx.fillStyle = COLORS.dummyBody;
        ctx.fillRect(d.x, y + 6 + wobble, d.w, d.h - 6);
        // head
        ctx.fillRect(d.x + 2, y + wobble, d.w - 4, 9);
        // headband
        ctx.fillStyle = COLORS.dummyBand;
        ctx.fillRect(d.x + 2, y + 2 + wobble, d.w - 4, 3);
        // eyes
        ctx.fillStyle = COLORS.dummyEye;
        var ex = d.vx > 0 ? d.x + d.w - 6 : d.x + 3;
        ctx.fillRect(ex, y + 5 + wobble, 3, 2);
    }

    function drawOffscreenIndicator(W, H, sc) {
        // point toward the nearest living dummy when none are visible
        var nearest = null, nearestDist = Infinity;
        var anyVisible = false;
        dummies.forEach(function (d) {
            if (d.dead) return;
            var y = d.platform.y - sc;
            if (y > -30 && y < H + 30) { anyVisible = true; return; }
            var dist = Math.abs(d.platform.y - (window.scrollY + H / 2));
            if (dist < nearestDist) { nearestDist = dist; nearest = d; }
        });
        if (anyVisible || !nearest) return;

        var below = nearest.platform.y > window.scrollY + H;
        var ax = Math.max(30, Math.min(W - 30, nearest.x));
        var ay = below ? H - 46 : 66;
        var dir = below ? 1 : -1;

        ctx.fillStyle = COLORS.accent;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 12 * dir);
        ctx.lineTo(ax - 8, ay);
        ctx.lineTo(ax + 8, ay);
        ctx.closePath();
        ctx.fill();
        ctx.font = "12px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = COLORS.text;
        ctx.fillText("dummy " + (below ? "below" : "above"), ax, below ? ay - 8 : ay + 26);
    }

    function draw() {
        var W = window.innerWidth, H = window.innerHeight;
        var sc = window.scrollY;
        ctx.clearRect(0, 0, W, H);

        // platforms (only those near the viewport)
        platforms.forEach(function (p) {
            var y = p.y - sc;
            if (y < -20 || y > H + 20) return;
            ctx.fillStyle = COLORS.platform;
            ctx.fillRect(p.x, y, p.w, 2);
        });

        // dummies
        dummies.forEach(function (d) {
            if (d.dead) return;
            var y = d.platform.y - sc;
            if (y < -60 || y > H + 60) return;
            drawDummy(d, sc);
        });

        // particles
        particles.forEach(function (pa) {
            ctx.globalAlpha = Math.max(pa.life, 0);
            ctx.fillStyle = pa.gold ? "#ffcc4d" : COLORS.accent;
            ctx.fillRect(pa.x, pa.docY - sc, 3, 3);
        });
        ctx.globalAlpha = 1;

        // player
        var px = player.x, py = player.docY - sc;
        var bobY = player.grounded ? Math.sin(frame * 0.08) * 1 : 0;

        // scarf trail
        ctx.fillStyle = COLORS.scarf;
        ctx.fillRect(px + (player.facing === 1 ? -6 : player.w), py + 8 + bobY + Math.sin(frame * 0.2) * 2, 6, 3);
        // body
        ctx.fillStyle = COLORS.body;
        ctx.fillRect(px, py + 10 + bobY, player.w, player.h - 10);
        // head
        ctx.fillRect(px + 3, py + bobY, player.w - 6, 12);
        // turban band
        ctx.fillStyle = COLORS.turban;
        ctx.fillRect(px + 3, py + bobY - 3, player.w - 6, 6);
        // eyes
        ctx.fillStyle = "#0f0a1f";
        var eyeX = player.facing === 1 ? px + player.w - 9 : px + 5;
        ctx.fillRect(eyeX, py + 5 + bobY, 3, 3);

        // sword
        ctx.fillStyle = COLORS.blade;
        if (player.slash > 0) {
            var ext = 30 * Math.sin((SLASH_FRAMES - player.slash) / SLASH_FRAMES * Math.PI);
            var bx = player.facing === 1 ? px + player.w : px - ext;
            ctx.fillRect(bx, py + 12 + bobY, ext, 3);
            ctx.strokeStyle = "rgba(168, 139, 255, 0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px + player.w / 2, py + 14 + bobY,
                ext + 4,
                player.facing === 1 ? -0.9 : Math.PI - 0.9,
                player.facing === 1 ? 0.9 : Math.PI + 0.9);
            ctx.stroke();
        } else {
            var rx = player.facing === 1 ? px + player.w - 1 : px - 9;
            ctx.fillRect(rx, py + 14 + bobY, 10, 2);
        }

        // stamina bar above head (flashes red when a swing is denied)
        var lowStam = player.stamina < SLASH_COST;
        ctx.fillStyle = "rgba(244, 241, 255, 0.18)";
        ctx.fillRect(px - 4, py - 12 + bobY, 30, 4);
        ctx.fillStyle = (player.denyFlash > 0 && frame % 8 < 4) ? COLORS.staminaLow
            : lowStam ? COLORS.staminaLow : COLORS.stamina;
        ctx.fillRect(px - 4, py - 12 + bobY, 30 * (player.stamina / 100), 4);

        // HUD
        ctx.font = "13px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = COLORS.text;
        ctx.fillText("dummies defeated: " + player.kills + " / " + dummies.length, W / 2, 30);

        // objective banner at game start
        if (bannerTimer > 0) {
            var ba = Math.min(1, bannerTimer / 40);
            ctx.globalAlpha = ba;
            ctx.fillStyle = "rgba(25, 18, 52, 0.92)";
            var bw = 460;
            ctx.fillRect(W / 2 - bw / 2, 52, bw, 64);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 1;
            ctx.strokeRect(W / 2 - bw / 2, 52, bw, 64);
            ctx.fillStyle = COLORS.accent;
            ctx.font = "15px 'IBM Plex Mono', monospace";
            ctx.fillText("OBJECTIVE", W / 2, 76);
            ctx.fillStyle = COLORS.text;
            ctx.font = "13px 'IBM Plex Mono', monospace";
            ctx.fillText("hunt down the 5 training dummies — X to slash", W / 2, 100);
            ctx.globalAlpha = 1;
        }

        drawOffscreenIndicator(W, H, sc);

        if (winTimer > 0) {
            ctx.font = "26px 'IBM Plex Mono', monospace";
            ctx.fillStyle = COLORS.accent;
            ctx.fillText("ALL DUMMIES DOWN — COMBO CLEARED!", W / 2, H / 2 - 20);
            ctx.font = "14px 'IBM Plex Mono', monospace";
            ctx.fillStyle = COLORS.text;
            ctx.fillText("nice hands. respawning targets...", W / 2, H / 2 + 8);
        }
    }

    /* ---------------- lifecycle ---------------- */

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        buildPlatforms();
        // re-anchor dummies to refreshed platform geometry
        dummies.forEach(function (d) {
            var best = null, bestDist = Infinity;
            platforms.forEach(function (p) {
                var dist = Math.abs(p.y - d.platform.y) + Math.abs(p.x - d.platform.x);
                if (dist < bestDist) { bestDist = dist; best = p; }
            });
            if (best) d.platform = best;
        });
    }

    function start() {
        active = true;
        canvas = document.createElement("canvas");
        canvas.id = "combo-game-canvas";
        document.body.appendChild(canvas);
        ctx = canvas.getContext("2d");

        info = document.createElement("div");
        info.className = "rd-game-info";
        info.innerHTML =
            '<span class="k">&larr; &rarr;</span> move &nbsp; <span class="k">&uarr;</span> jump<br>' +
            '<span class="k">X</span> sword slash (costs stamina)<br>' +
            'objective: defeat all 5 training dummies<br>' +
            'scroll to explore the page / follow the arrows<br>' +
            '<span class="k">esc</span> to quit';
        document.body.appendChild(info);

        resize();
        buildDummies();
        player.kills = 0;
        player.stamina = 100;
        bannerTimer = BANNER_FRAMES;
        respawn();

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("resize", resize);

        toggle.innerHTML = "&#9876; game mode: on";
        toggle.setAttribute("aria-pressed", "true");
        rafId = requestAnimationFrame(step);
    }

    function stop() {
        active = false;
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("resize", resize);
        if (canvas) { canvas.remove(); canvas = null; }
        if (info) { info.remove(); info = null; }
        keys = {};
        toggle.innerHTML = "&#9876; game mode: off";
        toggle.setAttribute("aria-pressed", "false");
    }

    toggle.addEventListener("click", function () {
        if (active) { stop(); } else { start(); }
    });
})();
