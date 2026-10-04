import { DEFAULTS, FONTS, KEY, useFB, $, $$, esc, initFB, load } from "./config.js";

const login = $("#login"), panel = $("#panel"), frame = $("#pv");
let S = structuredClone(DEFAULTS);
let fb = {};

/* Gửi dữ liệu sang khung xem trước */
const push = () => frame.contentWindow?.postMessage({ type: "cfg", cfg: S }, location.origin);
addEventListener("message", e => { if (e.origin === location.origin && e.data?.type === "ready") push(); });
frame.addEventListener("load", push);

function show(authed) {
  login.hidden = authed;
  panel.hidden = !authed;
  if (authed) fillForm();
}

function fillForm() {
  $("#mode").textContent = useFB
    ? "Đã kết nối Firebase. Thay đổi hiện ngay ở khung bên cạnh, bấm Lưu để đăng lên."
    : "Chế độ thử: chưa cấu hình Firebase, dữ liệu chỉ lưu trong trình duyệt này.";
  $$(".fonts").forEach(s => { s.innerHTML = FONTS.map(f => `<option>${f}</option>`).join(""); });
  $$("[data-k]").forEach(el => {
    if (el.type === "checkbox") el.checked = S[el.dataset.k] !== false; else el.value = S[el.dataset.k];
    const o = el.closest("label")?.querySelector("output");
    if (o) o.textContent = el.value;
  });
  renderEditor();
  syncAuto();
  push();
}

function renderEditor() {
  $("#links").innerHTML = S.links.map((l, i) => `
    <div class="lk">
      <input data-i="${i}" data-f="icon" value="${esc(l.icon)}" aria-label="Biểu tượng">
      <input data-i="${i}" data-f="label" value="${esc(l.label)}" aria-label="Tên">
      <button type="button" class="btn ghost" data-del="${i}" aria-label="Xóa ô">✕</button>
      <input class="u" data-i="${i}" data-f="url" value="${esc(l.url)}" placeholder="https://" aria-label="Liên kết">
      <input type="color" data-i="${i}" data-f="color" value="${l.color || S.tile}" aria-label="Màu ô">
      <label class="f">Sticker nhỏ ${l.img ? `<img src="${esc(l.img)}" alt="" class="thumb"><button type="button" class="btn ghost" data-rm="${i}">Bỏ ảnh</button>` : ""}<input type="file" accept="image/*" data-st="${i}"></label>
    </div>`).join("");
}

panel.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.k) {
    S[el.dataset.k] = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
    const o = el.closest("label")?.querySelector("output");
    if (o) o.textContent = el.value;
  } else if (el.dataset.f) {
    S.links[el.dataset.i][el.dataset.f] = el.value;
  } else return;
  syncAuto();
  push();
});

panel.addEventListener("click", e => {
  const d = e.target.closest("[data-del]");
  if (d) { S.links.splice(+d.dataset.del, 1); renderEditor(); push(); }
});

panel.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.st === undefined || !el.files[0]) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"), n = 128;
    c.width = c.height = n;
    const r = Math.min(n / img.width, n / img.height), w = img.width * r, h = img.height * r;
    c.getContext("2d").drawImage(img, (n - w) / 2, (n - h) / 2, w, h);
    S.links[+el.dataset.st].img = c.toDataURL("image/png");
    renderEditor(); push();
  };
  img.src = URL.createObjectURL(el.files[0]);
});

panel.addEventListener("click", e => {
  const r = e.target.closest("[data-rm]");
  if (r) { S.links[+r.dataset.rm].img = ""; renderEditor(); push(); }
});

$("#add").onclick = () => {
  S.links.push({ icon: "🔗", label: "Liên kết mới", url: "https://", color: "" });
  renderEditor(); push();
};

$("#file").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"), n = 256;
    c.width = c.height = n;
    const m = Math.min(img.width, img.height);
    c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, n, n);
    S.avatar = c.toDataURL("image/jpeg", 0.85);
    push();
  };
  img.src = URL.createObjectURL(f);
};

$("#save").onclick = async e => {
  const b = e.target;
  localStorage.setItem(KEY, JSON.stringify(S));
  try {
    if (fb.db) await fb.f.setDoc(fb.f.doc(fb.db, "site", "config"), S);
    b.textContent = "Đã lưu";
  } catch (err) { b.textContent = "Lỗi: " + (err.code || "không lưu được"); }
  setTimeout(() => (b.textContent = "Lưu thay đổi"), 2200);
};

$("#reset").onclick = () => {
  if (!confirm("Đặt lại toàn bộ về mặc định?")) return;
  S = structuredClone(DEFAULTS); fillForm();
};

$("#out").onclick = async () => {
  if (fb.auth) { await fb.u.signOut(fb.auth); show(false); }
  else location.href = "index.html";
};

login.onsubmit = async e => {
  e.preventDefault();
  $("#err").textContent = "";
  try { await fb.u.signInWithEmailAndPassword(fb.auth, $("#em").value, $("#pw").value); }
  catch { $("#err").textContent = "Email hoặc mật khẩu chưa đúng."; }
};

(async () => {
  fb = await initFB(true);
  if (fb.auth) {
    fb.u.onAuthStateChanged(fb.auth, async user => {
      if (user) S = { ...DEFAULTS, ...(await load(fb)) };
      show(!!user);
    });
  } else {
    S = { ...DEFAULTS, ...(await load(fb)) };
    show(true);
  }
})();

$$(".dev .btn").forEach(b => b.onclick = () => {
  frame.style.setProperty("--pw", b.dataset.w);
  $$(".dev .btn").forEach(x => x.classList.toggle("ghost", x !== b));
});

function syncAuto() {
  $$('[data-k="tileH"],[data-k="tileW"]').forEach(e => (e.disabled = false));
}
