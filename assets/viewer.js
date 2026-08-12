(function () {
  "use strict";

  const DATA_URL = "data/entries.json";
  const ADMIN_PASSWORD = "lore-admin-2026"; // 정적 사이트라 완벽한 보안은 아니며, 우연한 접근을 막는 용도입니다.

  const LS_USER = "loreArchive.user";
  const LS_FAVORITES = "loreArchive.favorites";
  const LS_ADMIN_AUTH = "loreArchive.adminAuth";

  const spineEl = document.getElementById("spine");
  const rosterList = document.getElementById("rosterList");
  const rosterTitle = document.getElementById("rosterTitle");
  const rosterDesc = document.getElementById("rosterDesc");
  const rosterCount = document.getElementById("rosterCount");
  const readerEmpty = document.getElementById("readerEmpty");
  const readerInner = document.getElementById("readerInner");

  const edgeTrigger = document.getElementById("edgeTrigger");
  const sideMenu = document.getElementById("sideMenu");
  const sideMenuTab = document.getElementById("sideMenuTab");
  const sideMenuUser = document.getElementById("sideMenuUser");
  const btnLogin = document.getElementById("btnLogin");
  const btnFavorites = document.getElementById("btnFavorites");
  const btnTags = document.getElementById("btnTags");
  const btnAdmin = document.getElementById("btnAdmin");

  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalInput = document.getElementById("modalInput");
  const modalError = document.getElementById("modalError");
  const modalCancel = document.getElementById("modalCancel");
  const modalConfirm = document.getElementById("modalConfirm");

  let state = {
    collections: [],
    entries: [],
    activeCollection: null,
    activeEntry: null,
    viewMode: "collection", // 'collection' | 'favorites' | 'tags'
    activeTag: null,
    user: null,
    favorites: new Set(),
  };

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  if (window.marked) marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(md) {
    const raw = window.marked
      ? marked.parse(String(md ?? ""))
      : "<p>" + escapeHtml(md).replace(/\n/g, "<br>") + "</p>";
    return window.DOMPurify ? DOMPurify.sanitize(raw) : raw;
  }

  // ---------- 좌측 끝 호버 메뉴 ----------
  function openSideMenu() { sideMenu.classList.add("is-open"); }
  function closeSideMenu() { sideMenu.classList.remove("is-open"); }
  function toggleSideMenu() { sideMenu.classList.toggle("is-open"); }

  edgeTrigger.addEventListener("mouseenter", openSideMenu);
  sideMenu.addEventListener("mouseenter", openSideMenu);
  sideMenu.addEventListener("mouseleave", closeSideMenu);
  sideMenuTab.addEventListener("click", toggleSideMenu);
  sideMenuTab.addEventListener("keypress", (e) => { if (e.key === "Enter") toggleSideMenu(); });
  document.addEventListener("click", (e) => {
    if (!sideMenu.contains(e.target) && !edgeTrigger.contains(e.target)) closeSideMenu();
  });

  // ---------- 공용 모달 ----------
  let modalResolve = null;
  function openModal({ title, type = "text", placeholder = "", error = "" }) {
    modalTitle.textContent = title;
    modalInput.type = type;
    modalInput.placeholder = placeholder;
    modalInput.value = "";
    modalError.textContent = error;
    modalOverlay.classList.add("is-open");
    modalInput.focus();
    return new Promise((resolve) => { modalResolve = resolve; });
  }
  function closeModal(result) {
    modalOverlay.classList.remove("is-open");
    if (modalResolve) { modalResolve(result); modalResolve = null; }
  }
  modalCancel.addEventListener("click", () => closeModal(null));
  modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(null); });
  modalConfirm.addEventListener("click", () => closeModal(modalInput.value));
  modalInput.addEventListener("keydown", (e) => { if (e.key === "Enter") closeModal(modalInput.value); });

  // ---------- 로그인(닉네임) ----------
  function loadUser() {
    state.user = localStorage.getItem(LS_USER) || null;
    renderUser();
  }
  function renderUser() {
    sideMenuUser.textContent = state.user ? state.user + "님으로 열람 중" : "게스트로 열람 중";
    btnLogin.textContent = state.user ? "로그아웃" : "로그인";
  }
  btnLogin.addEventListener("click", async () => {
    if (state.user) {
      state.user = null;
      localStorage.removeItem(LS_USER);
      renderUser();
      return;
    }
    const name = await openModal({ title: "열람자 이름을 입력하세요", type: "text", placeholder: "닉네임" });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    state.user = trimmed;
    localStorage.setItem(LS_USER, trimmed);
    renderUser();
  });

  // ---------- 즐겨찾기 ----------
  function loadFavorites() {
    try {
      const arr = JSON.parse(localStorage.getItem(LS_FAVORITES) || "[]");
      state.favorites = new Set(Array.isArray(arr) ? arr : []);
    } catch (_) { state.favorites = new Set(); }
  }
  function saveFavorites() {
    localStorage.setItem(LS_FAVORITES, JSON.stringify([...state.favorites]));
  }
  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    saveFavorites();
  }

  btnFavorites.addEventListener("click", () => {
    state.viewMode = "favorites";
    state.activeTag = null;
    state.activeEntry = null;
    closeSideMenu();
    renderSpine();
    renderRoster();
    showEmptyReader();
  });

  // ---------- 태그 ----------
  function allTags() {
    const map = new Map();
    state.entries.forEach((e) => {
      (e.tags || []).forEach((t) => map.set(t, (map.get(t) || 0) + 1));
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  btnTags.addEventListener("click", () => {
    state.viewMode = "tags";
    state.activeTag = null;
    state.activeEntry = null;
    closeSideMenu();
    renderSpine();
    renderRoster();
    showEmptyReader();
  });

  // ---------- 관리자 이동 ----------
  btnAdmin.addEventListener("click", async () => {
    closeSideMenu();
    let errorMsg = "";
    for (;;) {
      const pw = await openModal({ title: "관리자 비밀번호를 입력하세요", type: "password", placeholder: "비밀번호", error: errorMsg });
      if (pw === null) return;
      if (pw === ADMIN_PASSWORD) {
        sessionStorage.setItem(LS_ADMIN_AUTH, "1");
        window.location.href = "admin.html";
        return;
      }
      errorMsg = "비밀번호가 올바르지 않습니다.";
    }
  });

  // ---------- 데이터 로드 ----------
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
      btn.className = "spine__book" + (c.id === state.activeCollection && state.viewMode === "collection" ? " is-active" : "");
      btn.type = "button";
      btn.textContent = c.title;
      btn.setAttribute("aria-pressed", c.id === state.activeCollection && state.viewMode === "collection");
      btn.addEventListener("click", () => {
        state.viewMode = "collection";
        state.activeTag = null;
        state.activeCollection = c.id;
        state.activeEntry = null;
        renderSpine();
        renderRoster();
        showEmptyReader();
      });
      spineEl.appendChild(btn);
    });
  }

  function entryCard(entry, i) {
    const li = document.createElement("li");
    li.className = "entry-item" + (entry.id === state.activeEntry ? " is-active" : "");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    const isFav = state.favorites.has(entry.id);
    const tags = (entry.tags || []).map((t) => '<span class="tag-chip">#' + escapeHtml(t) + "</span>").join("");
    li.innerHTML =
      '<button type="button" class="entry-item__star' + (isFav ? " is-fav" : "") + '" aria-label="즐겨찾기 토글">' + (isFav ? "★" : "☆") + "</button>" +
      '<div class="entry-item__idx">RECORD ' + String(i + 1).padStart(2, "0") + "</div>" +
      '<div class="entry-item__title">' + escapeHtml(entry.title) + "</div>" +
      (entry.subtitle ? '<div class="entry-item__sub">' + escapeHtml(entry.subtitle) + "</div>" : "") +
      (tags ? '<div class="entry-item__tags">' + tags + "</div>" : "");
    const open = () => {
      state.activeEntry = entry.id;
      renderRoster();
      renderReader(entry);
    };
    li.addEventListener("click", open);
    li.addEventListener("keypress", (e) => { if (e.key === "Enter") open(); });
    li.querySelector(".entry-item__star").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(entry.id);
      renderRoster();
    });
    return li;
  }

  function renderRoster() {
    rosterList.innerHTML = "";

    if (state.viewMode === "favorites") {
      rosterTitle.textContent = "즐겨찾기";
      rosterDesc.textContent = "별표 표시한 기록만 모아봅니다.";
      const items = state.entries.filter((e) => state.favorites.has(e.id));
      rosterCount.textContent = items.length + "건";
      if (items.length === 0) {
        rosterList.innerHTML = '<li class="roster__empty">아직 즐겨찾기한 기록이 없습니다.<br>목록의 별표를 눌러 추가하세요.</li>';
        return;
      }
      items.forEach((entry, i) => rosterList.appendChild(entryCard(entry, i)));
      return;
    }

    if (state.viewMode === "tags") {
      if (!state.activeTag) {
        rosterTitle.textContent = "태그";
        rosterDesc.textContent = "태그를 선택하면 관련 기록을 모아봅니다.";
        const tags = allTags();
        rosterCount.textContent = tags.length + "개";
        if (tags.length === 0) {
          rosterList.innerHTML = '<li class="roster__empty">등록된 태그가 없습니다.</li>';
          return;
        }
        const wrap = document.createElement("div");
        wrap.className = "tag-cloud";
        tags.forEach(([tag, count]) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tag-cloud__item";
          btn.innerHTML = "#" + escapeHtml(tag) + '<span class="tag-cloud__count">' + count + "</span>";
          btn.addEventListener("click", () => {
            state.activeTag = tag;
            renderRoster();
          });
          wrap.appendChild(btn);
        });
        rosterList.appendChild(wrap);
        return;
      }
      rosterTitle.textContent = "#" + state.activeTag;
      rosterDesc.textContent = "이 태그가 붙은 기록입니다.";
      const back = document.createElement("button");
      back.type = "button";
      back.className = "roster__back";
      back.textContent = "← 태그 목록으로";
      back.addEventListener("click", () => { state.activeTag = null; renderRoster(); });
      rosterList.appendChild(back);
      const items = state.entries.filter((e) => (e.tags || []).includes(state.activeTag));
      rosterCount.textContent = items.length + "건";
      items.forEach((entry, i) => rosterList.appendChild(entryCard(entry, i)));
      return;
    }

    // 기본: 문서철별 보기
    const collection = state.collections.find((c) => c.id === state.activeCollection);
    rosterTitle.textContent = collection ? collection.title : "기록 보관소";
    rosterDesc.textContent = collection ? collection.description || "" : "문서철을 선택해 기록을 열람하세요.";

    const items = state.entries
      .filter((e) => e.collectionId === state.activeCollection)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    rosterCount.textContent = items.length + "건";

    if (items.length === 0) {
      rosterList.innerHTML = '<li class="roster__empty">이 문서철에는 아직 기록이 없습니다.</li>';
      return;
    }

    items.forEach((entry, i) => rosterList.appendChild(entryCard(entry, i)));
  }

  function showEmptyReader() {
    readerEmpty.style.display = "flex";
    readerInner.style.display = "none";
  }

  function renderReader(entry) {
    readerEmpty.style.display = "none";
    readerInner.style.display = "block";

    const collection = state.collections.find((c) => c.id === entry.collectionId);
    const bodyHtml = renderMarkdown(entry.body);
    const tags = (entry.tags || []).map((t) => '<span class="tag-chip">#' + escapeHtml(t) + "</span>").join("");

    readerInner.innerHTML =
      '<div class="reader__eyebrow">' + escapeHtml(collection ? collection.title : "") + "</div>" +
      '<h2 class="reader__title">' + escapeHtml(entry.title) + "</h2>" +
      (entry.subtitle ? '<p class="reader__subtitle">' + escapeHtml(entry.subtitle) + "</p>" : "") +
      (tags ? '<div class="reader__tags">' + tags + "</div>" : "") +
      inscriptionSVG() +
      '<div class="reader__body">' + bodyHtml + "</div>" +
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

  loadUser();
  loadFavorites();
  loadData();
})();
