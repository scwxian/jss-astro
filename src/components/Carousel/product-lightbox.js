// Product image lightbox controller; DOM pre-rendered by ProductCarousel.astro.
let lightboxCleanup = null;
let appendedBackdrop = null;

document.addEventListener("astro:before-swap", () => {
  lightboxCleanup?.abort();
  lightboxCleanup = null;
  // Remove backdrop previously escaped to body (prevents duplicates across navigations)
  if (appendedBackdrop?.parentNode) {
    appendedBackdrop.remove();
  }
  appendedBackdrop = null;
  document.body.style.overflow = "";
});

document.addEventListener("astro:page-load", () => {
  lightboxCleanup?.abort();
  lightboxCleanup = new AbortController();
  const { signal } = lightboxCleanup;

  const backdrop = document.getElementById("product-lightbox");
  if (!backdrop) return;
  // Escape stacking context traps (transforms, filters, overflow) from parent containers
  document.body.appendChild(backdrop);
  appendedBackdrop = backdrop;

  let slides = [];
  try {
    slides = JSON.parse(backdrop.dataset.lightboxImages || "[]");
  } catch {
    return;
  }
  if (!slides.length) return;

  const image = backdrop.querySelector(".product-lightbox-image");
  const closeBtn = backdrop.querySelector(".product-lightbox-close");
  const prevBtn = backdrop.querySelector(".product-lightbox-arrow.prev");
  const nextBtn = backdrop.querySelector(".product-lightbox-arrow.next");
  const dots = Array.from(backdrop.querySelectorAll(".product-lightbox-dot"));
  if (!image) return;

  let currentIdx = 0;

  function showSlide(idx) {
    if (idx < 0) idx = slides.length - 1;
    if (idx >= slides.length) idx = 0;
    currentIdx = idx;
    image.src = slides[idx].src;
    image.alt = slides[idx].alt;
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
  }

  function open(idx) {
    showSlide(idx);
    backdrop.classList.add("visible");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, { signal });
  }

  function close() {
    backdrop.classList.remove("visible");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
  }

  function navigate(dir) {
    showSlide(currentIdx + dir);
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") navigate(-1);
    if (e.key === "ArrowRight") navigate(1);
  }

  closeBtn?.addEventListener("click", close, { signal });
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  }, { signal });
  prevBtn?.addEventListener("click", () => navigate(-1), { signal });
  nextBtn?.addEventListener("click", () => navigate(1), { signal });
  dots.forEach((dot, i) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      showSlide(i);
    }, { signal });
  });

  // Direct click handlers on each image slide in the carousel light DOM
  document.querySelectorAll("[data-lightbox-slide]").forEach((slideEl) => {
    slideEl.addEventListener("click", (e) => {
      const idx = parseInt(slideEl.dataset.lightboxSlide, 10);
      if (Number.isNaN(idx)) return;
      e.preventDefault();
      open(idx);
    }, { signal });
  });
});
