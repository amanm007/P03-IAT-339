(function () {
  var slides = document.querySelectorAll(".video-slide");
  if (!slides.length) return;

  var lightbox = document.createElement("div");
  lightbox.className = "media-lightbox hidden";
  lightbox.innerHTML = "<button class=\"media-lightbox-close\" aria-label=\"Close media view\">&times;</button><img alt=\"Expanded media view\">";
  document.body.appendChild(lightbox);

  var lightboxImg = lightbox.querySelector("img");
  var closeBtn = lightbox.querySelector(".media-lightbox-close");

  function closeLightbox() {
    lightbox.classList.add("hidden");
    lightboxImg.removeAttribute("src");
  }

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "Expanded media view";
    lightbox.classList.remove("hidden");
  }

  closeBtn.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  for (var i = 0; i < slides.length; i++) {
    var slide = slides[i];
    if (slide.querySelector(".media-fullscreen-btn")) continue;

    var img = slide.querySelector("img[src]");
    if (!img) continue;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "media-fullscreen-btn";
    btn.setAttribute("aria-label", "Open image fullscreen");
    btn.innerHTML = "<i class=\"fa-solid fa-expand\" aria-hidden=\"true\"></i>";
    btn.addEventListener("click", (function (source, altText) {
      return function () { openLightbox(source, altText); };
    })(img.getAttribute("src"), img.getAttribute("alt")));
    slide.appendChild(btn);
  }
})();
