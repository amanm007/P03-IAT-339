/* ==========================================================================
   redesign.js — one-pager interactions
   Typewriter hero, hide-on-scroll navbar, fade-in sections, experience
   tabs, mobile menu. No dependencies.
   ========================================================================== */

(function () {
    "use strict";

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------------- Typewriter: "aman here." ---------------- */

    (function typewriter() {
        var el = document.getElementById("typed-name");
        if (!el) return;

        var text = "aman here.";
        if (reducedMotion) {
            el.textContent = text;
            return;
        }

        var i = 0;
        function type() {
            if (i <= text.length) {
                el.textContent = text.slice(0, i);
                i++;
                setTimeout(type, i === 1 ? 400 : 95);
            }
        }
        type();
    })();

    /* ---------------- Navbar: shrink + hide on scroll down ---------------- */

    (function navbar() {
        var nav = document.getElementById("rd-nav");
        if (!nav) return;

        var lastY = window.scrollY;
        var ticking = false;

        function onScroll() {
            var y = window.scrollY;
            nav.classList.toggle("is-scrolled", y > 40);

            // hide when scrolling down past the hero, reveal on scroll up
            if (y > 300 && y > lastY + 4) {
                nav.classList.add("is-hidden");
            } else if (y < lastY - 4) {
                nav.classList.remove("is-hidden");
            }
            lastY = y;
            ticking = false;
        }

        window.addEventListener("scroll", function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(onScroll);
            }
        }, { passive: true });
    })();

    /* ---------------- Mobile menu ---------------- */

    (function mobileMenu() {
        var toggle = document.getElementById("rd-nav-toggle");
        var links = document.getElementById("rd-nav-links");
        if (!toggle || !links) return;

        toggle.addEventListener("click", function () {
            var open = links.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });

        links.addEventListener("click", function (e) {
            if (e.target.closest("a")) {
                links.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            }
        });
    })();

    /* ---------------- Fade-in sections ---------------- */

    (function fadeIns() {
        var sections = document.querySelectorAll(".fade-in-section");
        if (!sections.length) return;

        if (reducedMotion || !("IntersectionObserver" in window)) {
            sections.forEach(function (s) { s.classList.add("is-visible"); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px -12% 0px" });

        sections.forEach(function (s) { io.observe(s); });
    })();

    /* ---------------- Projects slider ---------------- */

    (function slider() {
        var sliderEl = document.getElementById("project-slider");
        var dotsEl = document.getElementById("slider-dots");
        if (!sliderEl || !dotsEl) return;

        var slides = Array.prototype.slice.call(sliderEl.querySelectorAll(".rd-slide"));
        if (slides.length < 2) return;

        var current = 0;
        var dots = slides.map(function (_, i) {
            var b = document.createElement("button");
            b.setAttribute("role", "tab");
            b.setAttribute("aria-label", "Show project " + (i + 1));
            b.addEventListener("click", function () { go(i); });
            dotsEl.appendChild(b);
            return b;
        });

        function go(i) {
            current = (i + slides.length) % slides.length;
            slides.forEach(function (s, idx) {
                s.classList.toggle("is-active", idx === current);
            });
            dots.forEach(function (d, idx) {
                d.classList.toggle("is-active", idx === current);
                d.setAttribute("aria-selected", idx === current ? "true" : "false");
            });
        }

        document.getElementById("slider-prev").addEventListener("click", function () { go(current - 1); });
        document.getElementById("slider-next").addEventListener("click", function () { go(current + 1); });

        sliderEl.addEventListener("keydown", function (e) {
            if (e.key === "ArrowLeft") go(current - 1);
            if (e.key === "ArrowRight") go(current + 1);
        });

        go(0);
    })();

    /* ---------------- Interactive avatar states ---------------- */

    (function avatarStates() {
        var stage = document.getElementById("avatar-stage");
        if (!stage) return;

        var cta = document.querySelector(".rd-cta");
        var resumeBtn = document.querySelector(".rd-resume-btn");
        var STATES = ["about", "experience", "projects", "contact", "resume"];

        function setState(name) {
            STATES.forEach(function (s) {
                stage.classList.toggle("is-" + s, s === name);
            });
            if (cta) cta.classList.toggle("is-glow", name === "contact");
            if (resumeBtn) resumeBtn.classList.toggle("is-glow", name === "resume");
        }

        function stateFor(link) {
            var href = link.getAttribute("href") || "";
            if (link.classList.contains("rd-resume-btn")) return "resume";
            var m = href.match(/#(about|experience|projects|contact)$/);
            return m ? m[1] : null;
        }

        var hoverable = window.matchMedia("(hover: hover)").matches;

        document.querySelectorAll(".rd-nav-links a").forEach(function (link) {
            var state = stateFor(link);
            if (!state) return;

            if (hoverable) {
                link.addEventListener("mouseenter", function () { setState(state); });
                link.addEventListener("mouseleave", function () { setState(null); });
            }
            // keyboard parity on all devices
            link.addEventListener("focus", function () { setState(state); });
            link.addEventListener("blur", function () { setState(null); });
        });

        // touch devices: tapping the avatar cycles through the states
        if (!hoverable) {
            var idx = -1;
            stage.addEventListener("click", function () {
                idx = (idx + 1) % (STATES.length + 1);
                setState(idx === STATES.length ? null : STATES[idx]);
            });
        }
    })();

    /* ---------------- Avatar cursor-tilt parallax ----------------
       Writes --mx / --my (-1..1) onto the stage; redesign.css tilts the
       figure toward the cursor and drifts the blob/shadow the other way. */

    (function tiltParallax() {
        var stage = document.getElementById("avatar-stage");
        if (!stage) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (!window.matchMedia("(hover: hover)").matches) return;
        if (window.innerWidth < 860) return;

        var tx = 0, ty = 0;   // target (cursor)
        var cx = 0, cy = 0;   // eased current value
        var raf = null;

        function frame() {
            cx += (tx - cx) * 0.08;
            cy += (ty - cy) * 0.08;
            stage.style.setProperty("--mx", cx.toFixed(4));
            stage.style.setProperty("--my", cy.toFixed(4));
            if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) {
                raf = requestAnimationFrame(frame);
            } else {
                raf = null;
            }
        }

        function kick() {
            if (!raf) raf = requestAnimationFrame(frame);
        }

        window.addEventListener("mousemove", function (e) {
            tx = (e.clientX / window.innerWidth) * 2 - 1;
            ty = (e.clientY / window.innerHeight) * 2 - 1;
            kick();
        }, { passive: true });

        // settle back to center when the cursor leaves the window
        document.documentElement.addEventListener("mouseleave", function () {
            tx = 0;
            ty = 0;
            kick();
        });
    })();

    /* ---------------- Experience tabs ---------------- */

    (function tabs() {
        var tabs = Array.prototype.slice.call(document.querySelectorAll(".rd-exp-tab"));
        var panels = Array.prototype.slice.call(document.querySelectorAll(".rd-exp-panel"));
        if (!tabs.length) return;

        function activate(tab) {
            tabs.forEach(function (t) {
                var active = t === tab;
                t.classList.toggle("is-active", active);
                t.setAttribute("aria-selected", active ? "true" : "false");
            });
            panels.forEach(function (p) {
                p.classList.toggle("is-active", p.id === tab.getAttribute("aria-controls"));
            });
        }

        tabs.forEach(function (tab, idx) {
            tab.addEventListener("click", function () { activate(tab); });
            tab.addEventListener("keydown", function (e) {
                var dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 :
                          e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                if (!dir) return;
                e.preventDefault();
                var next = tabs[(idx + dir + tabs.length) % tabs.length];
                next.focus();
                activate(next);
            });
        });
    })();
})();
