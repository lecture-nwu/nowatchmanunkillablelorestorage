(function () {
  "use strict";

  // 메인 페이지의 좌측 메뉴를 거치지 않고 admin.html에 직접 접속한 경우를 대비한 최소한의 저지선.
  // 정적 사이트라 완벽한 보안은 아니며, 실제 데이터 커밋에는 별도의 GitHub 토큰이 필요합니다.
  const ADMIN_PASSWORD = "lore-admin-2026";
  const LS_ADMIN_AUTH = "loreArchive.adminAuth";
  const adminRoot = document.getElementById("adminRoot");
  const gateOverlay = document.getElementById("adminGateOverlay");
  const gateInput = document.getElementById("adminGateInput");
  const gateError = document.getElementById("adminGateError");
  const gateConfirm = document.getElementById("adminGateConfirm");
  const gateCancel = document.getElementById("adminGateCancel");

  function unlockAdmin() {
    sessionStorage.setItem(LS_ADMIN_AUTH, "1");
    gateOverlay.classList.remove("is-open");
    adminRoot.style.display = "";
    initAdmin();
  }
  function checkGate() {
    if (gateInput.value === ADMIN_PASSWORD) { unlockAdmin(); return; }
    gateError.textContent = "비밀번호가 올바르지 않습니다.";
    gateInput.value = "";
    gateInput.focus();
  }
  gateConfirm.addEventListener("click", checkGate);
  gateCancel.addEventListener("click", () => { location.href = "index.html"; });
  gateInput.addEventListener("keydown", (e) => { if (e.key === "Enter") checkGate(); });

  if (sessionStorage.getItem(LS_ADMIN_AUTH) === "1") {
    gateOverlay.classList.remove("is-open");
    adminRoot.style.display = "";
  } else {
    gateInput.focus();
    return; // initAdmin()은 인증 성공 시 unlockAdmin()에서 호출됩니다.
  }

  initAdmin();

  function initAdmin() {

  const LS_SETTINGS = "loreArchive.settings";
  const LS_DATA = "loreArchive.draft";

  const el = (id) => document.getElementById(id);
  const $owner = el("ghOwner"), $repo = el("ghRepo"), $branch = el("ghBranch"),
        $path = el("ghPath"), $token = el("ghToken");
  const $settingsStatus = el("settingsStatus"), $commitStatus = el("commitStatus");
  const $collectionList = el("collectionList"), $entryList = el("entryList");
  const $entryColl = el("entryColl");

  let data = { collections: [], entries: [] };
  let editingEntryId = null;
  let currentSha = null; // GitHub 파일 sha (업데이트 시 필요)

  // ---------- 유틸 ----------
  function showStatus(node, msg, type) {
    node.textContent = msg;
    node.className = "status is-visible status--" + type;
  }
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8);
  }
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  function base64ToUtf8(b64) {
    const binary = atob(b64.replace(/\n/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------- 설정 저장/불러오기 ----------
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
      $owner.value = s.owner || "";
      $repo.value = s.repo || "";
      $branch.value = s.branch || "main";
      $path.value = s.path || "data/entries.json";
      $token.value = s.token || "";
    } catch (_) {}
  }
  function saveSettings() {
    const s = {
      owner: $owner.value.trim(), repo: $repo.value.trim(),
      branch: $branch.value.trim() || "main", path: $path.value.trim() || "data/entries.json",
      token: $token.value.trim(),
    };
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
    showStatus($settingsStatus, "연결 정보가 이 브라우저에 저장되었습니다.", "ok");
    return s;
  }

  // ---------- 로컬 초안 저장/복원 ----------
  function saveDraft() { localStorage.setItem(LS_DATA, JSON.stringify(data)); }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_DATA) || "null");
      if (d && Array.isArray(d.collections)) data = d;
    } catch (_) {}
  }

  // ---------- GitHub API ----------
  function apiUrl(s) {
    return `https://api.github.com/repos/${s.owner}/${s.repo}/contents/${s.path}?ref=${encodeURIComponent(s.branch)}`;
  }

  async function loadFromGitHub() {
    const s = saveSettings();
    if (!s.owner || !s.repo) {
      showStatus($settingsStatus, "GitHub 사용자명과 저장소 이름을 입력하세요.", "err");
      return;
    }
    showStatus($settingsStatus, "불러오는 중...", "info");
    try {
      const headers = { Accept: "application/vnd.github+json" };
      if (s.token) headers.Authorization = "token " + s.token;
      const res = await fetch(apiUrl(s), { headers });
      if (res.status === 404) {
        currentSha = null;
        showStatus($settingsStatus, "파일이 아직 없습니다. 새로 작성 후 저장하면 생성됩니다.", "info");
        return;
      }
      if (!res.ok) throw new Error("GitHub API 오류 (HTTP " + res.status + ")");
      const json = await res.json();
      currentSha = json.sha;
      const text = base64ToUtf8(json.content);
      const parsed = JSON.parse(text);
      data.collections = Array.isArray(parsed.collections) ? parsed.collections : [];
      data.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      saveDraft();
      renderAll();
      showStatus($settingsStatus, "불러오기 완료 (" + data.entries.length + "개 기록).", "ok");
    } catch (err) {
      showStatus($settingsStatus, "불러오기 실패: " + err.message, "err");
    }
  }

  async function commitToGitHub() {
    const s = saveSettings();
    if (!s.owner || !s.repo) {
      showStatus($commitStatus, "먼저 저장소 연결 정보를 입력하세요.", "err");
      return;
    }
    if (!s.token) {
      showStatus($commitStatus, "커밋하려면 write 권한이 있는 토큰이 필요합니다. 없다면 아래 다운로드 버튼으로 파일을 받아 수동으로 커밋하세요.", "err");
      return;
    }
    showStatus($commitStatus, "커밋하는 중...", "info");
    try {
      const content = JSON.stringify({ collections: data.collections, entries: data.entries }, null, 2);
      const body = {
        message: "기록 갱신 (" + new Date().toISOString() + ")",
        content: utf8ToBase64(content),
        branch: s.branch,
      };
      if (currentSha) body.sha = currentSha;

      const res = await fetch(apiUrl(s).split("?")[0], {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "token " + s.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || ("HTTP " + res.status));
      currentSha = json.content?.sha || currentSha;
      showStatus($commitStatus, "커밋 완료. GitHub Pages가 재배포되면 열람 페이지에 반영됩니다(수 분 소요).", "ok");
    } catch (err) {
      showStatus($commitStatus, "커밋 실패: " + err.message, "err");
    }
  }

  function downloadJson() {
    const content = JSON.stringify({ collections: data.collections, entries: data.entries }, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "entries.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------- 문서철 관리 ----------
  function renderCollections() {
    if (data.collections.length === 0) {
      $collectionList.innerHTML = '<p class="hint">아직 문서철이 없습니다. 아래에서 추가하세요.</p>';
    } else {
      $collectionList.innerHTML = data.collections.map((c) => `
        <div class="list-row">
          <div>
            <div>${escapeHtml(c.title)}</div>
            <div class="list-row__meta">${escapeHtml(c.description || "")}</div>
          </div>
          <div class="list-row__actions">
            <button data-del-coll="${c.id}">삭제</button>
          </div>
        </div>
      `).join("");
      $collectionList.querySelectorAll("[data-del-coll]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del-coll");
          if (data.entries.some((e) => e.collectionId === id)) {
            if (!confirm("이 문서철에 속한 기록도 함께 삭제됩니다. 계속할까요?")) return;
          }
          data.collections = data.collections.filter((c) => c.id !== id);
          data.entries = data.entries.filter((e) => e.collectionId !== id);
          saveDraft(); renderAll();
        });
      });
    }
    $entryColl.innerHTML = data.collections.map((c) => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join("");
  }

  el("btnAddColl").addEventListener("click", () => {
    const title = el("newCollTitle").value.trim();
    if (!title) { alert("문서철 제목을 입력하세요."); return; }
    data.collections.push({ id: uid("book"), title, description: el("newCollDesc").value.trim() });
    el("newCollTitle").value = ""; el("newCollDesc").value = "";
    saveDraft(); renderAll();
  });

  // ---------- 기록 관리 ----------
  function renderEntries() {
    if (data.entries.length === 0) {
      $entryList.innerHTML = '<p class="hint">아직 작성된 기록이 없습니다.</p>';
      return;
    }
    const byColl = Object.fromEntries(data.collections.map((c) => [c.id, c.title]));
    $entryList.innerHTML = [...data.entries]
      .sort((a, b) => (a.collectionId || "").localeCompare(b.collectionId || "") || (a.order ?? 0) - (b.order ?? 0))
      .map((e) => `
        <div class="list-row">
          <div>
            <div>${escapeHtml(e.title)}</div>
            <div class="list-row__meta">${escapeHtml(byColl[e.collectionId] || "미분류")} · 순서 ${e.order ?? 0}${(e.tags && e.tags.length) ? " · " + e.tags.map((t) => "#" + t).join(" ") : ""}</div>
          </div>
          <div class="list-row__actions">
            <button data-edit="${e.id}">편집</button>
            <button data-del="${e.id}">삭제</button>
          </div>
        </div>
      `).join("");
    $entryList.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => startEdit(btn.getAttribute("data-edit")));
    });
    $entryList.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("이 기록을 삭제할까요?")) return;
        data.entries = data.entries.filter((e) => e.id !== btn.getAttribute("data-del"));
        saveDraft(); renderAll();
      });
    });
  }

  function startEdit(id) {
    const entry = data.entries.find((e) => e.id === id);
    if (!entry) return;
    editingEntryId = id;
    $entryColl.value = entry.collectionId;
    el("entryTitle").value = entry.title;
    el("entrySub").value = entry.subtitle || "";
    el("entryOrder").value = entry.order ?? 1;
    el("entryTags").value = (entry.tags || []).join(", ");
    el("entryBody").value = entry.body || "";
    el("btnSaveEntry").textContent = "기록 수정 저장";
    el("btnClearEntry").style.display = "inline-block";
    window.scrollTo({ top: el("entryColl").closest("section").offsetTop - 20, behavior: "smooth" });
  }

  function resetEntryForm() {
    editingEntryId = null;
    el("entryTitle").value = ""; el("entrySub").value = "";
    el("entryOrder").value = 1; el("entryTags").value = ""; el("entryBody").value = "";
    el("btnSaveEntry").textContent = "기록 추가";
    el("btnClearEntry").style.display = "none";
  }

  el("btnClearEntry").addEventListener("click", resetEntryForm);

  el("btnSaveEntry").addEventListener("click", () => {
    if (data.collections.length === 0) { alert("먼저 문서철을 하나 이상 추가하세요."); return; }
    const title = el("entryTitle").value.trim();
    if (!title) { alert("제목을 입력하세요."); return; }
    const payload = {
      collectionId: $entryColl.value,
      title,
      subtitle: el("entrySub").value.trim(),
      order: Number(el("entryOrder").value) || 0,
      tags: el("entryTags").value.split(",").map((t) => t.trim()).filter(Boolean),
      body: el("entryBody").value,
    };
    if (editingEntryId) {
      const idx = data.entries.findIndex((e) => e.id === editingEntryId);
      data.entries[idx] = { ...data.entries[idx], ...payload };
    } else {
      data.entries.push({ id: uid("entry"), ...payload });
    }
    saveDraft(); resetEntryForm(); renderAll();
  });

  // ---------- 이벤트 바인딩 ----------
  el("btnSaveSettings").addEventListener("click", saveSettings);
  el("btnLoad").addEventListener("click", loadFromGitHub);
  el("btnCommit").addEventListener("click", commitToGitHub);
  el("btnDownload").addEventListener("click", downloadJson);

  function renderAll() {
    renderCollections();
    renderEntries();
  }

  loadSettings();
  loadDraft();
  renderAll();
  }
})();
