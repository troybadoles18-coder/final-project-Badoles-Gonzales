const genres = ["Action", "Adventure", "Comedy", "Fantasy", "Romance"];

const API_URL = "https://graphql.anilist.co";

const genreSections = document.getElementById("genre-sections");
const search = document.getElementById("search");
const statusText = document.getElementById("status");

let allAnime = [];
let watchlist = JSON.parse(localStorage.getItem("aniscope-watchlist") || "[]");

let selectedAnime = null;

// CLEAN ANIME DESCRIPTION
function cleanSynopsis(text) {
  if (!text) return "No description available.";

  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// FETCH ANIME FROM ANILIST
async function fetchAnime(genre) {
  const query = `
    query ($genre: String) {
      Page(page: 1, perPage: 30) {
        media(
          type: ANIME,
          genre: $genre,
          sort: [POPULARITY_DESC, SCORE_DESC],
          isAdult: false
        ) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          averageScore
          seasonYear
          format
          description(asHtml: false)
        }
      }
    }
  `;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { genre },
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to connect to anime database.");
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data.Page.media;
}

// LOAD 30 ANIME PER GENRE
async function loadAnime() {
  statusText.textContent = "Loading anime and covers...";
  genreSections.innerHTML = "";
  allAnime = [];

  let successfulGenres = 0;

  for (const genre of genres) {
    try {
      const results = await fetchAnime(genre);

      const animeList = results.map((anime) => ({
        id: anime.id,
        title: anime.title.english || anime.title.romaji,
        image: anime.coverImage.large,
        genre: genre,
        year: anime.seasonYear || "Unknown",
        rating: anime.averageScore ? anime.averageScore / 10 : "N/A",
        type: anime.format || "Anime",
        synopsis: cleanSynopsis(anime.description),
      }));

      allAnime.push(...animeList);

      renderGenre(genre, animeList);
      successfulGenres++;
    } catch (error) {
      console.error(`Error loading ${genre}:`, error);

      genreSections.innerHTML += `
        <section class="genre-section">
          <h2>${genre} Anime</h2>
          <p>Unable to load this genre. Please try again.</p>
        </section>
      `;
    }
  }

  statusText.textContent = `Loaded ${allAnime.length} anime from ${successfulGenres} genres.`;

  renderWatchlist();
}

// CREATE ANIME CARD WITH COVER
function createCard(anime) {
  const saved = watchlist.some((item) => item.id === anime.id);

  return `
    <article class="anime-card">
      <img
        src="${anime.image}"
        alt="${anime.title}"
        loading="lazy"
        onerror="this.src='https://placehold.co/300x420/30294b/ffffff?text=No+Cover'"
      >

      <div class="card-info">
        <h3>${anime.title}</h3>
        <p>⭐ ${anime.rating}</p>
        <p>${anime.type} | ${anime.year}</p>

        <button onclick="showDetails(${anime.id})">
          View Details
        </button>

        <button onclick="toggleWatchlist(${anime.id})">
          ${saved ? "Remove from Watchlist" : "Add to Watchlist"}
        </button>
      </div>
    </article>
  `;
}

// DISPLAY GENRE
function renderGenre(name, animeList) {
  genreSections.innerHTML += `
    <section class="genre-section">
      <h2>${name} Anime (${animeList.length})</h2>

      <div class="anime-grid">
        ${animeList.map(createCard).join("")}
      </div>
    </section>
  `;
}

// SEARCH ANIME
search.addEventListener("input", function () {
  const query = search.value.toLowerCase();

  document.querySelectorAll("#genre-sections .anime-card").forEach((card) => {
    const title = card.querySelector("h3").textContent.toLowerCase();

    card.style.display = title.includes(query) ? "" : "none";
  });
});

// VIEW ANIME DETAILS
function showDetails(id) {
  selectedAnime = allAnime.find((anime) => anime.id === id);

  if (!selectedAnime) return;

  document.getElementById("modal-image").src = selectedAnime.image;

  document.getElementById("modal-title").textContent = selectedAnime.title;

  document.getElementById("modal-info").textContent =
    `${selectedAnime.genre} | ${selectedAnime.type} | ` +
    `${selectedAnime.year} | Rating: ${selectedAnime.rating}`;

  // CLEAN DESCRIPTION BEFORE DISPLAYING
  document.getElementById("modal-synopsis").textContent = cleanSynopsis(
    selectedAnime.synopsis,
  );

  updateModalButton();

  document.getElementById("anime-modal").classList.add("show");
}

// UPDATE MODAL BUTTON
function updateModalButton() {
  const saved = watchlist.some((item) => item.id === selectedAnime.id);

  document.getElementById("modal-watchlist-btn").textContent = saved
    ? "Remove from Watchlist"
    : "Add to Watchlist";
}

// ADD OR REMOVE WATCHLIST
function toggleWatchlist(id) {
  const anime = allAnime.find((item) => item.id === id);

  if (!anime) return;

  const exists = watchlist.some((item) => item.id === id);

  if (exists) {
    watchlist = watchlist.filter((item) => item.id !== id);
  } else {
    watchlist.push(anime);
  }

  localStorage.setItem("aniscope-watchlist", JSON.stringify(watchlist));

  renderWatchlist();
  renderAllGenres();

  if (selectedAnime) {
    updateModalButton();
  }
}

// REFRESH ANIME CARDS
function renderAllGenres() {
  genreSections.innerHTML = "";

  genres.forEach((genre) => {
    const animeList = allAnime.filter((anime) => anime.genre === genre);

    if (animeList.length) {
      renderGenre(genre, animeList);
    }
  });
}

// DISPLAY WATCHLIST
function renderWatchlist() {
  const grid = document.getElementById("watchlist-grid");
  const empty = document.getElementById("empty-watchlist");

  grid.innerHTML = watchlist
    .map(
      (anime) => `
    <article class="anime-card">
      <img
        src="${anime.image}"
        alt="${anime.title}"
        loading="lazy"
      >

      <div class="card-info">
        <h3>${anime.title}</h3>
        <p>${anime.genre} | ⭐ ${anime.rating}</p>

        <button onclick="showDetails(${anime.id})">
          View Details
        </button>

        <button onclick="toggleWatchlist(${anime.id})">
          Remove
        </button>
      </div>
    </article>
  `,
    )
    .join("");

  empty.style.display = watchlist.length ? "none" : "block";
}

// CLOSE MODAL
document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("anime-modal").classList.remove("show");
});

// MODAL WATCHLIST BUTTON
document.getElementById("modal-watchlist-btn").addEventListener("click", () => {
  if (selectedAnime) {
    toggleWatchlist(selectedAnime.id);
  }
});

// CLOSE MODAL WHEN CLICKING OUTSIDE
document.getElementById("anime-modal").addEventListener("click", (event) => {
  if (event.target.id === "anime-modal") {
    event.currentTarget.classList.remove("show");
  }
});

// START ANISCOPE
loadAnime();
