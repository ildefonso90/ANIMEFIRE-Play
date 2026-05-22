// Content script for AnimeFire
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_player") {
    // Basic logic to find the video player and open it in a custom window/modal
    console.log("AnimeFire Player activation message received.");
    
    // Example: Create a rudimentary mock UI for a custom player representation
    const playerContainer = document.createElement("div");
    playerContainer.id = "custom-animefire-player";
    
    const title = document.createElement("h2");
    title.innerText = "AnimeFire Player - Modo Organizado";
    
    const closeButton = document.createElement("button");
    closeButton.innerText = "Fechar";
    closeButton.onclick = () => playerContainer.remove();
    
    playerContainer.appendChild(title);
    playerContainer.appendChild(closeButton);
    
    document.body.appendChild(playerContainer);
  }
});
