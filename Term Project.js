/* ===== Cafe posts ===== */
const LS_POSTS = "cafe_posts_simple_v1";

/* ===== Guestbook ===== */
const LS_GUEST = "cafe_guestbook_v1";

const $ = (s) => document.querySelector(s);

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function uid() {
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now();
}
function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

/* ===== Page switching ===== */
const pageHome = $("#pageHome");
const pageGuestbook = $("#pageGuestbook");

const navHome = $("#navHome");
const navGuestbook = $("#navGuestbook");

function showHome() {
  pageGuestbook.classList.add("hidden");
  pageHome.classList.remove("hidden");
  // 回到頂部（可選）
  document.querySelector("#top")?.scrollIntoView({ behavior: "smooth" });
}
function showGuestbook() {
  pageHome.classList.add("hidden");
  pageGuestbook.classList.remove("hidden");
  document.querySelector("#guestbook")?.scrollIntoView({ behavior: "smooth" });
}

navHome.addEventListener("click", (e) => {
  e.preventDefault();
  showHome();
});
navGuestbook.addEventListener("click", (e) => {
  e.preventDefault();
  showGuestbook();
});

/* ===== Form toggle (Record) ===== */
const btnRecord = $("#btnRecord");
const formCard = $("#formCard");
const cafeForm = $("#cafeForm");

let formOpen = false;
function setFormOpen(open) {
  formOpen = open;
  formCard.classList.toggle("hidden", !open);
  btnRecord.textContent = open ? "關閉" : "記錄";
  if (open) {
    formCard.scrollIntoView({ behavior: "smooth" });
    cafeForm.elements.name.focus();
  }
}
btnRecord.addEventListener("click", () => setFormOpen(!formOpen));

/* ===== Image compress ===== */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("圖片讀取失敗")); };
    img.src = url;
  });
}
async function compressImageToDataURL(file, maxSide = 1400, quality = 0.8) {
  const img = await loadImageFromFile(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/* ===== Posts ===== */
const postsEl = $("#posts");
const emptyEl = $("#empty");
const countEl = $("#count");
const btnClearAll = $("#btnClearAll");
const btnClearForm = $("#btnClearForm");

let posts = loadJSON(LS_POSTS, []);

function loadJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function renderPosts() {
  countEl.textContent = `共 ${posts.length} 篇`;

  if (!posts.length) {
    postsEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");

  postsEl.innerHTML = posts.map(p => {
    const img = p.photoDataUrl
      ? `<div class="postImg"><img src="${escapeHtml(p.photoDataUrl)}" alt="${escapeHtml(p.name)}"></div>`
      : `<div class="postImg"></div>`;

    return `
      <article class="post">
        <div class="postBodyRow">
          ${img}
          <div class="postTextArea">
            <div class="postHead">
              <h3>${escapeHtml(p.name)}</h3>
              <div class="date">${escapeHtml(p.date)}</div>
            </div>

            <div class="meta">
              <span class="pill">${escapeHtml(p.city)} · ${escapeHtml(p.district)}</span>
            </div>

            <div class="content">${escapeHtml(p.notes)}</div>

            <div class="postActions">
              <a class="link" href="${escapeHtml(p.maps)}" target="_blank" rel="noopener">Google Maps</a>
              <button class="btn danger" type="button" data-del="${escapeHtml(p.id)}">刪除</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  postsEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.del;
      const target = posts.find(x => x.id === id);
      if (!target) return;
      if (!confirm(`確定刪除「${target.name}」？`)) return;
      posts = posts.filter(x => x.id !== id);
      saveJSON(LS_POSTS, posts);
      renderPosts();
    });
  });
}

cafeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = cafeForm.elements;

  const submitBtn = cafeForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "處理中…";

  try {
    const photoFile = f.photo?.files?.[0] || null;
    let photoDataUrl = "";
    if (photoFile) photoDataUrl = await compressImageToDataURL(photoFile, 1400, 0.8);

    const post = {
      id: uid(),
      name: f.name.value.trim(),
      date: f.date.value,
      city: f.city.value.trim(),
      district: f.district.value.trim(),
      maps: f.maps.value.trim(),
      notes: f.notes.value.trim(),
      photoDataUrl
    };

    if (!post.name || !post.date || !post.city || !post.district || !post.maps || !post.notes) {
      alert("請把必填欄位都填完。");
      return;
    }

    posts.unshift(post);
    try {
      saveJSON(LS_POSTS, posts);
    } catch {
      posts.shift();
      alert("儲存失敗：瀏覽器儲存空間可能已滿。建議刪掉一些舊紀錄（尤其有照片的）。");
      return;
    }

    cafeForm.reset();
    cafeForm.elements.date.value = todayISO();
    renderPosts();
    setFormOpen(false);

  } catch (err) {
    alert(err.message || "發佈失敗");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "發佈";
  }
});

btnClearAll.addEventListener("click", () => {
  if (!confirm("確定清空全部紀錄？（不可復原）")) return;
  posts = [];
  saveJSON(LS_POSTS, posts);
  renderPosts();
});

btnClearForm.addEventListener("click", () => {
  cafeForm.reset();
  cafeForm.elements.date.value = todayISO();
});

/* ===== Guestbook ===== */
const guestFormHome = $("#guestFormHome");
const guestFormPage = $("#guestFormPage");
const guestListHome = $("#guestListHome");
const guestListPage = $("#guestListPage");

let comments = loadJSON(LS_GUEST, []);

function renderGuestbook() {
  const html = comments.map(c => `
    <div class="guestItem">
      <div class="guestMeta">匿名 · ${escapeHtml(c.time)}</div>
      <div class="guestMsg">${escapeHtml(c.message)}</div>
    </div>
  `).join("");

  guestListHome.innerHTML = html || `<div class="muted">目前還沒有留言。</div>`;
  guestListPage.innerHTML = html || `<div class="muted">目前還沒有留言。</div>`;
}

function addComment(message) {
  const msg = message.trim();
  if (!msg) return;

  const item = {
    id: uid(),
    time: new Date().toLocaleString(),
    message: msg
  };

  comments.unshift(item);
  saveJSON(LS_GUEST, comments);
  renderGuestbook();
}

guestFormHome.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = guestFormHome.elements.message.value;
  addComment(message);
  guestFormHome.reset();
});

guestFormPage.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = guestFormPage.elements.message.value;
  addComment(message);
  guestFormPage.reset();
});

/* ===== Init ===== */
cafeForm.elements.date.value = todayISO();
setFormOpen(false);
renderPosts();
renderGuestbook();
