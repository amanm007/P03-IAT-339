/* ==========================================================================
   lazy-video.js — defer video downloads until they're actually needed
   Project pages ship several muted/looping preview videos (mechanics
   sliders, overview clips). With plain `autoplay`, browsers start
   fetching and playing every one of them the moment the page loads,
   including the ones sitting in a slider behind display:none — several
   large clips competing for bandwidth at once, which is what makes the
   page feel slow.

   The fix: videos ship with `preload="none"` and their real file on
   `<source data-src>` instead of `src`, so nothing downloads at parse
   time. This script assigns the real src and starts playback only once
   a video's container actually scrolls into view, and — for videos
   inside a .video-slide — only for the slide that's currently visible
   (the existing slide() functions in each page just toggle inline
   style.display; a MutationObserver here reacts to that with no
   changes needed to that code).
   ========================================================================== */

(function () {
    "use strict";

    var videos = Array.prototype.slice.call(document.querySelectorAll("video"));
    if (!videos.length) return;

    function activateSource(video) {
        if (video.dataset.lazyLoaded === "1") return;
        var sources = video.querySelectorAll("source[data-src]");
        if (!sources.length) return;
        sources.forEach(function (s) {
            s.src = s.getAttribute("data-src");
            s.removeAttribute("data-src");
        });
        video.dataset.lazyLoaded = "1";
        video.load();
    }

    function tryPlay(video) {
        activateSource(video);
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
    }

    // standalone videos (hero clips, overview embeds): play once visible,
    // pause when scrolled away so they stop competing for bandwidth/CPU
    var standalone = videos.filter(function (v) { return !v.closest(".video-slide"); });

    if (standalone.length) {
        if ("IntersectionObserver" in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) tryPlay(entry.target);
                    else entry.target.pause();
                });
            }, { threshold: 0.25 });
            standalone.forEach(function (v) { io.observe(v); });
        } else {
            standalone.forEach(tryPlay);
        }
    }

    // slider videos: only the currently active (visible) slide should
    // hold a loaded, playing video — everything else stays dormant
    var sliderVideos = videos.filter(function (v) { return v.closest(".video-slide"); });
    if (!sliderVideos.length) return;

    function isVisible(slide) {
        return slide && slide.style.display !== "none";
    }

    function refreshSliderVideos() {
        sliderVideos.forEach(function (v) {
            var slide = v.closest(".video-slide");
            if (isVisible(slide)) tryPlay(v);
            else v.pause();
        });
    }

    refreshSliderVideos();

    if ("MutationObserver" in window) {
        var slideEls = Array.prototype.slice.call(document.querySelectorAll(".video-slide"));
        var mo = new MutationObserver(refreshSliderVideos);
        slideEls.forEach(function (el) {
            mo.observe(el, { attributes: true, attributeFilter: ["style"] });
        });
    }
})();
