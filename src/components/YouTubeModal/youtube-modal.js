  if (!document.body.dataset.ytModalGlobalInit) {
    document.body.dataset.ytModalGlobalInit = "true";

    let modal = null;
    let activeTrigger = null;
    let boundDialog = null;

    function closeModal() {
      if (!modal) return;
      if (modal.matches(":popover-open")) modal.hidePopover();
      modal.classList.remove("visible");
      const iframe = modal.querySelector(".yt-modal-iframe");
      if (iframe) iframe.src = "";
      activeTrigger = null;
      document.removeEventListener("keydown", onEscape);
    }

    function onEscape(e) {
      if (e.key === "Escape") closeModal();
    }

    function openModal(videoId, playlistId, rawTitle) {
      const openDialog = document.querySelector('dialog[open]');
      const container = openDialog || document.body;

      // Sync dialog close listener when container changes
      if (boundDialog !== openDialog) {
        if (boundDialog) boundDialog.removeEventListener("close", closeModal);
        boundDialog = openDialog || null;
        if (boundDialog) boundDialog.addEventListener("close", closeModal);
      }

      if (modal) {
        if (!modal.isConnected || modal.parentNode !== container) {
          if (modal.matches(':popover-open')) modal.hidePopover();
          modal.remove();
          modal = null;
        }
      }

      if (!modal) {
        modal = document.createElement("div");
        modal.id = "global-youtube-modal";
        modal.className = "youtube-modal";
        modal.popover = "manual";
        modal.innerHTML = `
          <div class="youtube-modal-header">
            <span class="youtube-modal-title yt-modal-title"></span>
            <button class="youtube-modal-close yt-modal-close" aria-label="Close video">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="youtube-modal-content">
            <iframe
              class="yt-modal-iframe"
              src=""
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        `;
        container.appendChild(modal);
        modal.querySelector(".yt-modal-close").addEventListener("click", (e) => {
          e.stopPropagation();
          closeModal();
        });
      }

      modal.querySelector(".yt-modal-title").textContent = rawTitle;

      let embedSrc = "";
      if (videoId) {
        const controlParam = playlistId ? "" : "&controls=0";
        embedSrc = `https://www.youtube.com/embed/${videoId}?rel=0${controlParam}${playlistId ? `&list=${playlistId}` : ''}`;
      } else if (playlistId) {
        embedSrc = `https://www.youtube.com/embed/?listType=playlist&list=${playlistId}`;
      }
      modal.querySelector(".yt-modal-iframe").src = embedSrc;

      if (!modal.matches(":popover-open")) modal.showPopover();
      requestAnimationFrame(() => modal.classList.add("visible"));
      document.addEventListener("keydown", onEscape);
    }

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest(".youtube-trigger");
      if (!trigger) return;

      const videoId = trigger.dataset.youtubeId;
      const playlistId = trigger.dataset.playlistId || "";
      if (!videoId && !playlistId) return;

      if (modal && modal.matches(":popover-open") && trigger === activeTrigger) {
        closeModal();
        return;
      }

      activeTrigger = trigger;
      const rawTitle = trigger.dataset.modalTitle || "Now Playing";
      openModal(videoId, playlistId, rawTitle);
    });
  }
