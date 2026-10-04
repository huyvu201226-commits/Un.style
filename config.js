/* ====== DÁN CẤU HÌNH FIREBASE CỦA BẠN VÀO ĐÂY ======
   Firebase Console → Project settings → Your apps → Web app → firebaseConfig.
   Để trống apiKey = chạy chế độ thử (lưu trong trình duyệt). */
export const FIREBASE = {
  apiKey: "AIzaSyD_ldCu-l7o1FBF-kZZ01TYDZqLe-JZWDA",
  authDomain: "unstyle-fce90.firebaseapp.com",
  projectId: "unstyle-fce90",
  storageBucket: "unstyle-fce90.firebasestorage.app",
  messagingSenderId: "224017703414",
  appId: "1:224017703414:web:746fc2ed1d23c4b8d4a7d7"
};

export const useFB = !!FIREBASE.apiKey;
export const KEY = "unstyle-config";
export const FONTS = ["Be Vietnam Pro", "Lexend", "Playfair Display", "Montserrat", "Dancing Script", "Quicksand"];

export const DEFAULTS = {
  name: "Un.style",
  desc: "Mặc không để gây chú ý,\nmà để được là chính mình.",
  avatar: "",
  fx: "shimmer",
  brandFont: "Be Vietnam Pro", bodyFont: "Be Vietnam Pro",
  scroll: 1, depth: 50,
  auto: true, tileH: 64, tileW: 440, tileGap: 12,
  bg: "#e7e8e5", ink: "#1b1c1b", brand: "#3b4658", tile: "#ffffff",
  links: [
    { icon: "🎵", label: "TikTok", url: "https://www.tiktok.com/@un.style.219", color: "" },
    { icon: "🛍️", label: "Shopee", url: "https://shopee.vn/un.style", color: "" },
    { icon: "📷", label: "Instagram", url: "https://www.instagram.com/un.style.219", color: "" },
    { icon: "👍", label: "Facebook", url: "https://www.facebook.com/share/1AqhiWdNeG/", color: "" },
    { icon: "💬", label: "Zalo", url: "https://zaloapp.com/qr/p/shk6zwfktqfi", color: "" }
  ],
  foot: "Địa chỉ: Hà Nội\nĐiện thoại: 0984812120\nEmail: Un.style.00@gmail.com"
};

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const V = "https://www.gstatic.com/firebasejs/10.12.2/";

export async function initFB(withAuth = false) {
  if (!useFB) return {};
  const mods = [import(V + "firebase-app.js"), import(V + "firebase-firestore.js")];
  if (withAuth) mods.push(import(V + "firebase-auth.js"));
  const [a, f, u] = await Promise.all(mods);
  const app = a.initializeApp(FIREBASE);
  // Tự chuyển sang long-polling khi mạng/ISP chặn WebChannel (nguyên nhân hay gặp gây lỗi "unavailable" khi lưu/đồng bộ)
  const db = f.initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });
  return { f, u, db, auth: u ? u.getAuth(app) : null };
}

/* Đọc cấu hình.
   - Có Firebase: luôn lấy từ server. Lỗi thì ném ra (strict) hoặc dùng bản mặc định, KHÔNG dùng localStorage
     (localStorage chỉ có trên 1 thiết bị nên sẽ làm các thiết bị lệch nhau).
   - Không có Firebase (chế độ thử): dùng localStorage. */
export async function load(fb, strict = false) {
  if (fb.db) {
    try {
      const get = fb.f.getDocFromServer || fb.f.getDoc;
      const snap = await get(fb.f.doc(fb.db, "site", "config"));
      return snap.exists() ? snap.data() : {};
    } catch (e) {
      console.warn("Firestore:", e.code, e.message);
      if (strict) throw e;
      return {};
    }
  }
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function explain(err) {
  const m = {
    "permission-denied": "Không có quyền ghi. Kiểm tra Firestore Rules và đăng nhập lại.",
    "unauthenticated": "Chưa đăng nhập. Hãy đăng nhập lại.",
    "unavailable": "Không kết nối được tới Firebase. Kiểm tra mạng rồi thử lại.",
    "not-found": "Chưa tạo Firestore Database trong Firebase Console.",
    "failed-precondition": "Firestore chưa được bật hoặc cấu hình sai.",
    "invalid-argument": "Dữ liệu không hợp lệ hoặc quá lớn (giới hạn 1MB).",
    "resource-exhausted": "Vượt hạn mức Firebase hoặc dữ liệu quá lớn.",
    "deadline-exceeded": "Quá thời gian chờ, thử lại.",
    "auth/invalid-credential": "Email hoặc mật khẩu chưa đúng.",
    "auth/wrong-password": "Email hoặc mật khẩu chưa đúng.",
    "auth/user-not-found": "Email hoặc mật khẩu chưa đúng.",
    "auth/invalid-email": "Email không hợp lệ.",
    "auth/too-many-requests": "Thử quá nhiều lần, hãy đợi một lúc rồi thử lại.",
    "auth/network-request-failed": "Lỗi mạng, không kết nối được Firebase.",
    "auth/unauthorized-domain": "Tên miền này chưa được thêm vào Authentication → Settings → Authorized domains.",
    "auth/operation-not-allowed": "Chưa bật đăng nhập Email/Password trong Firebase Authentication."
  };
  return m[err.code] || err.message || "Không lưu được";
}
