const ANIMEFIRE_HOSTS = new Set(["animefire.io", "www.animefire.io"]);

function isAnimeFireUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ANIMEFIRE_HOSTS.has(url.hostname) && url.pathname.startsWith("/animes/");
  } catch {
    return false;
  }
}

function openPlayer(sourceUrl) {
  const playerUrl = chrome.runtime.getURL(
    `player/player.html?source=${encodeURIComponent(sourceUrl)}`
  );

  return chrome.windows.create({
    url: playerUrl,
    type: "popup",
    width: 1180,
    height: 760,
    focused: true
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AF_OPEN_PLAYER" || !isAnimeFireUrl(message.url)) {
    return false;
  }

  openPlayer(message.url)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.action.onClicked.addListener((tab) => {
  if (tab?.url && isAnimeFireUrl(tab.url)) {
    openPlayer(tab.url);
  }
});
