/* ==========================================================================
   cursor.js — gamified reticle cursor
   Accent dot that tracks the pointer exactly, inside a crosshair ring that
   trails with easing. The ring "locks on" (grows + quarter-turn) over
   anything clickable and squeezes on press. Fine-pointer devices only;
   touch, reduced-motion, and no-JS visitors keep the native cursor.
   Styles live in css/redesign.css under "Custom reticle cursor".
   ========================================================================== */

(function () {
    "use strict";

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var wrap = document.createElement("div");
    wrap.className = "rd-cursor";
    wrap.setAttribute("aria-hidden", "true");
    var ring = document.createElement("div");
    ring.className = "rd-cursor-ring";
    wrap.appendChild(ring);

    var dot = document.createElement("div");
    dot.className = "rd-cursor-dot";
    dot.setAttribute("aria-hidden", "true");

    document.body.appendChild(wrap);
    document.body.appendChild(dot);
    document.documentElement.classList.add("rd-cursor-on");

    var CLICKABLE = "a, button, [role='button'], input, select, textarea, label, summary";
    var NATIVE = "video, input, textarea, select";   // keep the native cursor here

    var tx = -100, ty = -100;   // pointer position (dot snaps to it)
    var rx = -100, ry = -100;   // eased ring position
    var raf = null, shown = false, overNative = false;

    function frame() {
        rx += (tx - rx) * 0.22;
        ry += (ty - ry) * 0.22;
        wrap.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
        if (Math.abs(tx - rx) + Math.abs(ty - ry) > 0.15) {
            raf = requestAnimationFrame(frame);
        } else {
            raf = null;
        }
    }

    function setVisible(on) {
        wrap.classList.toggle("is-on", on);
        dot.classList.toggle("is-on", on);
    }

    window.addEventListener("mousemove", function (e) {
        tx = e.clientX;
        ty = e.clientY;
        dot.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
        if (!shown) {
            shown = true;
            rx = tx;
            ry = ty;
            setVisible(!overNative);
        }
        if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });

    document.addEventListener("mouseover", function (e) {
        wrap.classList.toggle("is-lock", !!e.target.closest(CLICKABLE));
        overNative = !!e.target.closest(NATIVE);
        if (shown) setVisible(!overNative);
    });

    document.addEventListener("mousedown", function () { wrap.classList.add("is-down"); });
    document.addEventListener("mouseup", function () { wrap.classList.remove("is-down"); });

    // hide when the pointer leaves the window, restore when it returns
    document.documentElement.addEventListener("mouseleave", function () { setVisible(false); });
    document.documentElement.addEventListener("mouseenter", function () {
        if (shown && !overNative) setVisible(true);
    });
})();
