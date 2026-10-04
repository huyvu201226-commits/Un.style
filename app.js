import { DEFAULTS, $, $$, esc, initFB, load } from "./config.js?v=3";

const root = document.documentElement;
let S = structuredClone(DEFAULTS);
let tiles = [];
let live = false; // true khi đang là khung xem trước trong trang admin

function initial(name) {
  const t = (name || "U").trim()[0]?.toUpperCase() || "U";
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${S.brand}'/><text x='50' y='66' font-size='52' font-family='sans-serif' font-weight='700' text-anchor='middle' fill='${S.tile}'>${esc(t)}</text></svg>`);
}

function apply() {
  const st = root.style;
  st.setProperty("--bg", S.bg); st.setProperty("--ink", S.ink);
  st.setProperty("--brand", S.brand); st.setProperty("--tile", S.tile);
  st.setProperty("--depth", S.depth); st.setProperty("--lift", S.depth * 0.8 + 16 + "px");
  st.setProperty("--brandf", `'${S.brandFont}'`); st.setProperty("--bodyf", `'${S.bodyFont}'`);

  layout();

  document.title = S.name;
  const av = $("#avatar"), url = S.avatar || initial(S.name);
  if (av.getAttribute("src") !== url) {
    av.classList.remove("ld");
    av.onload = () => av.classList.add("ld");
    av.src = url;
    if (live) av.classList.add("ld");
  }
  $("#desc").textContent = S.desc;

  const b = $("#brand");
  b.className = "brand fx-" + S.fx;
  b.innerHTML = S.fx === "wave"
    ? [...S.name].map((c, i) => `<span style="--i:${i}">${esc(c === " " ? "\u00a0" : c)}</span>`).join("")
    : esc(S.name);

  $("#foot").textContent = S.foot;

  const ok = u => /^(https?:|mailto:|tel:)/i.test(u);
  $("#grid").innerHTML = S.links.map((l, i) =>
    `<button type="button" class="tile" data-u="${ok(l.url) ? esc(l.url) : ""}" style="--i:${i};${l.color ? `--c:${esc(l.color)}` : ""}">
       <span class="stk">${l.img ? `<img src="${esc(l.img)}" alt="">` : esc(l.icon)}</span><span class="tx">${esc(l.label)}</span></button>`).join("");
  tiles = $$(".tile");
  $$(".stk img").forEach(im => { if (live || im.complete) im.classList.add("ld"); else im.onload = () => im.classList.add("ld"); });
  tick();
}

/* Hiệu ứng cuộn: thương hiệu ẩn xuống, ô nổi lên */
let queued = false;
function tick() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    const vh = innerHeight;
    root.style.setProperty("--p", Math.min(1, scrollY / (vh * 0.6 * S.scroll)).toFixed(3));
    const c = (x) => Math.min(1, Math.max(0, x));
    for (const t of tiles) {
      const top = t.getBoundingClientRect().top;
      t.style.setProperty("--t", c((vh * 0.98 - top) / (vh * 0.12)).toFixed(3));
      t.style.setProperty("--e", c((vh * 0.85 - top) / (vh * 0.22 * S.scroll)).toFixed(3));
    }
  });
}
addEventListener("scroll", tick, { passive: true });
addEventListener("resize", tick);

/* Nhận dữ liệu xem trước trực tiếp từ trang admin (cùng domain) */
addEventListener("message", e => {
  if (e.origin !== location.origin || e.data?.type !== "cfg") return;
  live = true;
  S = { ...DEFAULTS, ...e.data.cfg };
  show();
});

(async () => {
  // Chỉ hiện dữ liệu mặc định khi mạng quá chậm (12s); bình thường luôn chờ dữ liệu mới nhất
  setTimeout(() => { if (root.classList.contains("loading")) show(); }, 12000);
  const fb = await initFB(false);
  const data = await load(fb);
  if (!live) { S = { ...DEFAULTS, ...data }; show(); }
  // Tự cập nhật: admin lưu xong, mọi trang khách đang mở đổi theo ngay, không cần tải lại
  if (fb.db && parent === window) {
    fb.f.onSnapshot(fb.f.doc(fb.db, "site", "config"), snap => {
      if (snap.exists() && !live) { S = { ...DEFAULTS, ...snap.data() }; apply(); }
    });
  }
  if (parent !== window) parent.postMessage({ type: "ready" }, location.origin);
})();

$("#grid").addEventListener("click", e => {
  const u = e.target.closest(".tile")?.dataset.u;
  if (u) window.open(u, "_blank", "noopener");
});

/* Căn ô theo thiết bị: điện thoại < 700px, máy tính bảng 700–1099px, laptop >= 1100px.
   Bật tự động: giá trị admin là cỡ chuẩn trên điện thoại, mỗi thiết bị nhân hệ số riêng,
   chiều cao ô bị chặn theo chiều cao màn hình, chiều rộng không vượt màn hình.
   Tắt tự động: dùng đúng số px ở mọi thiết bị. */
function layout() {
  const g = $("#grid"), W = innerWidth, H = innerHeight;
  let w = S.tileW, h = S.tileH, gap = S.tileGap ?? 12;
  if (S.auto !== false) {
    const f = W < 700 ? [1, 1, 1] : W < 1100 ? [1.18, 1.1, 1.15] : [1.05, 0.97, 1];
    w *= f[0]; h = Math.max(44, Math.min(h * f[1], H * 0.12)); gap = Math.min(gap * f[2], h * 0.5);
  }
  w = Math.min(w, W - 36);
  root.style.setProperty("--w", w + "px");
  g.style.setProperty("--h", Math.round(h) + "px");
  g.style.setProperty("--s", Math.round(h * 0.69) + "px");
  g.style.setProperty("--fs", Math.min(18, Math.max(13, h * 0.24)).toFixed(1) + "px");
  g.style.gap = Math.round(gap) + "px";
}
addEventListener("resize", layout);

/* Hiện nội dung thật khi dữ liệu đã tải xong */
function show() {
  apply();
  root.classList.remove("loading");
  root.classList.add("ready");
}
