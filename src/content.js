(function initAnimeFireLauncher() {
  const BUTTON_ID = "af-player-launcher";
  const PATH_PATTERN = /^\/animes\/[^/]+(?:\/\d+)?$/;

  function shouldShow() {
    return location.hostname.endsWith("animefire.io") && PATH_PATTERN.test(location.pathname);
  }

  function createButton() {
    if (!shouldShow() || document.getElementById(BUTTON_ID)) {
      return;
    }

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.title = "Abrir este anime no player da extensao";
    button.innerHTML = '<span class="af-player-launcher-icon">AF</span><span>Abrir player</span>';

    button.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "AF_OPEN_PLAYER",
        url: location.href
      });
    });

    document.documentElement.appendChild(button);
  }

  createButton();

  let previousPath = location.pathname;
  const observer = new MutationObserver(() => {
    if (previousPath !== location.pathname) {
      previousPath = location.pathname;
      document.getElementById(BUTTON_ID)?.remove();
    }
    createButton();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
