const state = {
  search: "",
  activePhases: new Set(),
  activeTopics: new Set(),
  sort: "score",
  bookmarks: new Set(JSON.parse(localStorage.getItem("ia-bookmarks") || "[]")),
};

const els = {
  cards: document.getElementById("cards"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  empty: document.getElementById("empty-state"),
  reset: document.getElementById("reset-filters"),
  phaseFilters: document.getElementById("phase-filters"),
  topicFilters: document.getElementById("topic-filters"),
  template: document.getElementById("card-template"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalSummary: document.getElementById("modal-summary"),
  modalPhase: document.getElementById("modal-phase"),
  modalTopics: document.getElementById("modal-topics"),
  modalOrganization: document.getElementById("modal-organization"),
  modalLink: document.getElementById("modal-link"),
  closeModal: document.getElementById("close-modal"),
  toggleTheme: document.getElementById("toggle-theme"),
  introModal: document.getElementById("intro-modal"),
  openIntro: document.getElementById("open-intro"),
  closeIntro: document.getElementById("close-intro"),
};

function applyTheme(mode) {
  if (mode === "dark") {
    document.documentElement.dataset.theme = "dark";
    els.toggleTheme.querySelector(".icon").textContent = "☀️";
    els.toggleTheme.querySelector(".label").textContent = "Mode clair";
  } else {
    delete document.documentElement.dataset.theme;
    els.toggleTheme.querySelector(".icon").textContent = "🌙";
    els.toggleTheme.querySelector(".label").textContent = "Mode sombre";
  }
}

applyTheme(localStorage.getItem("ia-theme"));

function renderFilters(list, container, activeSet) {
  container.innerHTML = "";
  list.forEach((label) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.textContent = label;
    button.dataset.value = label;
    button.setAttribute("aria-pressed", activeSet.has(label));
    button.addEventListener("click", () => {
      if (activeSet.has(label)) {
        activeSet.delete(label);
      } else {
        activeSet.add(label);
      }
      button.setAttribute("aria-pressed", activeSet.has(label));
      update();
    });
    container.appendChild(button);
  });
}

function matchesSearch(fiche, query) {
  if (!query) return true;
  const haystack = [
    fiche.title,
    fiche.summary,
    fiche.phase,
    fiche.organization,
    ...fiche.topics,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function matchesFilters(fiche) {
  if (state.activePhases.size && !state.activePhases.has(fiche.phase)) {
    return false;
  }
  if (
    state.activeTopics.size &&
    ![...state.activeTopics].every((topic) => fiche.topics.includes(topic))
  ) {
    return false;
  }
  return true;
}

function getScore(fiche) {
  const base = fiche.score;
  const topicBoost = [...state.activeTopics].reduce(
    (acc, topic) => (fiche.topics.includes(topic) ? acc + 0.5 : acc),
    0
  );
  const phaseBoost = state.activePhases.has(fiche.phase) ? 1 : 0;
  const searchBoost = state.search
    ? fiche.title.toLowerCase().startsWith(state.search.toLowerCase())
      ? 1
      : 0
    : 0;
  return base + topicBoost + phaseBoost + searchBoost;
}

function sortFiches(list) {
  const sorter = state.sort;
  return [...list].sort((a, b) => {
    if (sorter === "title") {
      return a.title.localeCompare(b.title, "fr");
    }
    if (sorter === "date") {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
    return getScore(b) - getScore(a);
  });
}

function update() {
  const filtered = fiches.filter(
    (fiche) => matchesSearch(fiche, state.search) && matchesFilters(fiche)
  );
  const sorted = sortFiches(filtered);

  els.cards.innerHTML = "";
  if (!sorted.length) {
    els.empty.hidden = false;
    return;
  }

  els.empty.hidden = true;
  const fragment = document.createDocumentFragment();

  sorted.forEach((fiche) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.querySelector(".card__phase").textContent = fiche.phase;
    node.querySelector(".card__title").textContent = fiche.title;
    node.querySelector(".card__summary").textContent = fiche.summary;
    node.querySelector(".card__organization").textContent = fiche.organization;

    const topicsContainer = node.querySelector(".card__topics");
    fiche.topics.forEach((topic) => {
      const span = document.createElement("span");
      span.className = "card__topic";
      span.textContent = topic;
      topicsContainer.appendChild(span);
    });

    const bookmarkButton = node.querySelector(".card__bookmark");
    bookmarkButton.setAttribute("aria-pressed", state.bookmarks.has(fiche.id));
    bookmarkButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleBookmark(fiche.id, bookmarkButton);
    });

    node.addEventListener("click", () => openFiche(fiche));
    fragment.appendChild(node);
  });

  els.cards.appendChild(fragment);
}

function toggleBookmark(id, button) {
  if (state.bookmarks.has(id)) {
    state.bookmarks.delete(id);
  } else {
    state.bookmarks.add(id);
  }
  button.setAttribute("aria-pressed", state.bookmarks.has(id));
  localStorage.setItem("ia-bookmarks", JSON.stringify([...state.bookmarks]));
}

function openFiche(fiche) {
  els.modalTitle.textContent = fiche.title;
  els.modalSummary.textContent = fiche.summary;
  els.modalPhase.textContent = fiche.phase;
  els.modalOrganization.textContent = fiche.organization;
  els.modalLink.href = encodeURI(fiche.link);

  els.modalTopics.innerHTML = "";
  fiche.topics.forEach((topic) => {
    const item = document.createElement("li");
    item.textContent = topic;
    els.modalTopics.appendChild(item);
  });

  if (typeof els.modal.showModal === "function") {
    els.modal.showModal();
  } else {
    window.open(fiche.link, "_blank");
  }
}

function closeModal() {
  els.modal.close();
}

function resetFilters() {
  state.activePhases.clear();
  state.activeTopics.clear();
  state.search = "";
  els.search.value = "";
  renderFilters(phases, els.phaseFilters, state.activePhases);
  renderFilters(topics, els.topicFilters, state.activeTopics);
  update();
}

els.search.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  update();
});

els.sort.addEventListener("change", (event) => {
  state.sort = event.target.value;
  update();
});

els.reset.addEventListener("click", resetFilters);

els.closeModal.addEventListener("click", closeModal);
els.modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal();
});

els.toggleTheme.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("ia-theme", next);
});

els.openIntro.addEventListener("click", () => {
  if (typeof els.introModal.showModal === "function") {
    els.introModal.showModal();
  }
});

els.closeIntro.addEventListener("click", () => {
  els.introModal.close();
});

els.introModal.addEventListener("cancel", (event) => {
  event.preventDefault();
  els.introModal.close();
});

renderFilters(phases, els.phaseFilters, state.activePhases);
renderFilters(topics, els.topicFilters, state.activeTopics);
update();
