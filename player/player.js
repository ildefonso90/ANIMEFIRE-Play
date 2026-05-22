const state = {
  anime: null,
  currentEpisode: null,
  episodes: [],
  qualities: []
};

const els = {
  animeTitle: document.getElementById("anime-title"),
  episodeTitle: document.getElementById("episode-title"),
  openOriginal: document.getElementById("open-original"),
  video: document.getElementById("video"),
  placeholder: document.getElementById("video-placeholder"),
  status: document.getElementById("status"),
  poster: document.getElementById("poster"),
  episodeCount: document.getElementById("episode-count"),
  episodeList: document.getElementById("episode-list"),
  previous: document.getElementById("previous-episode"),
  next: document.getElementById("next-episode"),
  quality: document.getElementById("quality-select"),
  rate: document.getElementById("rate-select"),
  autoplay: document.getElementById("autoplay-toggle")
};

function setStatus(message, isError = false) {
  els.status.textContent = message || "";
  els.status.classList.toggle("error", isError);
}

function getSourceUrl() {
  const params = new URLSearchParams(location.search);
  const source = params.get("source");
  if (!source) {
    throw new Error("URL do anime nao foi informada.");
  }
  return new URL(source);
}

function getEpisodeFromUrl(url) {
  const match = url.pathname.match(/^\/animes\/([^/]+)\/(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    slug: match[1],
    number: Number(match[2])
  };
}

function getAnimePageUrl(sourceUrl) {
  const current = getEpisodeFromUrl(sourceUrl);
  if (current) {
    return new URL(`/animes/${current.slug}-todos-os-episodios`, sourceUrl.origin);
  }
  return sourceUrl;
}

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseAnimePage(html, animePageUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title =
    normalizeText(doc.querySelector(".div_anime_names h1")?.textContent) ||
    normalizeText(doc.querySelector("h1")?.textContent) ||
    normalizeText(doc.querySelector('meta[property="og:title"]')?.content)
      .replace(" - Todos os Episodios - AnimeFire", "")
      .replace(" - Todos os Epis&oacute;dios - AnimeFire", "") ||
    "Anime";

  const poster =
    doc.querySelector('meta[property="og:image"]')?.content ||
    doc.querySelector(".sub_animepage_img img")?.dataset.src ||
    "";

  const seen = new Set();
  const episodes = Array.from(doc.querySelectorAll('a[href*="/animes/"]'))
    .map((link) => {
      const url = new URL(link.getAttribute("href"), animePageUrl.href);
      const episode = getEpisodeFromUrl(url);
      if (!episode || seen.has(url.href)) {
        return null;
      }
      seen.add(url.href);
      return {
        number: episode.number,
        slug: episode.slug,
        url: url.href,
        label: normalizeText(link.textContent) || `Episodio ${episode.number}`
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);

  return {
    title,
    poster,
    episodes
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchEpisodeSources(episode) {
  const endpoint = `https://animefire.io/video/${episode.slug}/${episode.number}?${Date.now()}`;
  const response = await fetch(endpoint, {
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error(`Falha ao carregar o video: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.response?.status !== "200" || !Array.isArray(payload.data) || payload.data.length === 0) {
    throw new Error(payload?.response?.text || "O AnimeFire nao retornou fontes de video.");
  }

  return payload.data.map((source, index) => ({
    label: source.label || `Fonte ${index + 1}`,
    src: source.src
  }));
}

function renderAnime() {
  els.animeTitle.textContent = state.anime.title;
  els.poster.src = state.anime.poster;
  els.poster.alt = state.anime.title;
  els.episodeCount.textContent = `${state.episodes.length}`;
  els.episodeList.textContent = "";

  for (const episode of state.episodes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "episode-button";
    button.dataset.number = String(episode.number);
    button.innerHTML = `
      <span class="episode-number">${episode.number}</span>
      <span class="episode-name"></span>
    `;
    button.querySelector(".episode-name").textContent = episode.label;
    button.addEventListener("click", () => loadEpisode(episode));
    els.episodeList.appendChild(button);
  }
}

function getCurrentIndex() {
  return state.episodes.findIndex((episode) => episode.url === state.currentEpisode?.url);
}

function updateEpisodeUi() {
  const index = getCurrentIndex();
  for (const button of els.episodeList.querySelectorAll(".episode-button")) {
    button.classList.toggle(
      "is-active",
      Number(button.dataset.number) === state.currentEpisode?.number
    );
  }

  els.previous.disabled = index <= 0;
  els.next.disabled = index < 0 || index >= state.episodes.length - 1;
  els.openOriginal.href = state.currentEpisode?.url || getAnimePageUrl(getSourceUrl()).href;
}

function renderQualities() {
  const savedLabel = localStorage.getItem("afp-quality-label");
  els.quality.textContent = "";

  state.qualities.forEach((quality, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = quality.label;
    els.quality.appendChild(option);
  });

  const savedIndex = state.qualities.findIndex((quality) => quality.label === savedLabel);
  els.quality.value = String(savedIndex >= 0 ? savedIndex : state.qualities.length - 1);
}

function progressKey(episode) {
  return `afp-progress:${episode.url}`;
}

function restoreProgress(episode) {
  const raw = localStorage.getItem(progressKey(episode));
  const saved = raw ? Number(raw) : 0;
  if (saved > 5) {
    els.video.currentTime = saved;
  }
}

async function loadEpisode(episode) {
  state.currentEpisode = episode;
  state.qualities = [];
  updateEpisodeUi();
  setStatus("Carregando fontes do episodio...");
  els.placeholder.classList.add("is-hidden");
  els.episodeTitle.textContent = episode.label;
  els.video.poster = `https://animefire.io/img/video/${episode.slug}/${episode.number}.jpg`;

  try {
    state.qualities = await fetchEpisodeSources(episode);
    renderQualities();
    applySelectedQuality(false);
    setStatus("");
  } catch (error) {
    els.video.removeAttribute("src");
    els.video.load();
    els.placeholder.classList.remove("is-hidden");
    setStatus(`${error.message} Use "Abrir original" para ver no AnimeFire.`, true);
  }
}

function applySelectedQuality(keepTime = true) {
  const selected = state.qualities[Number(els.quality.value)];
  if (!selected) {
    return;
  }

  const currentTime = keepTime ? els.video.currentTime : 0;
  const shouldPlay = keepTime && !els.video.paused;
  localStorage.setItem("afp-quality-label", selected.label);

  els.video.src = selected.src;
  els.video.load();
  els.video.addEventListener(
    "loadedmetadata",
    () => {
      if (currentTime > 0 && currentTime < els.video.duration - 2) {
        els.video.currentTime = currentTime;
      } else if (!keepTime && state.currentEpisode) {
        restoreProgress(state.currentEpisode);
      }
      if (shouldPlay) {
        els.video.play().catch(() => {});
      }
    },
    { once: true }
  );
}

function loadSibling(offset) {
  const index = getCurrentIndex();
  const next = state.episodes[index + offset];
  if (next) {
    loadEpisode(next);
  }
}

async function init() {
  try {
    const sourceUrl = getSourceUrl();
    const animePageUrl = getAnimePageUrl(sourceUrl);
    const requestedEpisode = getEpisodeFromUrl(sourceUrl);

    els.openOriginal.href = sourceUrl.href;
    setStatus("Lendo lista de episodios...");

    const html = await fetchText(animePageUrl.href);
    state.anime = parseAnimePage(html, animePageUrl);
    state.episodes = state.anime.episodes;

    if (state.episodes.length === 0) {
      throw new Error("Nao encontrei episodios nesta pagina.");
    }

    renderAnime();
    setStatus("");

    const firstEpisode =
      state.episodes.find((episode) => episode.number === requestedEpisode?.number) ||
      state.episodes[0];
    await loadEpisode(firstEpisode);
  } catch (error) {
    els.animeTitle.textContent = "Nao foi possivel abrir o anime";
    els.episodeTitle.textContent = "";
    setStatus(error.message, true);
  }
}

els.quality.addEventListener("change", () => applySelectedQuality(true));
els.rate.addEventListener("change", () => {
  els.video.playbackRate = Number(els.rate.value);
});
els.previous.addEventListener("click", () => loadSibling(-1));
els.next.addEventListener("click", () => loadSibling(1));
els.video.addEventListener("timeupdate", () => {
  if (state.currentEpisode && els.video.currentTime > 0) {
    localStorage.setItem(progressKey(state.currentEpisode), String(Math.floor(els.video.currentTime)));
  }
});
els.video.addEventListener("ended", () => {
  if (els.autoplay.checked) {
    loadSibling(1);
  }
});

init();
