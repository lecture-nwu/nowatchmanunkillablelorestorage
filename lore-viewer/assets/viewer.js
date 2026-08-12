(function () {
  "use strict";

  const DATA_URL = "data/entries.json";

  const spineEl = document.getElementById("spine");
  const rosterList = document.getElementById("rosterList");
  const rosterTitle = document.getElementById("rosterTitle");
  const rosterDesc = document.getElementById("rosterDesc");
  const rosterCount = document.getElementById("rosterCount");
  const readerEmpty = document.getElementById("readerEmpty");
  const readerInner = document.getElementById("readerInner");

  let state = { collections: [], entries: [], activeCollection: null, activeEntry: null };

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  async function loadData() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      state.collections = Array.isArray(json.collections) ? json.collections : [];
      state.entries = Array.isArray(json.entries) ? json.entries : [];
      state.activeCollection = state.collections[0]?.id || null;
      renderSpine();
      renderRoster();
    } catch (err) {
      rosterList.innerHTML =
        '<li class="roster__empty">기록을 불러오지 못했습니다.<br><small>' +
        escapeHtml(err.message) + "</small></li>";
    }
  }

  function renderSpine() {
    spineEl.querySelectorAll(".spine__book").forEach((n) => n.remove());
    state.collections.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "spine__book" + (c.id === state.activeCollection ? " is-active" : "");
      btn.type = "button";
      btn.textContent = c.title;
      btn.setAttribute("aria-pressed", c.id === state.activeCollection);
      btn.addEventListener("click", () => {
        state.activeCollection = c.id;
        state.activeEntry = null;
        renderSpine();
        renderRoster();
        showEmptyReader();
      });
      spineEl.appendChild(btn);
    });
  }

  function renderRoster() {
    const collection = state.collections.find((c) => c.id === state.activeCollection);
    rosterTitle.textContent = collection ? collection.title : "기록 보관소";
    rosterDesc.textContent = collection ? collection.description || "" : "문서철을 선택해 기록을 열람하세요.";

    const items = state.entries
      .filter((e) => e.collectionId === state.activeCollection)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    rosterCount.textContent = items.length + "건";
    rosterList.innerHTML = "";

    if (items.length === 0) {
      rosterList.innerHTML = '<li class="roster__empty">이 문서철에는 아직 기록이 없습니다.</li>';
      return;
    }

    items.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "entry-item" + (entry.id === state.activeEntry ? " is-active" : "");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.innerHTML =
        '<div class="entry-item__idx">RECORD ' + String(i + 1).padStart(2, "0") + "</div>" +
        '<div class="entry-item__title">' + escapeHtml(entry.title) + "</div>" +
        (entry.subtitle ? '<div class="entry-item__sub">' + escapeHtml(entry.subtitle) + "</div>" : "");
      const open = () => {
        state.activeEntry = entry.id;
        renderRoster();
        renderReader(entry);
      };
      li.addEventListener("click", open);
      li.addEventListener("keypress", (e) => { if (e.key === "Enter") open(); });
      rosterList.appendChild(li);
    });
  }

  function showEmptyReader() {
    readerEmpty.style.display = "flex";
    readerInner.style.display = "none";
  }

  function renderReader(entry) {
    readerEmpty.style.display = "none";
    readerInner.style.display = "block";

    const collection = state.collections.find((c) => c.id === entry.collectionId);
    const paragraphs = String(entry.body || "")
      .split(/\n{2,}/)
      .map((p) => "<p>" + escapeHtml(p).replace(/\n/g, "<br>") + "</p>")
      .join("");

    readerInner.innerHTML =
      '<div class="reader__eyebrow">' + escapeHtml(collection ? collection.title : "") + "</div>" +
      '<h2 class="reader__title">' + escapeHtml(entry.title) + "</h2>" +
      (entry.subtitle ? '<p class="reader__subtitle">' + escapeHtml(entry.subtitle) + "</p>" : "") +
      inscriptionSVG() +
      '<div class="reader__body">' + paragraphs + "</div>" +
      '<div class="reader__footer"><span>' + escapeHtml(entry.id) + '</span><span>END OF RECORD</span></div>';

    readerInner.scrollTop = 0;
    document.getElementById("reader").scrollTop = 0;
  }

  function inscriptionSVG() {
    return (
      '<svg class="inscription" viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 11 L120 11 L128 4 L136 18 L144 11 L300 11" />' +
      '<circle cx="136" cy="18" r="2.5" />' +
      "</svg>"
    );
  }

  loadData();
})();
