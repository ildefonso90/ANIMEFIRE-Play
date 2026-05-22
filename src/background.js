chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes("animefire.io/animes/")) {
    // Send message to content script to open the player
    chrome.tabs.sendMessage(tab.id, { action: "open_player" });
  }
});
