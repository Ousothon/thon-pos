import {
  useState,
  useEffect,
  useMemo,
  useContext,
  createContext,
  useRef,
  Component,
} from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Pencil,
  LayoutDashboard,
  UserPlus,
  ChevronDown,
  CheckCircle2,
  ImagePlus,
  Printer,
  Download,
  Globe,
  ImageOff,
  LogOut,
  UserCog,
  Lock,
  ShieldCheck,
  User as UserIcon,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Store,
  Check,
  Clock3,
  XCircle,
  QrCode,
  Menu,
  Sun,
  Moon,
  History,
  Settings as SettingsIcon,
  Wallet,
  Loader2,
  RefreshCw,
  Ban,
  Power,
  Key,
  Crown,
  Award,
  RotateCcw,
  Bell,
  BellOff,
  Camera,
  MoreVertical,
  Banknote,
  Percent,
} from "lucide-react";

// ================= Supabase (online ordering) =================
// 1. Create a free project at https://supabase.com
// 2. In the SQL editor, run the schema from the setup guide (products + online_orders tables)
// 3. Project Settings > API — copy your Project URL and "anon public" key below
// 4. Database > Replication — turn on realtime for the `online_orders` table (optional but recommended)
// 5. Role permissions (who can see which tab) are stored as a JSON blob on
//    `shop_settings` so every device shares one copy. If your project was
//    set up before this existed, run once in the SQL editor:
//      alter table shop_settings add column if not exists roles_json text;
// 6. Sales need an `updated_at` column so that a refund/archive done on one
//    device actually wins the sync against another device's older local
//    copy of the same sale (without it, two devices can permanently
//    disagree on whether a sale was refunded). If your project predates
//    this, run once in the SQL editor:
//      alter table sales add column if not exists updated_at bigint;
// 7. Rejecting/cancelling an online order now requires a reason, and
//    records which staff member did it. If your project predates this,
//    run once in the SQL editor:
//      alter table online_orders add column if not exists status_reason text;
//      alter table online_orders add column if not exists status_by text;
// 8. Super Admin (you, the app's owner) — one account that can see and
//    manage every shop and turn paid features on/off per shop, separate
//    from each shop's own admin/staff PIN logins. Run once in the SQL
//    editor:
//      alter table profiles add column if not exists is_super_admin boolean not null default false;
//      alter table profiles alter column shop_id drop not null;
//      alter table shop_settings add column if not exists features_json text;
//      create or replace function is_super_admin() returns boolean
//        language sql stable as $$
//          select coalesce((select p.is_super_admin from profiles p where p.id = auth.uid()), false);
//        $$;
//      -- add `OR is_super_admin()` to the existing RLS policies on
//      -- shops, shop_settings, products, sales, customers, expenses,
//      -- online_orders, audit_log (everywhere they currently check
//      -- shop_id = auth_shop_id()), then mark your own account:
//      update profiles set is_super_admin = true, shop_id = null
//        where id = (select id from auth.users where email = 'you@yourdomain.com');
//    IMPORTANT for shops already live before this: features_json starts
//    empty, and every premium feature defaults OFF (see DEFAULT_FEATURES
//    below) until a Super Admin turns it on — so right after running the
//    migration, sign in as Super Admin and turn back on whatever features
//    your existing shops were already using, or they'll lose access to
//    those tabs immediately.
// 9. Open Tabs (held/unpaid orders, e.g. a table waiting to pay) used to
//    live in this device's localStorage only, so a tab started on one
//    device never showed up on another signed-in device for the same
//    shop. It now syncs the same way products/sales/customers do. Run
//    once in the SQL editor:
//      create table if not exists open_tabs (
//        id text primary key,
//        shop_id uuid not null references shops(id),
//        table_label text not null default '',
//        items jsonb not null default '[]',
//        discount numeric,
//        discount_mode text,
//        item_discount_total numeric default 0,
//        discount_amt numeric default 0,
//        subtotal numeric default 0,
//        total numeric default 0,
//        customer_id text,
//        created_at bigint,
//        updated_at bigint
//      );
//      alter table open_tabs enable row level security;
//      create policy "shop can manage its own open tabs" on open_tabs
//        for all using (shop_id = auth_shop_id() or is_super_admin())
//        with check (shop_id = auth_shop_id() or is_super_admin());
//    Then Database > Replication — turn on realtime for `open_tabs` too
//    (optional but recommended, same as `online_orders` in step 4).
const SUPABASE_URL = "https://zkstajqlucnvpqxwpuxo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jucFEQ_c8EVFcwPkfhWMoQ_K-sSNyzm";
const supabase =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT")
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ================= Shop identity (multi-tenant RLS) =================
// The database enforces "each shop only sees its own data" using Row Level
// Security tied to a real Supabase Auth session (see the `shops` /
// `profiles` / `auth_shop_id()` setup). That means this device must sign
// in to Supabase with a shop-level account before any read or write to
// products/sales/customers/etc. is allowed — otherwise every request is
// "anonymous" and RLS blocks it.
//
// This is NOT the staff PIN login screen (that stays local, per-till, for
// clocking a cashier in/out). This is a one-time-per-device sign-in that
// identifies WHICH SHOP this device belongs to — see <ShopLoginScreen>
// below. Once signed in, the session is remembered on this device (via
// Supabase's own session storage) so this screen only appears again after
// a manual "switch shop" / sign-out, or on a brand-new device/browser.
// Local cache keys are scoped per shop (see storageKeyFor/sessionKeyFor
// below). LEGACY_STORAGE_KEY/LEGACY_SESSION_KEY are the old, unscoped keys
// used before multi-shop devices existed — kept only so a device's existing
// cache can be migrated into the right shop-scoped slot the first time it
// signs in, instead of silently losing it.
const LEGACY_STORAGE_KEY = "shop-data";
// Remembers which shop a Super Admin was last managing on this device, so
// refreshing the page (see loadShopProfile) can drop them straight back
// into that shop instead of always re-showing <ShopPickerScreen>.
const SUPERADMIN_LAST_SHOP_KEY = "superadmin-lastShop";
const CATEGORY_KEYS = ["beverage", "food", "household", "snack", "other"];

const WEEKDAY_LABELS = {
  km: ["អា", "ច", "អ", "ព", "ព្រ", "សុ", "ស"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const MONTH_LABELS = {
  km: [
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
  ],
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
};

const seedProducts = [
  {
    id: "p1",
    name_km: "ទឹកសុទ្ធ Kulen 500ml",
    name_en: "Kulen Water 500ml",
    category: "beverage",
    price: 0.5,
    stock: 48,
    unit_km: "ដប",
    unit_en: "bottle",
    image: null,
  },
  {
    id: "p2",
    name_km: "កូកាកូឡា កំប៉ុង",
    name_en: "Coca-Cola Can",
    category: "beverage",
    price: 0.75,
    stock: 30,
    unit_km: "កំប៉ុង",
    unit_en: "can",
    image: null,
  },
  {
    id: "p3",
    name_km: "អង្ករសែនក្រអូប ១គីឡូ",
    name_en: "Jasmine Rice 1kg",
    category: "food",
    price: 1.8,
    stock: 20,
    unit_km: "គីឡូ",
    unit_en: "kg",
    image: null,
  },
  {
    id: "p4",
    name_km: "នំបុ័ង",
    name_en: "Bread",
    category: "food",
    price: 0.5,
    stock: 15,
    unit_km: "ដុំ",
    unit_en: "piece",
    image: null,
  },
  {
    id: "p5",
    name_km: "សាប៊ូកក់សក់",
    name_en: "Shampoo",
    category: "household",
    price: 2.2,
    stock: 12,
    unit_km: "ដប",
    unit_en: "bottle",
    image: null,
  },
  {
    id: "p6",
    name_km: "ក្រដាសអនាម័យ",
    name_en: "Tissue Paper",
    category: "household",
    price: 1.0,
    stock: 25,
    unit_km: "ដុំ",
    unit_en: "pack",
    image: null,
  },
  {
    id: "p7",
    name_km: "ស្ករគ្រាប់ Mentos",
    name_en: "Mentos Candy",
    category: "snack",
    price: 0.6,
    stock: 4,
    unit_km: "កញ្ចប់",
    unit_en: "pack",
    image: null,
  },
  {
    id: "p8",
    name_km: "ចាហួយ",
    name_en: "Jelly",
    category: "snack",
    price: 0.3,
    stock: 40,
    unit_km: "ថង់",
    unit_en: "bag",
    image: null,
  },
];

const seedUsers = [
  {
    id: "u1",
    username: "admin",
    password: "admin123",
    name_km: "អ្នកគ្រប់គ្រង",
    name_en: "Administrator",
    role: "admin",
    active: true,
  },
  {
    id: "u2",
    username: "staff",
    password: "staff123",
    name_km: "បុគ្គលិកលក់",
    name_en: "Sales Staff",
    role: "staff",
    active: true,
  },
];

// Default roles seeded on first run. From here on, roles are just data —
// stored in state (see `roles` in POSApp) and editable from the Roles
// Management screen — not hardcoded permission sets. "admin" is the one
// exception: its id and full tab access are locked in code (see the
// Roles Management UI) so the permission system itself can never be
// locked out by an accidental checkbox change.
// Besides `tabs` (which screens a role can even see), roles also carry
// fine-grained *action* permissions for specific tabs — `shiftEdit` /
// `shiftDelete` (correcting or removing a closed shift record) and
// `refundSale` (refunding a completed sale from Reports), on top of the
// relevant tab just being visible. None of these are force-granted to
// "admin" — losing them isn't a lockout risk the way losing Settings/
// Users access would be, so they're fully in Super Admin's hands (per
// shop) like any other role's checkbox in the Roles Management matrix
// (see UsersTab). The values below are just the starting defaults for a
// brand-new shop.
const seedRoles = [
  {
    id: "admin",
    name_km: "អ្នកគ្រប់គ្រង",
    name_en: "Admin",
    builtin: true,
    locked: true,
    tabs: [
      "pos",
      "dashboard",
      "inventory",
      "reports",
      "customers",
      "users",
      "onlineOrders",
      "auditLog",
      "settings",
      "expenses",
    ],
    shiftEdit: true,
    shiftDelete: true,
    refundSale: true,
    customerDelete: true,
  },
  {
    id: "manager",
    name_km: "អ្នកគ្រប់គ្រងសាខា",
    name_en: "Manager",
    builtin: true,
    tabs: [
      "pos",
      "dashboard",
      "inventory",
      "reports",
      "customers",
      "onlineOrders",
      "expenses",
    ],
    shiftEdit: true,
    shiftDelete: false,
    refundSale: true,
    customerDelete: true,
  },
  {
    id: "staff",
    name_km: "បុគ្គលិក",
    name_en: "Staff",
    builtin: true,
    tabs: ["pos", "customers", "onlineOrders"],
    shiftEdit: false,
    shiftDelete: false,
    refundSale: false,
    customerDelete: false,
  },
];

// Premium / paid features. A shop only sees the matching tab or option once
// a Super Admin turns it on for that shop (see `features_json` on
// `shop_settings`, mirroring how `roles_json` already works). Add new
// entries here as new things become paywalled — nothing else needs to
// change for it to show up in the Super Admin panel's toggle list.
const PREMIUM_FEATURES = [
  {
    id: "onlineOrders",
    name_km: "កម្មង់លក់អនឡាញ",
    name_en: "Online Ordering",
    tab: "onlineOrders",
  },
  {
    id: "khqr",
    name_km: "ការទូទាត់ KHQR",
    name_en: "KHQR Payment",
  },
  {
    id: "reports",
    name_km: "របាយការណ៍ និងក្រាហ្វិក",
    name_en: "Reports & Analytics",
    tab: "reports",
  },
  {
    id: "multiUser",
    name_km: "អ្នកប្រើប្រាស់ច្រើននាក់ & សិទ្ធិ",
    name_en: "Multi-user & Roles",
    tab: "users",
  },
  {
    id: "shiftReconciliation",
    name_km: "បិទបញ្ជីវេន និងផ្ទៀងផ្ទាត់សាច់ប្រាក់",
    name_en: "Shift & Cash Reconciliation",
    tab: "shift",
  },
];
// Every feature defaults OFF for a shop until a Super Admin explicitly
// turns it on — a brand-new shop (or a shop_settings row with no
// features_json yet) should never accidentally get paid features for free.
const DEFAULT_FEATURES = PREMIUM_FEATURES.reduce(
  (acc, f) => ({ ...acc, [f.id]: false }),
  {},
);
// Maps a NAV tab id to the feature that gates it. Tabs not listed here are
// always available (not part of the paid-feature system).
const FEATURE_BY_TAB = PREMIUM_FEATURES.reduce(
  (acc, f) => (f.tab ? { ...acc, [f.tab]: f.id } : acc),
  {},
);

// Virtual local (till-PIN) user representing a signed-in Super Admin. Super
// Admins never have a PIN in any shop's local `users` list — they skip that
// screen entirely (see the `isSuperAdmin` checks in POSApp) and act through
// this synthetic identity instead, which is why it isn't in `seedUsers`.
const SUPER_ADMIN_USER = {
  id: "__super_admin__",
  username: "superadmin",
  name_km: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់",
  name_en: "Super Admin",
  role: "admin",
  active: true,
};

const LEGACY_SESSION_KEY = "shop-session";

// Every device can be signed into a different shop at different times (e.g.
// managing shop1 and shop2 from the same browser), so the cache MUST be
// keyed by which shop is currently signed in — otherwise one shop's staff
// list/products/sales can leak into another shop's login screen and local
// state. When there's no Supabase (pure local/offline mode, no shop
// concept), fall back to the legacy unscoped key so single-shop setups
// keep working exactly as before.
const storageKeyFor = (shopId) =>
  shopId ? `shop-data:${shopId}` : LEGACY_STORAGE_KEY;
const sessionKeyFor = (shopId) =>
  shopId ? `shop-session:${shopId}` : LEGACY_SESSION_KEY;

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// Resolves a role's display name for the current language, with graceful
// fallbacks: the other language's name, then the raw role id (covers the
// rare case a user's role was deleted out from under them).
const roleLabel = (role, lang) => {
  if (!role) return "";
  return lang === "en"
    ? role.name_en || role.name_km || role.id
    : role.name_km || role.name_en || role.id;
};
// Generates a short, easy-to-read random password for the "reset password"
// button in the user form — avoids ambiguous characters like 0/O, 1/l/I.
const genPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};
// Normalizes a barcode for comparison purposes only (never for storage/display).
// Two real-world quirks cause "I scanned it once to save the product, then
// scanned it again at the register and it wasn't found" bugs:
//  1. Whitespace/control characters some scanners or the camera decoder
//     tack onto the end of the decoded text.
//  2. UPC-A vs EAN-13 ambiguity — a 12-digit UPC-A barcode is really just an
//     EAN-13 with a leading zero dropped, and different decode paths (native
//     browser BarcodeDetector vs the JS fallback decoder) don't always agree
//     on which one they hand back for the same physical barcode.
// Stripping non-digit characters and dropping leading zeros makes "0500123456789"
// and "500123456789" compare as equal, which is what a cashier actually expects.
const normalizeBarcode = (code) => {
  const trimmed = (code || "").trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  // Only apply leading-zero stripping to plain numeric barcodes (UPC/EAN).
  // Non-numeric codes (e.g. CODE_128 with letters) are compared as-is.
  if (digitsOnly && digitsOnly === trimmed.replace(/\s/g, "")) {
    return digitsOnly.replace(/^0+(?=\d)/, "");
  }
  return trimmed;
};
const fmt = (n) => "$" + (Number(n) || 0).toFixed(2);
// Riel exchange rate — the shop-wide default; editable live from Settings.
const KHR_PER_USD_DEFAULT = 4100;
const fmtKhr = (usd, rate = KHR_PER_USD_DEFAULT) => {
  // Cambodia's smallest common note is 100 riel, so round to the nearest 100.
  const riel =
    Math.round(((Number(usd) || 0) * (Number(rate) || 0)) / 100) * 100;
  return riel.toLocaleString("en-US") + "៛";
};
// ---------------------------------------------------------------------
// QRCode for JavaScript — Copyright (c) 2009 Kazuhiko Arase, MIT license
// http://www.d-project.com/  |  http://www.opensource.org/licenses/mit-license.php
// "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
// Merged from the individual vendor/QRCode/*.js files (as vendored by the
// npm "qrcode-terminal" package) into a single dependency-free function so
// the POS app never needs a runtime network request to render a QR code.
// ---------------------------------------------------------------------
function makeQrMatrix(text) {
  var QRMode = { MODE_8BIT_BYTE: 1 << 2 };
  var QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  var QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
  };

  var QRMath = {
    glog: function (n) {
      if (n < 1) throw new Error("glog(" + n + ")");
      return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
      while (n < 0) n += 255;
      while (n >= 256) n -= 255;
      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256),
  };
  for (var qi = 0; qi < 8; qi++) QRMath.EXP_TABLE[qi] = 1 << qi;
  for (var qi = 8; qi < 256; qi++) {
    QRMath.EXP_TABLE[qi] =
      QRMath.EXP_TABLE[qi - 4] ^
      QRMath.EXP_TABLE[qi - 5] ^
      QRMath.EXP_TABLE[qi - 6] ^
      QRMath.EXP_TABLE[qi - 8];
  }
  for (var qj = 0; qj < 255; qj++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[qj]] = qj;

  function QRPolynomial(num, shift) {
    if (num.length === undefined) throw new Error(num.length + "/" + shift);
    var offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  QRPolynomial.prototype = {
    get: function (index) {
      return this.num[index];
    },
    getLength: function () {
      return this.num.length;
    },
    multiply: function (e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++)
        for (var j = 0; j < e.getLength(); j++)
          num[i + j] ^= QRMath.gexp(
            QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)),
          );
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      var num = new Array(this.getLength());
      for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (var x = 0; x < e.getLength(); x++)
        num[x] ^= QRMath.gexp(QRMath.glog(e.get(x)) + ratio);
      return new QRPolynomial(num, 0).mod(e);
    },
  };

  var QRUtil = {
    PATTERN_POSITION_TABLE: [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170],
    ],
    G15:
      (1 << 10) |
      (1 << 8) |
      (1 << 5) |
      (1 << 4) |
      (1 << 2) |
      (1 << 1) |
      (1 << 0),
    G18:
      (1 << 12) |
      (1 << 11) |
      (1 << 10) |
      (1 << 9) |
      (1 << 8) |
      (1 << 5) |
      (1 << 2) |
      (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function (data) {
      var d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^=
          QRUtil.G15 <<
          (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15));
      }
      return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber: function (data) {
      var d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d ^=
          QRUtil.G18 <<
          (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18));
      }
      return (data << 12) | d;
    },
    getBCHDigit: function (data) {
      var digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    },
    getPatternPosition: function (typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },
    getMask: function (maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001:
          return i % 2 === 0;
        case QRMaskPattern.PATTERN010:
          return j % 3 === 0;
        case QRMaskPattern.PATTERN011:
          return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case QRMaskPattern.PATTERN101:
          return ((i * j) % 2) + ((i * j) % 3) === 0;
        case QRMaskPattern.PATTERN110:
          return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
        case QRMaskPattern.PATTERN111:
          return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i++)
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      return a;
    },
    getLengthInBits: function (mode, type) {
      if (1 <= type && type < 10) return 8;
      else if (type < 27) return 16;
      else if (type < 41) return 16;
      throw new Error("type:" + type);
    },
    getLostPoint: function (qrCode) {
      var moduleCount = qrCode.getModuleCount();
      var lostPoint = 0;
      var row, col;
      for (row = 0; row < moduleCount; row++) {
        for (col = 0; col < moduleCount; col++) {
          var sameCount = 0;
          var dark = qrCode.isDark(row, col);
          for (var r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (var c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r === 0 && c === 0) continue;
              if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += 3 + sameCount - 5;
        }
      }
      for (row = 0; row < moduleCount - 1; row++) {
        for (col = 0; col < moduleCount - 1; col++) {
          var count = 0;
          if (qrCode.isDark(row, col)) count++;
          if (qrCode.isDark(row + 1, col)) count++;
          if (qrCode.isDark(row, col + 1)) count++;
          if (qrCode.isDark(row + 1, col + 1)) count++;
          if (count === 0 || count === 4) lostPoint += 3;
        }
      }
      for (row = 0; row < moduleCount; row++) {
        for (col = 0; col < moduleCount - 6; col++) {
          if (
            qrCode.isDark(row, col) &&
            !qrCode.isDark(row, col + 1) &&
            qrCode.isDark(row, col + 2) &&
            qrCode.isDark(row, col + 3) &&
            qrCode.isDark(row, col + 4) &&
            !qrCode.isDark(row, col + 5) &&
            qrCode.isDark(row, col + 6)
          )
            lostPoint += 40;
        }
      }
      for (col = 0; col < moduleCount; col++) {
        for (row = 0; row < moduleCount - 6; row++) {
          if (
            qrCode.isDark(row, col) &&
            !qrCode.isDark(row + 1, col) &&
            qrCode.isDark(row + 2, col) &&
            qrCode.isDark(row + 3, col) &&
            qrCode.isDark(row + 4, col) &&
            !qrCode.isDark(row + 5, col) &&
            qrCode.isDark(row + 6, col)
          )
            lostPoint += 40;
        }
      }
      var darkCount = 0;
      for (col = 0; col < moduleCount; col++)
        for (row = 0; row < moduleCount; row++)
          if (qrCode.isDark(row, col)) darkCount++;
      var ratio =
        Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    },
  };

  function QR8bitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
  }
  QR8bitByte.prototype = {
    getLength: function () {
      return this.data.length;
    },
    write: function (buffer) {
      for (var i = 0; i < this.data.length; i++)
        buffer.put(this.data.charCodeAt(i), 8);
    },
  };

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function (index) {
      var bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    },
    put: function (num, length) {
      for (var i = 0; i < length; i++)
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    },
    getLengthInBits: function () {
      return this.length;
    },
    putBit: function (bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
      this.length++;
    },
  };

  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
  QRRSBlock.RS_BLOCK_TABLE = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12],
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
  ];
  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock === undefined) throw new Error("bad rs block");
    var length = rsBlock.length / 3;
    var list = [];
    for (var i = 0; i < length; i++) {
      var count = rsBlock[i * 3 + 0];
      var totalCount = rsBlock[i * 3 + 1];
      var dataCount = rsBlock[i * 3 + 2];
      for (var j = 0; j < count; j++)
        list.push(new QRRSBlock(totalCount, dataCount));
    }
    return list;
  };
  QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectLevel.M:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectLevel.Q:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectLevel.H:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return undefined;
    }
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  QRCodeModel.PAD0 = 0xec;
  QRCodeModel.PAD1 = 0x11;
  QRCodeModel.prototype = {
    addData: function (data) {
      var newData = new QR8bitByte(data);
      this.dataList.push(newData);
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (
        row < 0 ||
        this.moduleCount <= row ||
        col < 0 ||
        this.moduleCount <= col
      )
        throw new Error(row + "," + col);
      return this.modules[row][col];
    },
    getModuleCount: function () {
      return this.moduleCount;
    },
    make: function () {
      if (this.typeNumber < 1) {
        var typeNumber = 1;
        for (typeNumber = 1; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(
            typeNumber,
            this.errorCorrectLevel,
          );
          var buffer = new QRBitBuffer();
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++)
            totalDataCount += rsBlocks[i].dataCount;
          for (var x = 0; x < this.dataList.length; x++) {
            var data = this.dataList[x];
            buffer.put(data.mode, 4);
            buffer.put(
              data.getLength(),
              QRUtil.getLengthInBits(data.mode, typeNumber),
            );
            data.write(buffer);
          }
          if (buffer.getLengthInBits() <= totalDataCount * 8) break;
        }
        this.typeNumber = typeNumber;
      }
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (var col = 0; col < this.moduleCount; col++)
          this.modules[row][col] = null;
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) this.setupTypeNumber(test);
      if (this.dataCache === null)
        this.dataCache = QRCodeModel.createData(
          this.typeNumber,
          this.errorCorrectLevel,
          this.dataList,
        );
      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if (
            (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
            (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4)
          ) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    getBestMaskPattern: function () {
      var minLostPoint = 0;
      var pattern = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    },
    setupTimingPattern: function () {
      for (var r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] !== null) continue;
        this.modules[r][6] = r % 2 === 0;
      }
      for (var c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] !== null) continue;
        this.modules[6][c] = c % 2 === 0;
      }
    },
    setupPositionAdjustPattern: function () {
      var pos = QRUtil.getPatternPosition(this.typeNumber);
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i];
          var col = pos[j];
          if (this.modules[row][col] !== null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (
                Math.abs(r) === 2 ||
                Math.abs(c) === 2 ||
                (r === 0 && c === 0)
              ) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTypeNumber: function (test) {
      var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      var mod;
      for (var i = 0; i < 18; i++) {
        mod = !test && ((bits >> i) & 1) === 1;
        this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] =
          mod;
      }
      for (var x = 0; x < 18; x++) {
        mod = !test && ((bits >> x) & 1) === 1;
        this.modules[(x % 3) + this.moduleCount - 8 - 3][Math.floor(x / 3)] =
          mod;
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);
      var mod;
      for (var v = 0; v < 15; v++) {
        mod = !test && ((bits >> v) & 1) === 1;
        if (v < 6) this.modules[v][8] = mod;
        else if (v < 8) this.modules[v + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + v][8] = mod;
      }
      for (var h = 0; h < 15; h++) {
        mod = !test && ((bits >> h) & 1) === 1;
        if (h < 8) this.modules[8][this.moduleCount - h - 1] = mod;
        else if (h < 9) this.modules[8][15 - h - 1 + 1] = mod;
        else this.modules[8][15 - h - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function (data, maskPattern) {
      var inc = -1;
      var row = this.moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              var dark = false;
              if (byteIndex < data.length)
                dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              var mask = QRUtil.getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
  };
  QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    var buffer = new QRBitBuffer();
    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(
        data.getLength(),
        QRUtil.getLengthInBits(data.mode, typeNumber),
      );
      data.write(buffer);
    }
    var totalDataCount = 0;
    for (var x = 0; x < rsBlocks.length; x++)
      totalDataCount += rsBlocks[x].dataCount;
    if (buffer.getLengthInBits() > totalDataCount * 8)
      throw new Error("code length overflow");
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCodeModel.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCodeModel.PAD1, 8);
    }
    return QRCodeModel.createBytes(buffer, rsBlocks);
  };
  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);
    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcdata[r].length; i++)
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;
      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var x = 0; x < ecdata[r].length; x++) {
        var modIndex = x + modPoly.getLength() - ecdata[r].length;
        ecdata[r][x] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    var totalCodeCount = 0;
    for (var y = 0; y < rsBlocks.length; y++)
      totalCodeCount += rsBlocks[y].totalCount;
    var data = new Array(totalCodeCount);
    var index = 0;
    for (var z = 0; z < maxDcCount; z++)
      for (var s = 0; s < rsBlocks.length; s++)
        if (z < dcdata[s].length) data[index++] = dcdata[s][z];
    for (var xx = 0; xx < maxEcCount; xx++)
      for (var t = 0; t < rsBlocks.length; t++)
        if (xx < ecdata[t].length) data[index++] = ecdata[t][xx];
    return data;
  };

  var qr = new QRCodeModel(-1, QRErrorCorrectLevel.M);
  qr.addData(text);
  qr.make();
  var size = qr.getModuleCount();
  var matrix = new Array(size);
  for (var row = 0; row < size; row++) {
    matrix[row] = new Array(size);
    for (var col = 0; col < size; col++) matrix[row][col] = qr.isDark(row, col);
  }
  return matrix;
}

// ---------------- Bakong KHQR (dynamic, amount-encoded QR) ----------------
// Builds an EMVCo-based "KHQR" payload string per the National Bank of
// Cambodia's Bakong spec, with a transaction amount baked in (Point of
// Initiation Method "12" = dynamic, vs "11" = static/any-amount).
// This only uses the standard/public tag set (00,01,29,52,53,54,58,59,60,63)
// — bank apps like ABA add their own proprietary tag (40) with a P2P
// reference on top, but that's not required for a Bakong-compliant scanner
// to read the amount and account correctly.
// Verified against a real decoded ABA static KHQR: the CRC16 implementation
// below reproduces that QR's checksum byte-for-byte.
const KHQR_CURRENCY_CODE = { usd: "840", khr: "116" };
// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflect) — the checksum
// algorithm EMVCo QR codes use for the trailing tag 63.
const khqrCrc16 = (str) => {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};
// tag/length/value helper — length is always 2 digits, per EMVCo.
const khqrTlv = (tag, value) =>
  tag + String(value.length).padStart(2, "0") + value;
// Builds the full dynamic KHQR string. `accountId` is the Bakong Account ID
// (format like "name@bank", found in the Bakong app or decoded from a bank
// app's own static QR). `amount` is a plain number in the given currency
// ('usd' | 'khr'); KHR amounts are whole numbers, USD amounts keep cents.
const buildDynamicKhqr = ({
  accountId,
  merchantName,
  merchantCity,
  bankName,
  amount,
  currency = "usd",
}) => {
  if (!accountId || !merchantName || !merchantCity) return null;
  const amt =
    currency === "khr"
      ? String(Math.max(0, Math.round(Number(amount) || 0)))
      : Math.max(0, Number(amount) || 0).toFixed(2);
  const accountInfo =
    khqrTlv("00", accountId) + (bankName ? khqrTlv("02", bankName) : "");
  const payload =
    khqrTlv("00", "01") + // Payload Format Indicator
    khqrTlv("01", "12") + // Point of Initiation Method: 12 = dynamic (fixed amount)
    khqrTlv("29", accountInfo) + // Individual/merchant account info
    khqrTlv("52", "0000") + // Merchant category code (unset)
    khqrTlv("53", KHQR_CURRENCY_CODE[currency] || KHQR_CURRENCY_CODE.usd) +
    khqrTlv("54", amt) + // Transaction amount
    khqrTlv("58", "KH") +
    khqrTlv("59", merchantName.toUpperCase().slice(0, 25)) +
    khqrTlv("60", merchantCity.toUpperCase().slice(0, 15)) +
    "6304"; // CRC tag+length, value appended below
  return payload + khqrCrc16(payload);
};

// Loyalty points redemption rate — how many points equal $1 of discount.
// Change this single number to adjust the rate shop-wide.
const POINTS_PER_DOLLAR = 100;

// Customer loyalty tier based on lifetime spend — purely a visual badge in
// the Customers tab, doesn't affect discounts or points math.
const CUSTOMER_TIER_THRESHOLDS = { gold: 500, silver: 200, bronze: 50 };
const customerTier = (totalSpent) => {
  const spent = Number(totalSpent) || 0;
  if (spent >= CUSTOMER_TIER_THRESHOLDS.gold) return "gold";
  if (spent >= CUSTOMER_TIER_THRESHOLDS.silver) return "silver";
  if (spent >= CUSTOMER_TIER_THRESHOLDS.bronze) return "bronze";
  return null;
};

// ---------------- i18n ----------------
const STRINGS = {
  shopNameDefault: { km: "ហាង POS", en: "My Shop" },
  tagline: { km: "ប្រព័ន្ធគ្រប់គ្រងលក់", en: "Sales management system" },
  todaySales: { km: "ថ្ងៃនេះលក់បាន", en: "Today's sales" },
  loading: { km: "កំពុងផ្ទុកទិន្នន័យ...", en: "Loading data..." },
  darkMode: { km: "ម៉ូតងងឹត", en: "Dark mode" },
  lightMode: { km: "ម៉ូតភ្លឺ", en: "Light mode" },

  nav_pos: { km: "លក់ទំនិញ", en: "Checkout" },
  nav_dashboard: { km: "ទិដ្ឋភាពទូទៅ", en: "Dashboard" },
  nav_inventory: { km: "ស្តុកទំនិញ", en: "Inventory" },
  nav_reports: { km: "របាយការណ៍", en: "Reports" },
  nav_customers: { km: "អតិថិជន", en: "Customers" },

  cat_all: { km: "ទាំងអស់", en: "All" },
  cat_beverage: { km: "ភេសជ្ជៈ", en: "Beverage" },
  cat_food: { km: "អាហារ", en: "Food" },
  cat_household: { km: "របស់ប្រើប្រាស់ប្រចាំថ្ងៃ", en: "Household" },
  cat_snack: { km: "ជីវជាតិ", en: "Snacks" },
  cat_other: { km: "ផ្សេងៗ", en: "Other" },

  manageCategories: { km: "គ្រប់គ្រងប្រភេទ", en: "Manage categories" },
  manageCategories_subtitle: {
    km: "បន្ថែម ឬលុបប្រភេទទំនិញតាមអាជីវកម្មរបស់អ្នក",
    en: "Add or remove product categories for your shop",
  },
  cat_addBtn: { km: "បន្ថែមប្រភេទថ្មី", en: "Add category" },
  cat_labelKm: { km: "ឈ្មោះ (ខ្មែរ)", en: "Name (Khmer)" },
  cat_labelEn: { km: "ឈ្មោះ (អង់គ្លេស)", en: "Name (English)" },
  cat_deleteConfirm: {
    km: "តើអ្នកចង់លុបប្រភេទនេះមែនទេ?",
    en: "Delete this category?",
  },
  cat_inUse: {
    km: "មិនអាចលុបបានទេ ព្រោះមានទំនិញ {count} កំពុងប្រើប្រភេទនេះ",
    en: "Can't delete — {count} product(s) still use this category",
  },
  cat_nameRequired: {
    km: "សូមបញ្ចូលឈ្មោះប្រភេទ",
    en: "Please enter a category name",
  },
  cat_duplicateKey: {
    km: "ប្រភេទនេះមានរួចហើយ",
    en: "This category already exists",
  },
  toast_categoryAdded: { km: "បានបន្ថែមប្រភេទ", en: "Category added" },
  toast_categoryDeleted: { km: "បានលុបប្រភេទ", en: "Category deleted" },

  searchProducts: { km: "ស្វែងរកទំនិញ...", en: "Search products..." },
  noProductsFound: { km: "រកមិនឃើញទំនិញ", en: "No products found" },
  clearSearch: { km: "សម្អាតការស្វែងរក", en: "Clear search" },
  outOfStock: { km: "អស់ស្តុក", en: "Out of stock" },

  invoice: { km: "វិក្កយបត្រ", en: "Invoice" },
  walkInCustomer: { km: "អតិថិជនធម្មតា (មិនកំណត់)", en: "Walk-in customer" },
  emptyCart: { km: "មិនទាន់មានទំនិញនៅឡើយ", en: "No items added yet" },
  clearCart: { km: "សម្អាតកន្ត្រក", en: "Clear cart" },
  subtotal: { km: "សរុបរង", en: "Subtotal" },
  discountAmount: { km: "បញ្ចុះតម្លៃ ($)", en: "Discount ($)" },
  discountLabel: { km: "បញ្ចុះតម្លៃ", en: "Discount" },
  itemDiscountLabel: {
    km: "បញ្ចុះតម្លៃទំនិញ",
    en: "Item Discount",
  },
  itemDiscountLine: {
    km: "បញ្ចុះតម្លៃ ({percent}%)",
    en: "Discount_Item({percent}%)",
  },
  splitLine: { km: "ញែកជាបន្ទាត់ថ្មី", en: "Split line" },
  openTabsLabel: { km: "Order កំពុងបើក", en: "Open Tabs" },
  tableLabel_field: { km: "លេខ/ឈ្មោះតុ", en: "Table" },
  tableLabelPlaceholder: {
    km: "ឧ. តុ 5 / VIP1",
    en: "e.g. Table 5 / VIP1",
  },
  holdTabBtn: {
    km: "រក្សាទុក & Print (មិនទាន់បង់)",
    en: "Hold & Print (unpaid)",
  },
  editingTabBadge: {
    km: "កំពុងកែ order តុ {table}",
    en: "Editing tab — {table}",
  },
  noOpenTabs: { km: "មិនមាន order កំពុងបើកទេ", en: "No open tabs" },
  resumeTabBtn: { km: "បន្ត", en: "Resume" },
  cancelTabBtn: { km: "លុប", en: "Cancel" },
  unpaidBillTitle: { km: "វិក្កយបត្រ (មិនទាន់បង់)", en: "Bill (Unpaid)" },
  customerDiscountBadge: {
    km: "សមាជិកនេះមានបញ្ចុះតម្លៃ {percent}%",
    en: "{percent}% member discount",
  },
  reapplyDiscount: { km: "គណនាឡើងវិញ", en: "Recalculate" },
  fieldDiscountPercent: {
    km: "ភាគរយបញ្ចុះតម្លៃប្រចាំសមាជិក (%)",
    en: "Member discount (%)",
  },
  th_discountPercent: { km: "បញ្ចុះតម្លៃ", en: "Discount" },
  chartTitle: { km: "និន្នាការលក់", en: "Sales trend" },
  chartNoData: { km: "មិនទាន់មានទិន្នន័យលក់នៅឡើយ", en: "No sales data yet" },
  total: { km: "សរុប", en: "Total" },
  paymentReceived: { km: "ប្រាក់ទទួល", en: "Cash received" },
  exactAmount: { km: "គ្រប់ចំនួន", en: "Exact" },
  changeDue: { km: "ប្រាក់អាប់", en: "Change due" },
  completeSale: { km: "បញ្ចប់ការលក់", en: "Complete sale" },

  toast_saleSuccess: {
    km: "លក់ទំនិញបានជោគជ័យ",
    en: "Sale completed successfully",
  },
  toast_tableRequired: {
    km: "សូមបញ្ចូលលេខ/ឈ្មោះតុជាមុនសិន",
    en: "Please enter a table name/number",
  },
  toast_tabSaved: {
    km: "បានរក្សាទុក order សម្រាប់តុ {table}",
    en: "Order held for table {table}",
  },
  confirmCancelTab: {
    km: "លុប order នេះចោល? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ",
    en: "Cancel this held order? This can't be undone.",
  },
  toast_selectProduct: {
    km: "សូមជ្រើសរើសទំនិញជាមុនសិន",
    en: "Please add at least one item",
  },
  toast_insufficientPayment: {
    km: "ចំនួនទឹកប្រាក់ទូទាត់មិនគ្រប់ចំនួន",
    en: "Payment amount is not enough",
  },
  toast_insufficientStock: {
    km: "ស្តុកមិនគ្រប់គ្រាន់",
    en: "Not enough stock",
  },
  toast_saveFailed: { km: "រក្សាទុកមិនបានសម្រេច", en: "Failed to save data" },
  toast_fillRequired: {
    km: "សូមបំពេញព័ត៌មានឱ្យគ្រប់",
    en: "Please fill in all required fields",
  },
  toast_productUpdated: { km: "កែប្រែទំនិញរួចរាល់", en: "Product updated" },
  toast_productAdded: { km: "បន្ថែមទំនិញរួចរាល់", en: "Product added" },
  toast_productDeleted: { km: "លុបទំនិញរួចរាល់", en: "Product deleted" },
  toast_customerRequired: {
    km: "សូមបញ្ចូលឈ្មោះអតិថិជន",
    en: "Please enter customer name",
  },
  toast_customerUpdated: { km: "កែប្រែអតិថិជនរួចរាល់", en: "Customer updated" },
  toast_customerAdded: { km: "បន្ថែមអតិថិជនរួចរាល់", en: "Customer added" },
  toast_customerDeleted: { km: "លុបអតិថិជនរួចរាល់", en: "Customer deleted" },
  toast_shopNameSaved: { km: "បានរក្សាទុកឈ្មោះហាង", en: "Shop name saved" },

  dash_title: { km: "ទិដ្ឋភាពទូទៅ", en: "Dashboard" },
  dash_subtitle: {
    km: "សង្ខេបស្ថានភាពហាងរបស់អ្នក",
    en: "Your shop's summary at a glance",
  },
  stat_todayRevenue: { km: "ចំណូលថ្ងៃនេះ", en: "Today's revenue" },
  stat_todayTx: { km: "ចំនួនប្រតិបត្តិការថ្ងៃនេះ", en: "Today's transactions" },
  stat_totalRevenue: { km: "ចំណូលសរុប", en: "Total revenue" },
  stat_stockValue: { km: "តម្លៃស្តុកសរុប", en: "Total stock value" },
  dash_salesTrend: {
    km: "និន្នាការលក់ ៧ថ្ងៃចុងក្រោយ",
    en: "Sales trend (last 7 days)",
  },
  lowStockTitle: { km: "ស្តុកជិតអស់", en: "Low stock alert" },
  noLowStock: {
    km: "គ្មានទំនិញជិតអស់ស្តុកទេ 🎉",
    en: "No products running low 🎉",
  },
  manageStock: { km: "គ្រប់គ្រងស្តុក →", en: "Manage inventory →" },
  recentSales: { km: "ការលក់ថ្មីៗ", en: "Recent sales" },
  noSalesYet: { km: "មិនទាន់មានប្រតិបត្តិការទេ", en: "No transactions yet" },
  viewReports: { km: "មើលរបាយការណ៍ →", en: "View reports →" },
  itemsWord: { km: "មុខ", en: "items" },

  inv_subtitle: { km: "{count} ប្រភេទទំនិញ", en: "{count} products" },
  addProduct: { km: "បន្ថែមទំនិញ", en: "Add product" },
  allCategories: { km: "គ្រប់ប្រភេទ", en: "All categories" },
  th_product: { km: "ឈ្មោះទំនិញ", en: "Product" },
  th_category: { km: "ប្រភេទ", en: "Category" },
  th_price: { km: "តម្លៃ", en: "Price" },
  th_margin: { km: "ចំណេញ/ឯកតា", en: "Margin/unit" },
  th_stock: { km: "ស្តុក", en: "Stock" },
  noProducts: { km: "មិនមានទំនិញ", en: "No products" },

  editProduct: { km: "កែប្រែទំនិញ", en: "Edit product" },
  deleteProduct: { km: "លុបទំនិញ", en: "Delete" },
  addProductTitle: { km: "បន្ថែមទំនិញថ្មី", en: "Add new product" },
  fieldName: { km: "ឈ្មោះទំនិញ", en: "Product name" },
  fieldNamePlaceholder: { km: "ឧ. ទឹកសុទ្ធ 500ml", en: "e.g. Water 500ml" },
  fieldCategory: { km: "ប្រភេទ", en: "Category" },
  fieldPrice: { km: "តម្លៃ ($)", en: "Price ($)" },
  fieldCost: { km: "តម្លៃដើម ($)", en: "Cost ($)" },
  fieldStock: { km: "ស្តុក", en: "Stock" },
  fieldUnit: { km: "ឯកតា", en: "Unit" },
  fieldUnitPlaceholder: {
    km: "ឧ. ដប, កញ្ចប់, គីឡូ",
    en: "e.g. bottle, pack, kg",
  },
  fieldPhoto: { km: "រូបភាពទំនិញ", en: "Product photo" },
  uploadPhoto: { km: "ផ្ទុករូបភាព", en: "Upload photo" },
  changePhoto: { km: "ប្តូររូបភាព", en: "Change photo" },
  removePhoto: { km: "លុបរូបភាព", en: "Remove" },
  save: { km: "រក្សាទុក", en: "Save" },
  confirmCancel: { km: "បោះបង់", en: "Cancel" },
  confirmDelete: { km: "លុប", en: "Delete" },
  confirmDialog_irreversible: {
    km: "សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ",
    en: "This action cannot be undone",
  },

  rep_title: { km: "របាយការណ៍លក់", en: "Sales reports" },
  rep_subtitle: { km: "វិភាគការលក់តាមកំឡុងពេល", en: "Analyze sales over time" },
  range_today: { km: "ថ្ងៃនេះ", en: "Today" },
  range_week: { km: "៧ថ្ងៃចុងក្រោយ", en: "Last 7 days" },
  range_month: { km: "ខែនេះ", en: "This month" },
  range_all: { km: "ទាំងអស់", en: "All time" },
  stat_revenue: { km: "ចំណូល", en: "Revenue" },
  stat_transactions: { km: "ប្រតិបត្តិការ", en: "Transactions" },
  stat_avgTx: { km: "មធ្យមភាគ/ប្រតិបត្តិការ", en: "Avg. per sale" },
  stat_itemsSold: { km: "ចំនួនទំនិញលក់បាន", en: "Items sold" },
  stat_profit: { km: "ចំណេញដុល", en: "Gross profit" },
  stat_netProfit: { km: "ចំណេញសុទ្ធ", en: "Net profit" },
  topProducts: { km: "ទំនិញលក់ដាច់បំផុត", en: "Best-selling products" },
  noData: { km: "មិនមានទិន្នន័យ", en: "No data yet" },
  transactions: { km: "ប្រតិបត្តិការ ({count})", en: "Transactions ({count})" },
  noTransactions: { km: "មិនមានប្រតិបត្តិការ", en: "No transactions" },
  exportCsv: { km: "នាំចេញ Excel (CSV)", en: "Export Excel (CSV)" },

  archive_manageBtn: { km: "គ្រប់គ្រង Archive", en: "Manage archive" },
  archive_title: {
    km: "ប្រតិបត្តិការចាស់ (Archive)",
    en: "Archived transactions",
  },
  archive_subtitle: {
    km: "{count} ប្រតិបត្តិការត្រូវបានទុកក្រៅរបាយការណ៍សកម្ម — មិនត្រូវបានលុបទេ",
    en: "{count} kept out of active reports — not deleted",
  },
  archive_cutoffLabel: {
    km: "Archive ទិន្នន័យលក់ដែលចាស់ជាង៖",
    en: "Archive sales older than:",
  },
  archive_3m: { km: "៣ខែ", en: "3 months" },
  archive_6m: { km: "៦ខែ", en: "6 months" },
  archive_12m: { km: "១ឆ្នាំ", en: "12 months" },
  archive_runBtn: { km: "ចាប់ផ្តើម Archive", en: "Archive now" },
  archive_empty: {
    km: "មិនទាន់មានទិន្នន័យក្នុង Archive ទេ",
    en: "No archived data yet",
  },
  archive_restore: { km: "Restore", en: "Restore" },
  archive_restoreAll: { km: "Restore ទាំងអស់", en: "Restore all" },
  archive_export: { km: "នាំចេញ Archive (file)", en: "Export archive (file)" },
  archive_import: { km: "នាំចូល Archive ពី file", en: "Import archive file" },
  archive_backToActive: { km: "ត្រឡប់ទៅសកម្ម", en: "Back to active" },
  archive_viewBtn: {
    km: "មើល Archive ({count})",
    en: "View archive ({count})",
  },
  toast_archived: {
    km: "បាន Archive {count} ប្រតិបត្តិការ",
    en: "Archived {count} transactions",
  },
  toast_restored: { km: "បាន Restore ទិន្នន័យត្រឡប់មកវិញ", en: "Restored" },
  toast_restoredAll: {
    km: "បាន Restore ទិន្នន័យទាំងអស់ត្រឡប់មកវិញ",
    en: "Restored all archived data",
  },
  toast_nothingToArchive: {
    km: "គ្មានទិន្នន័យត្រូវ Archive ទេ",
    en: "Nothing to archive",
  },
  toast_imported: {
    km: "បាននាំចូល {count} កំណត់ត្រា",
    en: "Imported {count} records",
  },
  toast_importFailed: {
    km: "នាំចូលបរាជ័យ — file មិនត្រឹមត្រូវ",
    en: "Import failed — invalid file",
  },
  archive_finishedBtn: {
    km: "Archive ការបញ្ជាទិញរួចរាល់",
    en: "Archive finished orders",
  },
  archive_ordersSubtitle: {
    km: "{count} ការបញ្ជាទិញត្រូវបានទុកក្រៅបញ្ជីសកម្ម — មិនត្រូវបានលុបទេ",
    en: "{count} kept out of the active list — not deleted",
  },
  archive_ordersEmpty: {
    km: "មិនទាន់មានការបញ្ជាទិញក្នុង Archive ទេ",
    en: "No archived orders yet",
  },
  archive_single: { km: "Archive", en: "Archive" },
  archive_deletePermanent: { km: "លុបជាអចិន្ត្រៃយ៍", en: "Delete permanently" },
  archive_deleteAllPermanent: {
    km: "លុបទាំងអស់ជាអចិន្ត្រៃយ៍",
    en: "Delete all permanently",
  },
  order_deleteConfirmTitle: {
    km: "លុបការបញ្ជាទិញនេះជាអចិន្ត្រៃយ៍?",
    en: "Delete this order permanently?",
  },
  order_deleteConfirmMsg: {
    km: "ទិន្នន័យនេះនឹងលុបចោលជាអចិន្ត្រៃយ៍ ហើយមិនអាច Restore មកវិញបានទេ។",
    en: "This will be permanently deleted and cannot be restored.",
  },
  order_deleteAllConfirmTitle: {
    km: "លុប {count} ការបញ្ជាទិញក្នុង Archive ជាអចិន្ត្រៃយ៍?",
    en: "Delete {count} archived orders permanently?",
  },
  order_deleteAllConfirmMsg: {
    km: "ការបញ្ជាទិញទាំងអស់ក្នុង Archive នេះនឹងលុបចោលជាអចិន្ត្រៃយ៍ ហើយមិនអាច Restore មកវិញបានទេ។",
    en: "All orders in this archive will be permanently deleted and cannot be restored.",
  },
  toast_orderDeleted: { km: "បានលុបការបញ្ជាទិញរួចរាល់", en: "Order deleted" },
  toast_ordersDeletedAll: {
    km: "បានលុប {count} ការបញ្ជាទិញជាអចិន្ត្រៃយ៍",
    en: "Permanently deleted {count} orders",
  },

  refund: { km: "សងវិញ", en: "Refund" },
  refunded: { km: "បានសងវិញ", en: "Refunded" },
  refund_confirmTitle: {
    km: "សងទំនិញត្រលប់?",
    en: "Refund this sale?",
  },
  refund_confirmMsg: {
    km: "ស្តុកទំនិញនឹងត្រូវបានបញ្ចូលមកវិញ ហើយប្រតិបត្តិការនេះនឹងមិនត្រូវបានរាប់ក្នុងចំណូលទៀតទេ។ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។",
    en: "Stock will be added back and this sale will no longer count toward revenue. This can't be undone.",
  },
  toast_refundSuccess: {
    km: "សងទំនិញត្រលប់ដោយជោគជ័យ",
    en: "Sale refunded successfully",
  },

  fieldBarcode: { km: "លេខបាកូដ", en: "Barcode" },
  fieldBarcodePlaceholder: {
    km: "ស្កេន ឬវាយបញ្ចូលដោយដៃ",
    en: "Scan or type manually",
  },
  scanBarcode: { km: "ស្កេនបាកូដ", en: "Scan barcode" },
  scan_modalTitle: {
    km: "ស្កេនបាកូដតាមកាមេរ៉ា",
    en: "Scan barcode with camera",
  },
  scan_instructions: {
    km: "ដាក់បាកូដឲ្យត្រង់ ស្របនឹងប្រអប់ស — ជៀសពន្លឺចាំង",
    en: "Hold the barcode straight inside the box — avoid glare",
  },
  scan_loadingLib: {
    km: "កំពុងបើកកាមេរ៉ា...",
    en: "Starting camera...",
  },
  scan_cameraError: {
    km: "មិនអាចបើកកាមេរ៉ាបានទេ — សូមពិនិត្យការអនុញ្ញាត",
    en: "Couldn't access the camera — check permissions",
  },
  toast_barcodeNotFound: {
    km: "រកមិនឃើញទំនិញដែលមានបាកូដនេះទេ",
    en: "No product found with this barcode",
  },

  cust_subtitle: { km: "{count} នាក់", en: "{count} customers" },
  addCustomer: { km: "បន្ថែមអតិថិជន", en: "Add customer" },
  noCustomersYet: { km: "មិនទាន់មានអតិថិជនទេ", en: "No customers yet" },
  noCustomersYetDesc: {
    km: "បន្ថែមអតិថិជនដំបូងរបស់អ្នក ដើម្បីតាមដានប្រវត្តិទិញ និងពិន្ទុភក្ដីភាព",
    en: "Add your first customer to track purchase history and loyalty points",
  },
  noPhone: { km: "គ្មានលេខទូរស័ព្ទ", en: "No phone number" },
  totalSpent: { km: "ចំណាយសរុប", en: "Total spent" },
  visits: { km: "ចំនួនដងមក", en: "Visits" },
  points: { km: "ពិន្ទុ", en: "Points" },
  editCustomer: { km: "កែប្រែអតិថិជន", en: "Edit customer" },
  addCustomerTitle: { km: "បន្ថែមអតិថិជនថ្មី", en: "Add new customer" },
  fieldCustomerName: { km: "ឈ្មោះ", en: "Name" },
  fieldPhone: { km: "លេខទូរស័ព្ទ", en: "Phone number" },
  cust_searchPlaceholder: {
    km: "ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទ...",
    en: "Search by name or phone...",
  },
  cust_noSearchResults: {
    km: "រកមិនឃើញអតិថិជនដែលត្រូវនឹងការស្វែងរកទេ",
    en: "No customers match your search",
  },
  cust_deleteConfirm: {
    km: "តើអ្នកចង់លុបអតិថិជននេះមែនទេ?",
    en: "Delete this customer?",
  },
  cust_tier_gold: { km: "សមាជិកមាស", en: "Gold member" },
  cust_tier_silver: { km: "សមាជិកប្រាក់", en: "Silver member" },
  cust_tier_bronze: { km: "សមាជិកសំរិទ្ធ", en: "Bronze member" },

  paymentSuccess: { km: "ការទូទាត់បានជោគជ័យ", en: "Payment successful" },
  close: { km: "បិទ", en: "Close" },
  cancel: { km: "បោះបង់", en: "Cancel" },
  print: { km: "បោះពុម្ព", en: "Print" },

  login_title: { km: "ចូលប្រើប្រព័ន្ធ", en: "Sign in" },
  login_subtitle: {
    km: "សូមបញ្ចូលឈ្មោះគណនី និងលេខសម្ងាត់",
    en: "Enter your username and password",
  },
  fieldUsername: { km: "ឈ្មោះគណនី", en: "Username" },
  fieldPassword: { km: "លេខសម្ងាត់", en: "Password" },
  pw_leaveBlank: {
    km: "ទុកទទេ ដើម្បីរក្សាលេខសម្ងាត់ចាស់",
    en: "Leave blank to keep the current password",
  },
  pw_generate: { km: "បង្កើតលេខសម្ងាត់ថ្មី", en: "Generate new password" },
  changePassword: { km: "ប្តូរលេខសម្ងាត់", en: "Change password" },
  fieldCurrentPassword: {
    km: "លេខសម្ងាត់បច្ចុប្បន្ន",
    en: "Current password",
  },
  fieldNewPassword: { km: "លេខសម្ងាត់ថ្មី", en: "New password" },
  fieldConfirmPassword: {
    km: "បញ្ជាក់លេខសម្ងាត់ថ្មី",
    en: "Confirm new password",
  },
  toast_pwChanged: {
    km: "បានប្តូរលេខសម្ងាត់រួចរាល់",
    en: "Password changed successfully",
  },
  toast_pwWrongCurrent: {
    km: "លេខសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ",
    en: "Current password is incorrect",
  },
  toast_pwMismatch: {
    km: "លេខសម្ងាត់ថ្មីទាំងពីរមិនត្រូវគ្នា",
    en: "New passwords don't match",
  },
  toast_pwTooShort: {
    km: "លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ",
    en: "Password must be at least 6 characters",
  },
  user_deleteConfirm: {
    km: "តើអ្នកចង់លុបអ្នកប្រើប្រាស់នេះមែនទេ?",
    en: "Delete this user?",
  },
  loginBtn: { km: "ចូលប្រើប្រព័ន្ធ", en: "Sign in" },
  loginBtnLoading: { km: "កំពុងចូល...", en: "Signing in..." },
  toast_loginFailed: {
    km: "ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ",
    en: "Incorrect username or password",
  },
  toast_loginSuccess: {
    km: "ចូលប្រើប្រព័ន្ធបានជោគជ័យ",
    en: "Signed in successfully",
  },
  logout: { km: "ចាកចេញ", en: "Log out" },
  loggedInAs: { km: "កំពុងប្រើប្រាស់ដោយ", en: "Signed in as" },

  shopLogin_title: { km: "ចូលគណនីហាង", en: "Shop sign-in" },
  shopLogin_subtitle: {
    km: "ចូលម្តងគត់ក្នុងឧបករណ៍នេះ ដើម្បីភ្ជាប់ទៅហាងរបស់អ្នក",
    en: "Sign in once on this device to connect it to your shop",
  },
  shopLogin_email: { km: "អ៊ីមែលហាង", en: "Shop email" },
  shopLogin_password: { km: "លេខសម្ងាត់", en: "Password" },
  shopLogin_submit: { km: "ភ្ជាប់ឧបករណ៍នេះ", en: "Connect this device" },
  shopLogin_submitting: { km: "កំពុងភ្ជាប់...", en: "Connecting..." },
  shopLogin_invalid: {
    km: "អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវ",
    en: "Incorrect email or password",
  },
  shopLogin_failed: {
    km: "មិនអាចភ្ជាប់បានទេ សូមឆែកអ៊ីនធឺណិត",
    en: "Couldn't connect — check your internet connection",
  },
  shopLogin_checking: { km: "កំពុងផ្ទៀងផ្ទាត់...", en: "Checking session..." },
  settings_switchShop: {
    km: "ប្តូរ / ផ្តាច់ហាង",
    en: "Switch / disconnect shop",
  },
  settings_switchShopConfirm: {
    km: "ឧបករណ៍នេះនឹងផ្តាច់ចេញពីហាងបច្ចុប្បន្ន ហើយត្រូវការចូលគណនីហាងម្តងទៀត។ បន្ត?",
    en: "This device will disconnect from the current shop and need shop sign-in again. Continue?",
  },

  nav_users: { km: "អ្នកប្រើប្រាស់", en: "Users" },
  nav_auditLog: { km: "កំណត់ត្រាសកម្មភាព", en: "Audit Log" },
  nav_settings: { km: "ការកំណត់", en: "Settings" },
  nav_superAdmin: { km: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់", en: "Super Admin" },

  shopPicker_title: { km: "ជ្រើសរើសហាង", en: "Choose a shop" },
  shopPicker_subtitle: {
    km: "អ្នកកំពុងចូលជាអ្នកគ្រប់គ្រងជាន់ខ្ពស់ — ជ្រើសរើសហាងមួយដើម្បីគ្រប់គ្រង",
    en: "Signed in as Super Admin — pick a shop to manage",
  },
  shopPicker_empty: {
    km: "មិនទាន់មានហាងនៅឡើយទេ",
    en: "No shops yet",
  },
  shopPicker_refresh: { km: "ផ្ទុកឡើងវិញ", en: "Refresh" },
  shopPicker_signOut: { km: "ចាកចេញ", en: "Sign out" },
  superAdmin_title: {
    km: "គ្រប់គ្រងមុខងារបង់ប្រាក់",
    en: "Manage paid features",
  },
  superAdmin_subtitle: {
    km: "បើក/បិទមុខងារពិសេសសម្រាប់ហាងនេះ — ហាងនឹងឃើញ tab/មុខងារនោះភ្លាមៗ",
    en: "Turn premium features on or off for this shop — they show up for the shop right away",
  },
  superAdmin_currentShop: { km: "ហាងកំពុងគ្រប់គ្រង", en: "Currently managing" },
  superAdmin_switchShop: { km: "ប្តូរហាង", en: "Switch shop" },
  superAdmin_saved: { km: "បានរក្សាទុក", en: "Saved" },
  superAdmin_saveFailed: {
    km: "រក្សាទុកបរាជ័យ — សូមព្យាយាមម្តងទៀត",
    en: "Save failed — please try again",
  },
  nav_expenses: { km: "ចំណាយ", en: "Expenses" },
  nav_shift: { km: "បិទបញ្ជីវេន", en: "Shift" },

  exp_title: { km: "តាមដានចំណាយ", en: "Expense tracking" },
  exp_subtitle: {
    km: "កត់ត្រាចំណាយប្រតិបត្តិការប្រចាំថ្ងៃរបស់ហាង",
    en: "Track your shop's day-to-day operating costs",
  },
  exp_addBtn: { km: "បន្ថែមចំណាយ", en: "Add expense" },
  exp_editTitle: { km: "កែប្រែចំណាយ", en: "Edit expense" },
  exp_addTitle: { km: "បន្ថែមចំណាយថ្មី", en: "Add new expense" },
  exp_date: { km: "កាលបរិច្ឆេទ", en: "Date" },
  datePicker_select: { km: "ជ្រើសរើសកាលបរិច្ឆេទ", en: "Select date" },
  datePicker_clear: { km: "សម្អាត", en: "Clear" },
  datePicker_today: { km: "ថ្ងៃនេះ", en: "Today" },
  exp_category: { km: "ប្រភេទ", en: "Category" },
  exp_amount: { km: "ចំនួនទឹកប្រាក់ ($)", en: "Amount ($)" },
  exp_note: { km: "កំណត់ចំណាំ", en: "Note" },
  exp_addedBy: { km: "កត់ត្រាដោយ", en: "Logged by" },
  exp_cat_electricity: { km: "ថ្លៃភ្លើង", en: "Electricity" },
  exp_cat_water: { km: "ថ្លៃទឹក", en: "Water" },
  exp_cat_rent: { km: "ថ្លៃជួលហាង", en: "Rent" },
  exp_cat_salary: { km: "ប្រាក់បៀវត្សន៍", en: "Salary" },
  exp_cat_transport: { km: "ថ្លៃដឹកជញ្ជូន", en: "Transport" },
  exp_cat_supplies: { km: "សម្ភារៈប្រើប្រាស់", en: "Supplies" },
  exp_cat_other: { km: "ផ្សេងៗ", en: "Other" },
  exp_empty: {
    km: "មិនទាន់មានចំណាយត្រូវបានកត់ត្រាទេ",
    en: "No expenses logged yet",
  },
  exp_deleteConfirm: {
    km: "តើអ្នកចង់លុបចំណាយនេះមែនទេ?",
    en: "Delete this expense?",
  },
  exp_totalThisMonth: {
    km: "ចំណាយសរុបខែនេះ",
    en: "Total expenses this month",
  },
  toast_expenseAdded: { km: "បានបន្ថែមចំណាយ", en: "Expense added" },
  toast_expenseUpdated: { km: "បានកែប្រែចំណាយ", en: "Expense updated" },
  toast_expenseDeleted: { km: "បានលុបចំណាយ", en: "Expense deleted" },
  stat_expenses: { km: "ចំណាយប្រតិបត្តិការ", en: "Operating expenses" },

  shift_subtitle: {
    km: "គ្រប់គ្រងការបើក/បិទវេន និងផ្ទៀងផ្ទាត់សាច់ប្រាក់ក្នុងថត",
    en: "Manage shift open/close and reconcile the cash drawer",
  },
  shift_startTitle: { km: "ចាប់ផ្តើមវេនថ្មី", en: "Start a new shift" },
  shift_startDesc: {
    km: "រាប់លុយក្នុងថតមុនចាប់ផ្តើមលក់ ហើយបញ្ចូលចំនួនទឹកប្រាក់ចាប់ផ្តើម",
    en: "Count the cash in the drawer before you start selling and enter the opening amount",
  },
  shift_openingCash: { km: "លុយចាប់ផ្តើម", en: "Opening cash" },
  shift_startBtn: { km: "ចាប់ផ្តើមវេន", en: "Start shift" },
  shift_started: { km: "ចាប់ផ្តើមវេន", en: "Shift started" },
  shift_startedToast: { km: "បានចាប់ផ្តើមវេនហើយ", en: "Shift started" },
  shift_active: { km: "វេនកំពុងដំណើរការ", en: "Shift in progress" },
  shift_openedBy: { km: "ចាប់ផ្តើមដោយ", en: "Opened by" },
  shift_endBtn: { km: "បិទបញ្ជីវេន", en: "End shift" },
  shift_cashSales: { km: "លក់សាច់ប្រាក់", en: "Cash sales" },
  shift_cashRefunds: { km: "សងប្រាក់វិញ", en: "Cash refunds" },
  shift_expectedCash: { km: "លុយដែលគួរមាន", en: "Expected cash" },
  shift_countedCash: { km: "លុយរាប់បានពិត", en: "Counted cash" },
  shift_adjustments: {
    km: "កែតម្រូវផ្សេងៗ (ស្រេចចិត្ត)",
    en: "Other adjustments (optional)",
  },
  shift_adjustmentsHint: {
    km: "ឧ. លុយបានយកចេញទិញអីវ៉ាន់ ឬចំណាយសាច់ប្រាក់ផ្សេងទៀត (កាត់ចេញពីលុយគួរមាន)",
    en: "e.g. cash taken out for supplies or other petty cash paid out (subtracted from expected)",
  },
  shift_diff: { km: "ភាពខុសគ្នា", en: "Difference" },
  shift_note: { km: "កំណត់ចំណាំ (ស្រេចចិត្ត)", en: "Note (optional)" },
  shift_notePlaceholder: {
    km: "កំណត់ចំណាំបន្ថែម បើមាន...",
    en: "Any extra notes...",
  },
  shift_confirmEnd: { km: "បញ្ជាក់បិទវេន", en: "Confirm & close shift" },
  shift_closed: { km: "បិទវេន", en: "Shift closed" },
  shift_closedToast: { km: "បានបិទវេនរួចរាល់", en: "Shift closed" },
  shift_closedAt: { km: "ពេលបិទវេន", en: "Closed at" },
  shift_closedBy: { km: "បិទដោយ", en: "Closed by" },
  shift_history: { km: "ប្រវត្តិវេន", en: "Shift history" },
  shift_historyEmpty: {
    km: "មិនទាន់មានវេនណាមួយបិទរួចនៅឡើយទេ",
    en: "No shifts closed yet",
  },
  shift_editTitle: { km: "កែប្រែកំណត់ត្រាវេន", en: "Edit shift record" },
  shift_edited: { km: "កែប្រែវេន", en: "Shift edited" },
  shift_editedToast: {
    km: "បានកែប្រែកំណត់ត្រាវេន",
    en: "Shift record updated",
  },
  shift_deleteConfirm: {
    km: "តើអ្នកប្រាកដថាចង់លុបកំណត់ត្រាវេននេះមែនទេ?",
    en: "Delete this shift record?",
  },
  shift_deleted: { km: "លុបវេន", en: "Shift deleted" },
  shift_deletedToast: { km: "បានលុបកំណត់ត្រាវេន", en: "Shift record deleted" },
  shift_editPermission: {
    km: "កែប្រែកំណត់ត្រាវេន",
    en: "Edit shift records",
  },
  shift_deletePermission: {
    km: "លុបកំណត់ត្រាវេន",
    en: "Delete shift records",
  },
  refund_permission: {
    km: "អនុញ្ញាតឲ្យសងលុយវិញ (Refund)",
    en: "Refund sales",
  },
  customerDelete_permission: {
    km: "លុបអតិថិជន",
    en: "Delete customers",
  },

  settings_subtitle: {
    km: "កំណត់ការកំណត់ទូទៅរបស់ហាង",
    en: "Configure general shop settings",
  },
  settings_tab_general: { km: "ទូទៅ", en: "General" },
  settings_tab_payment: { km: "ការទូទាត់ប្រាក់", en: "Payments" },
  settings_tab_currency: { km: "អត្រាប្តូរប្រាក់", en: "Currency" },
  settings_tab_notifications: { km: "ការជូនដំណឹង", en: "Notifications" },
  settings_tab_printing: { km: "បោះពុម្ព", en: "Printing" },
  settings_tab_danger: { km: "តំបន់គ្រោះថ្នាក់", en: "Danger zone" },
  settings_resetSalesData: {
    km: "សម្អាតទិន្នន័យលក់ទាំងអស់",
    en: "Reset all sales data",
  },
  settings_resetSalesDataDesc: {
    km: "លុបប្រវត្តិលក់ ប្រតិបត្តិការ និងតួលេខរបាយការណ៍ទាំងអស់ជាអចិន្ត្រៃយ៍ ត្រឡប់ទៅសូន្យវិញ។ ទំនិញ អតិថិជន ចំណាយ និងអ្នកប្រើប្រាស់ មិនរងផលប៉ះពាល់ទេ។",
    en: "Permanently deletes all sales history, transactions, and report figures back to zero. Products, customers, expenses, and users are not affected.",
  },
  settings_resetSalesDataConfirm: {
    km: "តើអ្នកប្រាកដថាចង់សម្អាតទិន្នន័យលក់ទាំងអស់មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។",
    en: "Are you sure you want to reset all sales data? This action cannot be undone.",
  },
  settings_resetSalesDataDone: {
    km: "បានសម្អាតទិន្នន័យលក់ទាំងអស់ហើយ",
    en: "All sales data has been reset",
  },
  settings_resetStockQty: {
    km: "កំណត់ចំនួនស្តុកទំនិញឡើងវិញទៅសូន្យ",
    en: "Reset all stock quantities to 0",
  },
  settings_resetStockQtyDesc: {
    km: "កំណត់ចំនួនស្តុករបស់រាល់ទំនិញទៅសូន្យ (០) ដោយរក្សាទុកឈ្មោះ តម្លៃ និងព័ត៌មានទំនិញដដែល — សមស្របមុនពេលរាប់ស្តុកថ្មី។",
    en: "Sets every product's stock count to 0 while keeping the product names, prices, and details — useful before a fresh physical stock count.",
  },
  settings_resetStockQtyConfirm: {
    km: "តើអ្នកប្រាកដថាចង់កំណត់ចំនួនស្តុកទំនិញទាំងអស់ទៅសូន្យមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។",
    en: "Are you sure you want to reset all product stock quantities to 0? This action cannot be undone.",
  },
  settings_resetStockQtyDone: {
    km: "បានកំណត់ស្តុកទំនិញទាំងអស់ទៅសូន្យហើយ",
    en: "All stock quantities have been reset to 0",
  },
  settings_deleteAllProducts: {
    km: "លុបទំនិញទាំងអស់",
    en: "Delete all products",
  },
  settings_deleteAllProductsDesc: {
    km: "លុបទំនិញទាំងអស់ចេញពី Inventory ជាអចិន្ត្រៃយ៍ (ឈ្មោះ តម្លៃ ស្តុក រូបភាព)។ ប្រវត្តិលក់មិនរងផលប៉ះពាល់ទេ។",
    en: "Permanently deletes every product from Inventory (name, price, stock, image). Sales history is not affected.",
  },
  settings_deleteAllProductsConfirm: {
    km: "តើអ្នកប្រាកដថាចង់លុបទំនិញទាំងអស់មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។",
    en: "Are you sure you want to delete all products? This action cannot be undone.",
  },
  settings_deleteAllProductsDone: {
    km: "បានលុបទំនិញទាំងអស់ហើយ",
    en: "All products have been deleted",
  },
  settings_resetBlockedByRls: {
    km: "សកម្មភាពនេះត្រូវបានទប់ស្កាត់ដោយការកំណត់សុវត្ថិភាព (RLS) របស់ Supabase — សូមពិនិត្យ Row Level Security policy លើតារាងទាក់ទង ដើម្បីអនុញ្ញាតឲ្យលុប/កែប្រែបាន",
    en: "This action was blocked by Supabase's Row Level Security — check the RLS policy on the relevant table to allow delete/update",
  },
  settings_printTitle: {
    km: "ទំហំក្រដាសបង្កាន់ដៃ",
    en: "Receipt paper size",
  },
  settings_printSubtitle: {
    km: "ជ្រើសរើសទំហំក្រដាសសម្រាប់ម៉ាស៊ីនបោះពុម្ពកាំរស្មីរបស់អ្នក (58mm ឬ 80mm)។ ការកំណត់នេះអនុវត្តតែលើកុំព្យូទ័រ/ឧបករណ៍នេះប៉ុណ្ណោះ",
    en: "Choose the paper width for your thermal receipt printer (58mm or 80mm). This setting applies to this device only",
  },
  settings_printWidth58: { km: "58mm (តូច)", en: "58mm (narrow)" },
  settings_printWidth80: { km: "80mm (ស្តង់ដារ)", en: "80mm (standard)" },
  settings_printSaved: {
    km: "បានរក្សាទុកការកំណត់បោះពុម្ព",
    en: "Print settings saved",
  },
  settings_khrTitle: {
    km: "អត្រាប្តូរប្រាក់រៀល (KHR)",
    en: "Riel exchange rate (KHR)",
  },
  settings_khrSubtitle: {
    km: "ប្រើសម្រាប់បង្ហាញតម្លៃជារៀលនៅ Checkout និងលើវិក្កយបត្រ",
    en: "Used to show riel amounts at checkout and on receipts",
  },
  settings_saveBtn: { km: "រក្សាទុក", en: "Save" },
  settings_saved: { km: "បានរក្សាទុករួចរាល់", en: "Saved" },
  settings_khrPreview: {
    km: "ឧទាហរណ៍៖ $1 = {amount}",
    en: "Example: $1 = {amount}",
  },
  settings_shopTitle: {
    km: "ព័ត៌មានហាង",
    en: "Shop info",
  },
  settings_shopSubtitle: {
    km: "ប្តូររូបភាព និងឈ្មោះហាង បង្ហាញនៅផ្ទាំងម៉ឺនុយ និងលើវិក្កយបត្រ",
    en: "Change the logo and name shown in the sidebar and on receipts",
  },
  settings_shopNameLabel: { km: "ឈ្មោះហាង", en: "Shop name" },
  settings_shopLogoLabel: { km: "រូបភាពហាង (Logo)", en: "Shop logo" },
  uploadLogo: { km: "ផ្ទុករូបភាព", en: "Upload logo" },
  changeLogo: { km: "ប្តូររូបភាព", en: "Change logo" },
  removeLogo: { km: "លុបរូបភាព", en: "Remove logo" },
  settings_shopSaved: { km: "បានរក្សាទុកព័ត៌មានហាង", en: "Shop info saved" },

  settings_paymentTitle: {
    km: "វិធីទូទាត់ប្រាក់ (Online order)",
    en: "Payment methods (Online orders)",
  },
  settings_paymentSubtitle: {
    km: "ជ្រើសរើសវិធីទូទាត់ដែលអតិថិជនអាចជ្រើសបានពេលកម្មង់អនឡាញ",
    en: "Choose which payment methods customers can pick when ordering online",
  },
  settings_payCashLabel: {
    km: "សាច់ប្រាក់ពេលទទួល",
    en: "Cash on pickup/delivery",
  },
  settings_payKhqrLabel: { km: "KHQR ស្កេនទូទាត់", en: "KHQR scan to pay" },
  settings_khqrImageLabel: {
    km: "រូបភាព KHQR របស់ហាង",
    en: "Your shop's KHQR image",
  },
  settings_khqrImageHint: {
    km: "ថតរូប QR code ពីកម្មវិធីធនាគាររបស់អ្នក (ABA, ACLEDA, Wing ។ល។) ហើយផ្ទុកឡើងទីនេះ",
    en: "Screenshot the QR code from your banking app (ABA, ACLEDA, Wing, etc.) and upload it here",
  },
  uploadKhqrImage: { km: "ផ្ទុករូបភាព QR", en: "Upload QR image" },
  changeKhqrImage: { km: "ប្តូររូបភាព QR", en: "Change QR image" },
  removeKhqrImage: { km: "លុបរូបភាព QR", en: "Remove QR image" },
  settings_khqrTooLarge: {
    km: "ឯកសារធំពេក សូមជ្រើសរូបភាពតូចជាង 1MB",
    en: "File too large — please pick an image under 1MB",
  },
  settings_paymentSaved: {
    km: "បានរក្សាទុកការកំណត់ការទូទាត់",
    en: "Payment settings saved",
  },
  settings_khqrLocked: {
    km: "មុខងារ KHQR មិនទាន់បើកសម្រាប់ហាងនេះទេ — សូមទាក់ទងអ្នកគ្រប់គ្រងជាន់ខ្ពស់",
    en: "KHQR isn't turned on for this shop yet — contact your Super Admin",
  },
  settings_khqrNeedsImageWarning: {
    km: "សូមផ្ទុករូបភាព QR ឬបំពេញព័ត៌មាន Dynamic QR សិន មុននឹងបើកមុខងារនេះ",
    en: "Please upload a QR image or fill in the Dynamic QR fields before enabling this",
  },
  settings_khqrDynamicLabel: {
    km: "Dynamic QR (បញ្ចូលចំនួនទឹកប្រាក់ស្វ័យប្រវត្តិ)",
    en: "Dynamic QR (amount auto-encoded)",
  },
  settings_khqrDynamicHint: {
    km: "បង្កើត QR ថ្មីរាល់ការលក់ ដោយបញ្ចូលចំនួនទឹកប្រាក់ត្រង់ក្នុង QR ដោយស្វ័យប្រវត្តិ — អតិថិជនមិនចាំបាច់វាយបញ្ចូលចំនួនទេ។ ត្រូវការ Bakong Account ID (រកបានពី app Bakong ឬ decode ពី QR ធនាគាររបស់អ្នក)។ សូមសាកល្បងស្កេនចំនួនតូចមួយសិន មុននឹងប្រើជាមួយអតិថិជនពិត។",
    en: "Generates a fresh QR for every sale with the amount baked in — customers don't need to type it in. Requires your Bakong Account ID (found in the Bakong app, or decoded from your bank app's QR). Test-scan with a small real amount first before relying on it with customers.",
  },
  settings_khqrAccountIdLabel: {
    km: "Bakong Account ID",
    en: "Bakong Account ID",
  },
  settings_khqrMerchantNameLabel: {
    km: "ឈ្មោះម្ចាស់គណនី (English)",
    en: "Account holder name (English)",
  },
  settings_khqrMerchantCityLabel: { km: "ទីក្រុង", en: "City" },
  settings_khqrBankNameLabel: { km: "ធនាគារ", en: "Bank" },
  optional: { km: "មិនចាំបាច់", en: "optional" },

  checkout_paymentMethod: { km: "វិធីទូទាត់ប្រាក់", en: "Payment method" },
  checkout_payCash: { km: "សាច់ប្រាក់ពេលទទួល", en: "Cash on pickup" },
  checkout_payKhqr: { km: "ស្កេន KHQR ទូទាត់ភ្លាមៗ", en: "Scan KHQR now" },
  pos_payCash: { km: "សាច់ប្រាក់", en: "Cash" },
  pos_payKhqr: { km: "KHQR", en: "KHQR" },
  checkout_khqrInstructions: {
    km: "ស្កេន QR ខាងក្រោមដើម្បីទូទាត់ចំនួន {amount} រួចចុចដាក់ការកម្មង់ខាងក្រោម",
    en: "Scan the QR below to pay {amount}, then submit your order below",
  },
  order_paidVia_cash: { km: "សាច់ប្រាក់", en: "Cash" },
  order_paidVia_khqr: { km: "KHQR", en: "KHQR" },

  settings_soundTitle: {
    km: "សំឡេងជូនដំណឹង",
    en: "Notification sound",
  },
  settings_soundSubtitle: {
    km: "ជ្រើសរើសសំឡេងសម្រាប់ការបញ្ជាទិញអនឡាញថ្មី ឬផ្ទុកសំឡេងផ្ទាល់ខ្លួន",
    en: "Choose the sound for new online orders, or upload your own",
  },
  settings_soundEnableLabel: { km: "បើក/បិទសំឡេង", en: "Enable sound" },
  settings_soundPresetLabel: { km: "សំឡេង", en: "Sound" },
  settings_soundDurationLabel: {
    km: "រយៈពេលបន្លឺសំឡេង (វិនាទី)",
    en: "Ring duration (seconds)",
  },
  settings_soundDurationHint: {
    km: "0 មានន័យថាបន្លឺម្ដងហើយឈប់។ លើសពី 0 វានឹងបន្លឺដដែលៗហើយឈប់ដោយស្វ័យប្រវត្តិបន្ទាប់ពីរយៈពេលនេះ",
    en: "0 means play once. Above 0, it repeats until this many seconds pass, then stops automatically",
  },
  settings_soundUpload: { km: "ផ្ទុកសំឡេងឡើង", en: "Upload sound" },
  settings_soundChange: { km: "ប្តូរឯកសារសំឡេង", en: "Change sound file" },
  settings_soundRemove: {
    km: "លុបសំឡេងផ្ទាល់ខ្លួន",
    en: "Remove custom sound",
  },
  settings_soundTest: { km: "សាកល្បងស្តាប់", en: "Test sound" },
  settings_soundNoFile: {
    km: "មិនទាន់មានឯកសារសំឡេងនៅឡើយ",
    en: "No sound file uploaded yet",
  },
  settings_soundTooLarge: {
    km: "ឯកសារធំពេក សូមជ្រើសសំឡេងតូចជាង ១MB",
    en: "File too large — please pick a sound under 1MB",
  },
  settings_soundSaved: { km: "បានរក្សាទុកសំឡេង", en: "Sound settings saved" },
  sound_chime: { km: "សំឡេងកណ្ដឹងទឹម (លំនាំដើម)", en: "Chime (default)" },
  sound_bell: { km: "សំឡេងកណ្ដឹង", en: "Bell" },
  sound_alert: { km: "សំឡេងជូនដំណឹងបន្ទាន់", en: "Alert" },
  sound_soft: { km: "សំឡេងទន់ភ្លន់", en: "Soft pop" },
  sound_marimba: { km: "សំឡេងម៉ារីមបា", en: "Marimba" },
  sound_custom: { km: "សំឡេងផ្ទាល់ខ្លួន (Upload)", en: "Custom (uploaded)" },
  auditLog_subtitle: {
    km: "{count} កំណត់ត្រា",
    en: "{count} entries",
  },
  auditLog_empty: {
    km: "មិនទាន់មានកំណត់ត្រាសកម្មភាពនៅឡើយ",
    en: "No activity recorded yet",
  },
  auditLog_col_time: { km: "ពេលវេលា", en: "Time" },
  auditLog_col_user: { km: "អ្នកប្រើប្រាស់", en: "User" },
  auditLog_col_action: { km: "សកម្មភាព", en: "Action" },
  auditLog_col_item: { km: "ធាតុ", en: "Item" },
  auditLog_noResults: {
    km: "រកមិនឃើញកំណត់ត្រាដែលត្រូវនឹងលក្ខខណ្ឌនេះទេ",
    en: "No log entries match this filter",
  },
  auditLog_searchPlaceholder: {
    km: "ស្វែងរកអ្នកប្រើ ឬ ធាតុ...",
    en: "Search user or item...",
  },
  audit_action_add: { km: "បន្ថែម", en: "Added" },
  audit_action_edit: { km: "កែប្រែ", en: "Updated" },
  audit_action_delete: { km: "លុប", en: "Deleted" },
  audit_action_enable: { km: "បើកគណនី", en: "Enabled" },
  audit_action_disable: { km: "បិទគណនី", en: "Disabled" },
  audit_action_refund: { km: "សងវិញ", en: "Refunded" },
  audit_action_cancel: { km: "លុបចោលការបញ្ជាទិញ", en: "Cancelled order" },
  audit_action_reject: { km: "បដិសេធការបញ្ជាទិញ", en: "Rejected order" },
  audit_entity_product: { km: "ទំនិញ", en: "Product" },
  audit_entity_customer: { km: "អតិថិជន", en: "Customer" },
  audit_entity_user: { km: "អ្នកប្រើប្រាស់", en: "User" },
  audit_entity_sale: { km: "ការលក់", en: "Sale" },
  audit_entity_order: { km: "ការបញ្ជាទិញអនឡាញ", en: "Online order" },
  users_subtitle: { km: "{count} គណនី", en: "{count} accounts" },
  addUser: { km: "បន្ថែមអ្នកប្រើប្រាស់", en: "Add user" },
  editUser: { km: "កែប្រែអ្នកប្រើប្រាស់", en: "Edit user" },
  userActions: { km: "សកម្មភាព", en: "Actions" },
  deleteUser: { km: "លុបគណនី", en: "Delete" },
  userLastUpdated: { km: "កែប្រែចុងក្រោយ", en: "Last updated" },
  userRolePermissions: { km: "សិទ្ធិចូលប្រើ", en: "Access" },
  addUserTitle: { km: "បន្ថែមអ្នកប្រើប្រាស់ថ្មី", en: "Add new user" },
  fieldFullName: { km: "ឈ្មោះពេញ (ខ្មែរ)", en: "Full name (Khmer)" },
  fieldFullNameEn: { km: "ឈ្មោះពេញ (English)", en: "Full name (English)" },
  fieldRole: { km: "តួនាទី", en: "Role" },
  role_admin: { km: "អ្នកគ្រប់គ្រង (Admin)", en: "Admin" },
  role_manager: { km: "អ្នកគ្រប់គ្រងសាខា (Manager)", en: "Manager" },
  role_staff: { km: "បុគ្គលិក (Staff)", en: "Staff" },
  th_username: { km: "ឈ្មោះគណនី", en: "Username" },
  th_role: { km: "តួនាទី", en: "Role" },
  th_name: { km: "ឈ្មោះ", en: "Name" },
  noUsersYet: { km: "មិនទាន់មានអ្នកប្រើប្រាស់ទេ", en: "No users yet" },
  toast_userAdded: { km: "បន្ថែមអ្នកប្រើប្រាស់រួចរាល់", en: "User added" },
  toast_userUpdated: { km: "កែប្រែអ្នកប្រើប្រាស់រួចរាល់", en: "User updated" },
  toast_userDeleted: { km: "លុបអ្នកប្រើប្រាស់រួចរាល់", en: "User deleted" },
  toast_userRequired: {
    km: "សូមបំពេញឈ្មោះគណនី ឈ្មោះ និងលេខសម្ងាត់",
    en: "Please fill in username, name, and password",
  },
  toast_usernameTaken: {
    km: "ឈ្មោះគណនីនេះមានរួចហើយ",
    en: "This username is already taken",
  },
  toast_cannotDeleteSelf: {
    km: "មិនអាចលុបគណនីខ្លួនឯងបានទេ",
    en: "You can't delete your own account",
  },
  toast_needOneAdmin: {
    km: "ត្រូវការអ្នកគ្រប់គ្រងយ៉ាងតិចម្នាក់",
    en: "At least one admin account is required",
  },
  nav_users_sub_list: { km: "អ្នកប្រើប្រាស់", en: "Users" },
  nav_users_sub_roles: { km: "គ្រប់គ្រងតួនាទី", en: "Role Management" },
  roles_subtitle: { km: "{count} តួនាទី", en: "{count} roles" },
  addRole: { km: "បន្ថែមតួនាទីថ្មី", en: "Add role" },
  addRoleTitle: { km: "បន្ថែមតួនាទីថ្មី", en: "New role" },
  editRoleTitle: { km: "កែឈ្មោះតួនាទី", en: "Edit role" },
  fieldRoleNameKm: { km: "ឈ្មោះតួនាទី (ខ្មែរ)", en: "Role name (Khmer)" },
  fieldRoleNameEn: { km: "ឈ្មោះតួនាទី (English)", en: "Role name (English)" },
  th_permission: { km: "សិទ្ធិចូលមើល", en: "Permission" },
  role_admin_locked_note: {
    km: "អ្នកគ្រប់គ្រង (Admin) មានសិទ្ធិពេញលេញជានិច្ច ដើម្បីកុំឲ្យប្រព័ន្ធជាប់សោ",
    en: "Admin always keeps full access, so the system can never lock everyone out",
  },
  toast_roleAdded: { km: "បន្ថែមតួនាទីរួចរាល់", en: "Role added" },
  toast_roleUpdated: { km: "កែប្រែតួនាទីរួចរាល់", en: "Role updated" },
  toast_roleDeleted: { km: "លុបតួនាទីរួចរាល់", en: "Role deleted" },
  toast_roleNameRequired: {
    km: "សូមបំពេញឈ្មោះតួនាទី",
    en: "Please enter a role name",
  },
  toast_roleInUse: {
    km: "មិនអាចលុបបានទេ — មានអ្នកប្រើប្រាស់កំពុងប្រើតួនាទីនេះ",
    en: "Can't delete — this role is still assigned to a user",
  },
  roleDeleteConfirm: { km: "លុបតួនាទីនេះ?", en: "Delete this role?" },
  saveRolePermissions: { km: "រក្សាទុកសិទ្ធិ", en: "Save permissions" },
  rolePermissions_unsaved: {
    km: "មានការផ្លាស់ប្តូរមិនទាន់រក្សាទុក",
    en: "You have unsaved changes",
  },
  toast_rolePermissionsSaved: {
    km: "រក្សាទុកសិទ្ធិចូលមើលរួចរាល់",
    en: "Permissions saved",
  },
  toast_rolePermissionsSyncFailed: {
    km: "រក្សាទុកនៅលើ Cloud បរាជ័យ — ប្រហែលជាតារាង shop_settings មិនទាន់មាន column ចាំបាច់ទេ (សូមពិនិត្យ Supabase) ប៉ុន្តែបានរក្សាទុកនៅលើឧបករណ៍នេះរួចហើយ",
    en: "Cloud sync failed — shop_settings may be missing a required column (check Supabase). Saved on this device though.",
  },
  audit_entity_role: { km: "តួនាទី", en: "Role" },
  toast_userDisabled: {
    km: "បានបិទគណនីអ្នកប្រើប្រាស់",
    en: "User account disabled",
  },
  toast_userEnabled: {
    km: "បានបើកគណនីអ្នកប្រើប្រាស់វិញ",
    en: "User account enabled",
  },
  toast_accountDisabled: {
    km: "គណនីនេះត្រូវបានបិទ សូមទាក់ទងអ្នកគ្រប់គ្រង",
    en: "This account has been disabled. Contact your admin.",
  },
  toast_userSyncFailed: {
    km: "រក្សាទុកនៅលើ Cloud បរាជ័យ — ប្រហែលជាតារាង users មិនទាន់មាន column ចាំបាច់ទេ (សូមពិនិត្យ Supabase)",
    en: "Cloud sync failed — the users table may be missing a required column (check Supabase)",
  },
  user_disableConfirm: {
    km: "តើអ្នកចង់បិទគណនីនេះមែនទេ? អ្នកប្រើប្រាស់នេះនឹងចាកចេញភ្លាមៗ ហើយមិនអាចចូលប្រព័ន្ធបានទៀត រហូតដល់អ្នកបើកគណនីវិញ",
    en: "Disable this account? They'll be signed out immediately and won't be able to log in until you re-enable it.",
  },
  user_enableConfirm: {
    km: "តើអ្នកចង់បើកគណនីនេះឡើងវិញមែនទេ?",
    en: "Re-enable this account?",
  },
  status_disabled: { km: "បិទហើយ", en: "Disabled" },
  disableUser: { km: "បិទគណនី", en: "Disable" },
  enableUser: { km: "បើកគណនី", en: "Enable" },
  permDenied: {
    km: "អ្នកគ្មានសិទ្ធិចូលមើលទំព័រនេះទេ",
    en: "You don't have permission to view this page",
  },

  nav_onlineOrders: { km: "ការបញ្ជាទិញអនឡាញ", en: "Online orders" },
  onlineOrders_subtitle: { km: "{count} ការបញ្ជាទិញ", en: "{count} orders" },
  supabaseNotConfigured: {
    km: "មុខងារនេះត្រូវការភ្ជាប់ជាមួយ Supabase សិន",
    en: "This feature needs Supabase connected first",
  },
  supabaseNotConfiguredHint: {
    km: "សូមបំពេញ SUPABASE_URL និង SUPABASE_ANON_KEY នៅដើមឯកសារកូដ ហើយបង្កើតតារាងតាមការណែនាំ",
    en: "Fill in SUPABASE_URL and SUPABASE_ANON_KEY at the top of the code file and create the tables per the setup guide",
  },
  status_pending: { km: "កំពុងរង់ចាំ", en: "Pending" },
  status_accepted: {
    km: "បានទទួល (មិនទាន់បង់ប្រាក់)",
    en: "Accepted (unpaid)",
  },
  status_paid: { km: "បានបង់ប្រាក់", en: "Paid" },
  status_rejected: { km: "បានបដិសេធ", en: "Rejected" },
  status_cancelled: { km: "បានលុបចោល", en: "Cancelled" },

  storefront_status_pending: {
    km: "កំពុងរង់ចាំហាងបញ្ជាក់",
    en: "Waiting for the shop to confirm",
  },
  storefront_status_accepted: {
    km: "ហាងទទួលហើយ កំពុងរៀបចំ",
    en: "Accepted — being prepared",
  },
  storefront_status_paid: {
    km: "បានទូទាត់រួចរាល់ អរគុណ!",
    en: "Paid — thank you!",
  },
  storefront_status_rejected: {
    km: "ការកម្មង់ត្រូវបានបដិសេធ",
    en: "Order was rejected",
  },
  storefront_status_cancelled: {
    km: "ការកម្មង់ត្រូវបានលុបចោល",
    en: "Order was cancelled",
  },
  storefront_toast_accepted: {
    km: "ហាងបានទទួលការកម្មង់របស់អ្នក!",
    en: "The shop accepted your order!",
  },
  storefront_toast_paid: {
    km: "ការទូទាត់ត្រូវបានបញ្ជាក់",
    en: "Payment confirmed",
  },
  storefront_toast_rejected: {
    km: "សូមអភ័យទោស ការកម្មង់ត្រូវបានបដិសេធ",
    en: "Sorry, your order was rejected",
  },
  storefront_toast_cancelled: {
    km: "ការកម្មង់ត្រូវបានលុបចោល",
    en: "Your order was cancelled",
  },
  storefront_trackTitle: { km: "ស្ថានភាពការកម្មង់", en: "Order status" },
  storefront_liveNote: {
    km: "ស្ថានភាពនេះកែប្រែដោយស្វ័យប្រវត្តិ មិនចាំបាច់ refresh ទេ",
    en: "This updates automatically — no need to refresh",
  },
  storefront_myOrders: { km: "ការកម្មង់របស់ខ្ញុំ", en: "My orders" },
  storefront_orderRef: { km: "កូដ", en: "Ref" },
  storefront_noOrders: {
    km: "អ្នកមិនទាន់មានការកម្មង់ណាមួយទេ",
    en: "You don't have any orders yet",
  },
  storefront_backToStatus: { km: "ត្រឡប់ក្រោយ", en: "Back" },
  markPaid: { km: "បានទទួលប្រាក់", en: "Mark as paid" },
  cancelOrder: { km: "លុបចោល", en: "Cancel" },
  undoPaid: { km: "មិនទាន់បង់ (ត្រឡប់ក្រោយ)", en: "Undo — not paid" },
  undoPaid_confirmTitle: {
    km: "ត្រឡប់ស្ថានភាពការទូទាត់?",
    en: "Undo this payment?",
  },
  undoPaid_confirmMsg: {
    km: 'នេះនឹងដកចេញពី Revenue ដែលបានកត់ត្រា ហើយប្តូរស្ថានភាពត្រឡប់ទៅ "ទទួលហើយ (មិនទាន់ទូទាត់)" វិញ។ ប្រើពេលបុគ្គលិកចុច Mark as paid ច្រឡំ។',
    en: 'This removes the recorded revenue and reverts the order back to "Accepted (unpaid)". Use this when a staff member marked it paid by mistake.',
  },
  toast_orderUnpaid: {
    km: "បានត្រឡប់ទៅជាមិនទាន់ទូទាត់ និងដកចេញពី Revenue",
    en: "Reverted to unpaid and removed from revenue",
  },
  toast_orderPaid: {
    km: "បានកត់ត្រាការទូទាត់ និងបញ្ចូល Revenue",
    en: "Payment recorded and added to revenue",
  },
  toast_orderCancelled: {
    km: "បានលុបចោល និងស្តារស្តុកវិញ",
    en: "Order cancelled and stock restored",
  },
  accept: { km: "ទទួល", en: "Accept" },
  reject: { km: "បដិសេធ", en: "Reject" },
  noOnlineOrders: {
    km: "មិនទាន់មានការបញ្ជាទិញអនឡាញនៅឡើយ",
    en: "No online orders yet",
  },
  toast_orderAccepted: {
    km: "បានទទួលការបញ្ជាទិញ និងកាត់ស្តុករួចរាល់",
    en: "Order accepted and stock updated",
  },
  toast_orderRejected: { km: "បានបដិសេធការបញ្ជាទិញ", en: "Order rejected" },
  orderReason_titleReject: {
    km: "ហេតុផលបដិសេធការបញ្ជាទិញ",
    en: "Reason for rejecting this order",
  },
  orderReason_titleCancel: {
    km: "ហេតុផលលុបចោលការបញ្ជាទិញ",
    en: "Reason for cancelling this order",
  },
  orderReason_placeholder: {
    km: "ឧ. អតិថិជនមិនទទួលទូរស័ព្ទ / ទំនិញអស់ស្តុក...",
    en: "e.g. customer unreachable, item out of stock...",
  },
  orderReason_required: {
    km: "សូមបញ្ចូលហេតុផលមុននឹងបន្ត",
    en: "Please enter a reason to continue",
  },
  orderReason_confirmReject: { km: "បញ្ជាក់បដិសេធ", en: "Confirm reject" },
  orderReason_confirmCancel: { km: "បញ្ជាក់លុបចោល", en: "Confirm cancel" },
  order_reasonLabel: { km: "ហេតុផល", en: "Reason" },
  order_byLabel: { km: "ដោយ", en: "By" },
  toast_supabaseError: {
    km: "មានបញ្ហាក្នុងការភ្ជាប់ទៅ Supabase",
    en: "There was a problem connecting to Supabase",
  },
  storeLink: { km: "តំណភ្ជាប់ហាងអនឡាញ", en: "Online store link" },
  copyLink: { km: "ចម្លងតំណ", en: "Copy link" },
  toast_linkCopied: { km: "បានចម្លងតំណរួចរាល់", en: "Link copied" },
  showQrCode: { km: "បង្ហាញ QR Code", en: "Show QR code" },
  hideQrCode: { km: "លាក់ QR Code", en: "Hide QR code" },
  downloadQr: { km: "ទាញយក QR", en: "Download QR" },
  scanToOrder: { km: "ស្កេនដើម្បីកម្ម៉ង់", en: "Scan to order" },
  liveIndicator: { km: "កំពុងភ្ជាប់ផ្ទាល់", en: "Live" },
  toast_newOrderReceived: {
    km: "🛎️ មានការកម្មង់ថ្មីពី {name}!",
    en: "🛎️ New order from {name}!",
  },
  notifySound_on: { km: "សំឡេងជូនដំណឹង៖ បើក", en: "Notify sound: On" },
  notifySound_off: { km: "សំឡេងជូនដំណឹង៖ បិទ", en: "Notify sound: Off" },
  offlineIndicator: { km: "មិនទាន់ភ្ជាប់", en: "Not connected" },

  storefront_title: { km: "កម្ម៉ង់អនឡាញ", en: "Order online" },
  storefront_cartTitle: { km: "កន្ត្រករបស់អ្នក", en: "Your cart" },
  storefront_emptyCart: {
    km: "មិនទាន់មានទំនិញនៅឡើយ",
    en: "Your cart is empty",
  },
  storefront_yourName: { km: "ឈ្មោះរបស់អ្នក", en: "Your name" },
  storefront_yourPhone: { km: "លេខទូរស័ព្ទ", en: "Phone number" },
  storefront_note: { km: "កំណត់ចំណាំ (មិនចាំបាច់)", en: "Note (optional)" },
  storefront_submit: { km: "ដាក់ការបញ្ជាទិញ", en: "Place order" },
  storefront_submitted_title: {
    km: "ការបញ្ជាទិញត្រូវបានទទួល!",
    en: "Order received!",
  },
  storefront_submitted_sub: {
    km: "ហាងនឹងទាក់ទងទៅអ្នកឆាប់ៗនេះ",
    en: "The shop will contact you shortly",
  },
  storefront_newOrder: { km: "ដាក់ការបញ្ជាទិញថ្មី", en: "Place another order" },
  storefront_loading: { km: "កំពុងផ្ទុកទំនិញ...", en: "Loading products..." },
  storefront_orderingDisabled: {
    km: "ហាងនេះមិនទាន់បើកមុខងារកម្មង់អនឡាញនៅឡើយទេ",
    en: "This shop hasn't turned on online ordering yet",
  },
  storefront_notFound: {
    km: "រកមិនឃើញហាងនេះទេ ឬមានបញ្ហាបច្ចេកទេស",
    en: "Shop not found, or something went wrong",
  },
  storefront_outOfStock: { km: "អស់ស្តុក", en: "Out of stock" },
  storefront_fieldsRequired: {
    km: "សូមបំពេញឈ្មោះ និងលេខទូរស័ព្ទ",
    en: "Please fill in your name and phone number",
  },
};

const LangContext = createContext({ lang: "km", t: (k) => k, categories: [] });
function useT() {
  return useContext(LangContext);
}

// ---------------- notification sound ----------------
// Built-in tone presets for new online orders — each generated with the
// Web Audio API so no external sound file needs to be hosted or bundled.
// `hit(playTone)` schedules one or more short tones starting at t=0;
// `length` is roughly how long that hit takes, used to space repeats.
const SOUND_PRESETS = {
  chime: {
    length: 0.4,
    hit: (playTone) => {
      playTone(880, 0, 0.16);
      playTone(1175, 0.14, 0.22);
    },
  },
  bell: {
    length: 0.55,
    hit: (playTone) => {
      playTone(1046, 0, 0.5);
      playTone(1568, 0.02, 0.45);
    },
  },
  alert: {
    length: 0.55,
    hit: (playTone) => {
      playTone(1200, 0, 0.12);
      playTone(1200, 0.18, 0.12);
      playTone(1200, 0.36, 0.12);
    },
  },
  soft: {
    length: 0.3,
    hit: (playTone) => {
      playTone(660, 0, 0.24);
    },
  },
  marimba: {
    length: 0.5,
    hit: (playTone) => {
      playTone(523, 0, 0.18);
      playTone(659, 0.1, 0.18);
      playTone(784, 0.2, 0.24);
    },
  },
};
const SOUND_PRESET_KEYS = Object.keys(SOUND_PRESETS);
const DEFAULT_SOUND_ID = "chime";

function playPresetOnce(ctx, soundId) {
  const preset = SOUND_PRESETS[soundId] || SOUND_PRESETS[DEFAULT_SOUND_ID];
  const playTone = (freq, start, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(
      0.22,
      ctx.currentTime + start + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + start + duration,
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.02);
  };
  preset.hit(playTone);
  return preset.length;
}

// Keeps track of any currently-ringing sound so a new call (or the
// "stop after N seconds" timer) can cleanly cancel it.
let _chimeStopTimer = null;
let _chimeIntervalTimer = null;
let _chimeCustomAudio = null;

function stopNotifySound() {
  if (_chimeStopTimer) {
    clearTimeout(_chimeStopTimer);
    _chimeStopTimer = null;
  }
  if (_chimeIntervalTimer) {
    clearInterval(_chimeIntervalTimer);
    _chimeIntervalTimer = null;
  }
  if (_chimeCustomAudio) {
    try {
      _chimeCustomAudio.pause();
    } catch {
      /* ignore */
    }
    _chimeCustomAudio = null;
  }
}

// Plays the shop's configured notification sound — a built-in preset,
// or an uploaded custom audio file. `durationSec` of 0 plays it once;
// any higher value repeats the sound until that many seconds have
// elapsed, then stops automatically on its own.
function playNotifySound({
  soundId = DEFAULT_SOUND_ID,
  customUrl = null,
  durationSec = 0,
} = {}) {
  try {
    stopNotifySound();

    if (soundId === "custom" && customUrl) {
      const audio = new Audio(customUrl);
      _chimeCustomAudio = audio;
      audio.play().catch(() => {
        /* playback blocked (e.g. no user gesture yet) — ignore */
      });
      if (durationSec > 0) {
        audio.loop = true;
        _chimeStopTimer = setTimeout(() => {
          stopNotifySound();
        }, durationSec * 1000);
      }
      return;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const fire = () => {
      const ctx = new Ctx();
      const hitLength = playPresetOnce(ctx, soundId);
      setTimeout(() => ctx.close(), hitLength * 1000 + 300);
    };
    fire();
    if (durationSec > 0) {
      _chimeIntervalTimer = setInterval(fire, 900);
      _chimeStopTimer = setTimeout(() => {
        stopNotifySound();
      }, durationSec * 1000);
    }
  } catch {
    /* audio unavailable — silently skip */
  }
}

function resizeImage(file, maxDim = 320, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width,
          h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h >= w && h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeQrImage(file, maxDim = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width,
          h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        // PNG (lossless) — a QR code's sharp black/white modules can become
        // unscannable with JPEG's compression artifacts.
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const NAV = [
  { id: "pos", key: "nav_pos", icon: ShoppingCart },
  { id: "dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { id: "inventory", key: "nav_inventory", icon: Package },
  { id: "reports", key: "nav_reports", icon: BarChart3 },
  { id: "customers", key: "nav_customers", icon: Users },
  { id: "onlineOrders", key: "nav_onlineOrders", icon: Store },
  { id: "expenses", key: "nav_expenses", icon: Wallet },
  { id: "shift", key: "nav_shift", icon: Banknote },
  { id: "users", key: "nav_users", icon: UserCog },
  { id: "auditLog", key: "nav_auditLog", icon: History },
  { id: "settings", key: "nav_settings", icon: SettingsIcon },
  // Not a shop role permission — only ever shown to a signed-in Super
  // Admin (see allowedTabs in POSApp), and deliberately excluded from
  // roleTabIds' "locked admin gets everything" rule below so a shop's own
  // admin can never see or reach it.
  { id: "superAdmin", key: "nav_superAdmin", icon: Crown },
];

// Role Management (see UsersTab) reads NAV to build its permission rows,
// so any new tab added above shows up there automatically — nothing else
// to wire up for that part.
//
// The other half: a `locked: true` role (currently just "admin", see
// seedRoles) always gets every tab in NAV here, no matter what's actually
// saved in its `tabs` array. Without this, a shop that was already running
// before a new tab got added would have an admin whose stored tabs array
// simply doesn't mention the new tab — and since locked rows can't be
// checked by hand in Role Management, there'd be no way for that admin to
// ever unlock it. This keeps admin's access always complete by definition.
const roleTabIds = (role) => (role && role.tabs) || [];

function POSApp() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(
    CATEGORY_KEYS.map((k) => ({
      key: k,
      label_km: STRINGS["cat_" + k].km,
      label_en: STRINGS["cat_" + k].en,
    })),
  );
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState(null);
  const [khrRate, setKhrRate] = useState(KHR_PER_USD_DEFAULT);
  const [payCashEnabled, setPayCashEnabled] = useState(true);
  const [payKhqrEnabled, setPayKhqrEnabled] = useState(false);
  const [khqrImage, setKhqrImage] = useState("");
  // Dynamic KHQR (amount baked into the QR itself) — an alternative to the
  // static uploaded-screenshot flow above. All four fields must be filled
  // in Settings for dynamic mode to actually turn on at checkout.
  const [khqrDynamicEnabled, setKhqrDynamicEnabled] = useState(false);
  const [khqrAccountId, setKhqrAccountId] = useState("");
  const [khqrMerchantName, setKhqrMerchantName] = useState("");
  const [khqrMerchantCity, setKhqrMerchantCity] = useState("");
  const [khqrBankName, setKhqrBankName] = useState("");
  // Which premium features this shop currently has turned on — only a
  // Super Admin can change these (see pushFeatures / SuperAdminTab below).
  // Defaults closed until the cloud settings load confirms otherwise, so a
  // shop never briefly flashes access to something it hasn't paid for.
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [lang, setLang] = useState("km");
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("shop-activeTab") || "pos",
  );
  useEffect(() => {
    try {
      localStorage.setItem("shop-activeTab", activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  // Keeps the browser tab's title and icon (favicon) in sync with the shop
  // logo/name set in Settings, so the tab shows the shop's own branding
  // instead of the generic globe icon — no separate image file needed,
  // it just points the tab at whatever logo is already stored.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = shopName || "POS";
    if (!shopLogo) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = shopLogo;
  }, [shopName, shopLogo]);
  const [toast, setToast] = useState(null);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [userModal, setUserModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [switchShopConfirmOpen, setSwitchShopConfirmOpen] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState("amount"); // 'amount' ($) or 'percent' (%)
  const [redeemPoints, setRedeemPoints] = useState("");
  const [payment, setPayment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [receipt, setReceipt] = useState(null);
  // Open tabs — orders held for a table/customer that hasn't paid yet (bars,
  // restaurants). Kept separate from `sales` so nothing about reports,
  // profit, refunds, or CSV exports needs to change: a tab only becomes a
  // real `sales` row once it's actually paid via completeSale. Device-local
  // only (not synced to Supabase) for now.
  const [openTabs, setOpenTabs] = useState([]);
  const [tableLabel, setTableLabel] = useState("");
  const [editingTabId, setEditingTabId] = useState(null);
  const [tabListOpen, setTabListOpen] = useState(false);

  const [invSearch, setInvSearch] = useState("");
  const [invCategory, setInvCategory] = useState("all");
  const [productModal, setProductModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [customerModal, setCustomerModal] = useState(null);
  const [expenseModal, setExpenseModal] = useState(null);

  const [reportRange, setReportRange] = useState("today");
  const [expandedSale, setExpandedSale] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("shop-theme") || "light",
  );
  // `shopIdRef` mirrors `shopId` (declared further below) without adding it
  // as a dependency of the persist effect right below — see the effect's
  // comment for why that separation matters.
  const shopIdRef = useRef(null);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      // Persist under this shop's own key when we know which shop is
      // signed in, falling back to the shared "shop-theme" key for the
      // login/picker screens where no shop is signed in yet. Deliberately
      // depends on `theme` only (not `shopId`) — if it also re-ran on
      // every shopId change, it would fire in the same commit as (and race
      // ahead of) the "load this shop's theme" effect below, overwriting
      // the newly-switched-to shop's saved theme with the previous shop's
      // theme before that effect got a chance to load it.
      const key = shopIdRef.current
        ? `shop-theme-${shopIdRef.current}`
        : "shop-theme";
      localStorage.setItem(key, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  // Receipt paper width for thermal printers — a per-device print setting,
  // not synced to the cloud, since different tills may have different printers.
  const [receiptWidth, setReceiptWidth] = useState(
    () => localStorage.getItem("shop-receiptWidth") || "80mm",
  );
  useEffect(() => {
    try {
      localStorage.setItem("shop-receiptWidth", receiptWidth);
    } catch {
      /* ignore */
    }
  }, [receiptWidth]);

  const t = (key, vars) => {
    const entry = STRINGS[key];
    let str = entry ? entry[lang] || entry.km : key;
    if (vars)
      Object.keys(vars).forEach((k) => {
        str = str.replace(`{${k}}`, vars[k]);
      });
    return str;
  };
  const catLabel = (cat) => {
    const found = categories.find((c) => c.key === cat);
    if (!found) return cat;
    return lang === "en"
      ? found.label_en || found.label_km
      : found.label_km || found.label_en;
  };
  const prodName = (p) =>
    lang === "en" ? p.name_en || p.name_km || "" : p.name_km || p.name_en || "";
  const prodUnit = (p) => (lang === "en" ? p.unit_en || p.unit_km : p.unit_km);

  // ---------- Shop-level Supabase Auth session (required by RLS) ----------
  // Every product/sale/customer/etc. row is scoped by shop_id, and the
  // database only allows access to rows matching the signed-in account's
  // shop. `shopAuthChecking` is true only while we check for an existing
  // (remembered) session on load — once resolved, either `shopId` gets set
  // (already signed in) or the app shows <ShopLoginScreen>.
  //
  // This must be declared BEFORE the local-cache load effect below, because
  // that effect now keys its localStorage reads/writes off `shopId` — the
  // whole point being that each shop gets its own local cache on this
  // device instead of every shop sharing one global cache (which is what
  // let one shop's cached staff logins/products bleed into another shop's
  // screen when both were signed into on the same device).
  const [shopId, setShopId] = useState(null);
  const [shopSlug, setShopSlug] = useState("");
  const [shopAuthChecking, setShopAuthChecking] = useState(!!supabase);
  const [shopAuthError, setShopAuthError] = useState("");
  useEffect(() => {
    shopIdRef.current = shopId;
  }, [shopId]);
  // Each shop remembers its own light/dark preference. Without this, the
  // theme toggle above was writing to one shared "shop-theme" key for
  // every shop on this device, so switching shops (most visibly as a
  // Super Admin hopping between them) carried Shop A's theme choice into
  // Shop B instead of showing Shop B's own.
  useEffect(() => {
    if (!shopId) return;
    try {
      setTheme(localStorage.getItem(`shop-theme-${shopId}`) || "light");
    } catch {
      setTheme("light");
    }
  }, [shopId]);
  // Super Admin = a platform-owner Supabase Auth account (profiles.shop_id
  // is NULL, profiles.is_super_admin is true) that isn't tied to any one
  // shop. Instead of landing straight in a shop, it lands on
  // <ShopPickerScreen>, picks which shop to manage, and everything below
  // (products/sales/settings/etc.) works exactly as it does for that
  // shop's own admin — the only difference is where shopId came from and
  // that the local PIN screen is skipped (see SUPER_ADMIN_USER below).
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminShops, setSuperAdminShops] = useState([]);
  const [superAdminShopsLoading, setSuperAdminShopsLoading] = useState(false);

  const loadShopProfile = async (userId) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("shop_id, is_super_admin, shops:shop_id (slug, name)")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (profile) {
      setIsSuperAdmin(!!profile.is_super_admin);
      if (profile.shop_id) {
        setShopId(profile.shop_id);
        setShopSlug((profile.shops && profile.shops.slug) || "");
      } else if (profile.is_super_admin) {
        // Super Admin accounts have no shop_id of their own — they pick
        // one via <ShopPickerScreen> (enterShopAsSuperAdmin). Without
        // this, every page refresh re-ran this same check, found no
        // shop_id, and sent them back to the picker even though they'd
        // already chosen a shop a moment ago. Restore whichever shop they
        // were last managing on this device instead.
        try {
          const saved = JSON.parse(
            localStorage.getItem(SUPERADMIN_LAST_SHOP_KEY) || "null",
          );
          if (saved && saved.id) {
            setShopId(saved.id);
            setShopSlug(saved.slug || "");
          } else {
            setShopId(null);
            setShopSlug("");
          }
        } catch {
          setShopId(null);
          setShopSlug("");
        }
      } else {
        setShopId(null);
        setShopSlug("");
      }
    }
  };

  // Loads every shop for the Super Admin's shop picker. Relies on an RLS
  // policy that grants `is_super_admin()` accounts read access to the
  // `shops` table (see setup guide) — for anyone else this simply returns
  // nothing, so it's safe to only ever call it once `isSuperAdmin` is true.
  const loadSuperAdminShops = async () => {
    setSuperAdminShopsLoading(true);
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, slug, name")
        .order("name", { ascending: true });
      if (error) throw error;
      setSuperAdminShops(data || []);
    } catch {
      /* offline, or RLS not set up yet — picker will just show empty */
    }
    setSuperAdminShopsLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin && !shopId) loadSuperAdminShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, shopId]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session || null;
        if (session) await loadShopProfile(session.user.id);
      } catch {
        /* no remembered session, or offline — ShopLoginScreen will show */
      }
      setShopAuthChecking(false);
    })();
  }, []);

  const signInShop = async (email, password) => {
    setShopAuthError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      await loadShopProfile(data.user.id);
    } catch (err) {
      setShopAuthError(
        err && err.message === "Invalid login credentials"
          ? t("shopLogin_invalid")
          : t("shopLogin_failed"),
      );
    }
  };
  // A Super Admin picking a shop from the picker, or leaving one to pick a
  // different one — NOT a full sign-out, so the Supabase Auth session (and
  // is_super_admin) is left alone. Mirrors the local-state reset in
  // signOutShop below so nothing from the previous shop bleeds into the
  // next one.
  const enterShopAsSuperAdmin = (id, slug) => {
    setLoading(true);
    setShopId(id);
    setShopSlug(slug || "");
    try {
      localStorage.setItem(
        SUPERADMIN_LAST_SHOP_KEY,
        JSON.stringify({ id, slug: slug || "" }),
      );
    } catch {
      /* ignore */
    }
  };
  const leaveShopAsSuperAdmin = () => {
    setLoading(true);
    setShopId(null);
    setShopSlug("");
    setSessionUserId(null);
    setProducts([]);
    setSales([]);
    setCustomers([]);
    setExpenses([]);
    setUsers([]);
    setRoles(seedRoles);
    setFeatures(DEFAULT_FEATURES);
    try {
      localStorage.removeItem(SUPERADMIN_LAST_SHOP_KEY);
    } catch {
      /* ignore */
    }
  };
  const signOutShop = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    // Reset in-memory state right away rather than waiting for the load
    // effect to catch up — otherwise, for a moment after signing out, this
    // shop's products/users/etc. are still sitting in state, and if the
    // save effect fires in that window it would write this shop's data
    // into whatever key comes next (legacy/local key) and cross-contaminate
    // the next shop signed in on this device.
    setLoading(true);
    setShopId(null);
    setShopSlug("");
    setIsSuperAdmin(false);
    setSuperAdminShops([]);
    setSessionUserId(null);
    setProducts([]);
    setSales([]);
    setCustomers([]);
    setExpenses([]);
    setUsers([]);
    setRoles(seedRoles);
    setFeatures(DEFAULT_FEATURES);
    try {
      localStorage.removeItem(SUPERADMIN_LAST_SHOP_KEY);
    } catch {
      /* ignore */
    }
  };

  // ---------- Local cache (per-shop) ----------
  // Waits for the shop-auth check above to resolve before touching
  // localStorage, since we don't know which shop's cache key to use until
  // then. Re-runs whenever the signed-in shop changes (sign-out/sign back
  // into a different shop on the same device), so each shop always loads
  // its own data instead of inheriting whatever the previously-signed-in
  // shop left behind.
  useEffect(() => {
    if (shopAuthChecking) return;
    const key = storageKeyFor(shopId);
    try {
      let raw = localStorage.getItem(key);
      if (!raw) {
        // Nothing cached yet under this shop's own key. If this device has
        // old, unscoped data from before multi-shop support existed,
        // adopt it for this shop (the common case: only one shop has ever
        // used this device) and retire the legacy key so a second shop
        // signing in later on this device won't also inherit it.
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          raw = legacy;
          try {
            localStorage.setItem(key, legacy);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        setProducts(parsed.products || []);
        setSales(parsed.sales || []);
        setCustomers(parsed.customers || []);
        setExpenses(parsed.expenses || []);
        setShifts(parsed.shifts || []);
        setOpenTabs(parsed.openTabs || []);
        if (parsed.categories && parsed.categories.length) {
          setCategories(parsed.categories);
        }
        setShopName(parsed.shopName || "");
        setShopLogo(parsed.shopLogo || null);
        setKhrRate(parsed.khrRate || KHR_PER_USD_DEFAULT);
        setPayCashEnabled(
          typeof parsed.payCashEnabled === "boolean"
            ? parsed.payCashEnabled
            : true,
        );
        setPayKhqrEnabled(!!parsed.payKhqrEnabled);
        setKhqrImage(parsed.khqrImage || "");
        setKhqrDynamicEnabled(!!parsed.khqrDynamicEnabled);
        setKhqrAccountId(parsed.khqrAccountId || "");
        setKhqrMerchantName(parsed.khqrMerchantName || "");
        setKhqrMerchantCity(parsed.khqrMerchantCity || "");
        setKhqrBankName(parsed.khqrBankName || "");
        setLang(parsed.lang || "km");
        setUsers(
          parsed.users && parsed.users.length ? parsed.users : seedUsers,
        );
        setRoles(
          parsed.roles && parsed.roles.length ? parsed.roles : seedRoles,
        );
        setFeatures({ ...DEFAULT_FEATURES, ...(parsed.features || {}) });
      } else {
        setProducts(seedProducts);
        setUsers(seedUsers);
        setRoles(seedRoles);
        setFeatures(DEFAULT_FEATURES);
      }
      const sess = localStorage.getItem(sessionKeyFor(shopId));
      setSessionUserId(sess || null);
    } catch {
      setProducts(seedProducts);
      setUsers(seedUsers);
      setRoles(seedRoles);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopAuthChecking, shopId]);

  useEffect(() => {
    if (loading) return;
    const key = storageKeyFor(shopId);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            products,
            sales,
            customers,
            expenses,
            shifts,
            openTabs,
            categories,
            shopName,
            shopLogo,
            khrRate,
            payCashEnabled,
            payKhqrEnabled,
            khqrImage,
            khqrDynamicEnabled,
            khqrAccountId,
            khqrMerchantName,
            khqrMerchantCity,
            khqrBankName,
            lang,
            users,
            roles,
            features,
          }),
        );
      } catch {
        showToast(t("toast_saveFailed"), "error");
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    products,
    sales,
    customers,
    expenses,
    shifts,
    openTabs,
    categories,
    shopName,
    shopLogo,
    khrRate,
    payCashEnabled,
    payKhqrEnabled,
    khqrImage,
    khqrDynamicEnabled,
    khqrAccountId,
    khqrMerchantName,
    khqrMerchantCity,
    khqrBankName,
    lang,
    users,
    roles,
    features,
    loading,
    shopId,
  ]);

  useEffect(() => {
    try {
      const key = sessionKeyFor(shopId);
      if (sessionUserId) localStorage.setItem(key, sessionUserId);
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [sessionUserId, shopId]);

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2400);
  };

  // ---------- Auth ----------
  // A Super Admin never has a PIN in this shop's local `users` list — they
  // skip the till-PIN <LoginScreen> entirely (see the render logic further
  // down) and act as this synthetic identity instead.
  const currentUser = isSuperAdmin
    ? SUPER_ADMIN_USER
    : users.find((u) => u.id === sessionUserId) || null;
  const currentUserRole = currentUser
    ? roles.find((r) => r.id === currentUser.role)
    : null;
  // A user whose account role is literally the reserved "admin" id must
  // always get full access, even if `roles` (loaded from local cache or
  // synced from the cloud) is missing an "admin" entry, hasn't synced yet,
  // or has one that's missing `locked: true` for some reason (e.g. an
  // older save from before that field existed). Without this fallback, a
  // roles-data hiccup could lock every admin out of the very screens
  // (Users, Settings) needed to fix it.
  // A tab gated by a premium feature (see FEATURE_BY_TAB) only shows once
  // that feature is on for this shop. Super Admin always sees everything —
  // including tabs no feature has been turned on for yet — since they're
  // the one who turns features on in the first place.
  const featureAllowsTab = (tabId) => {
    const featureId = FEATURE_BY_TAB[tabId];
    return !featureId || isSuperAdmin || !!features[featureId];
  };
  const allowedTabs = isSuperAdmin
    ? NAV.map((n) => n.id)
    : roleTabIds(currentUserRole).filter(featureAllowsTab);
  const visibleNav = NAV.filter((n) => allowedTabs.includes(n.id));

  // Action-level permissions for the Shift tab (on top of just being able
  // to see it — see `tabs` above). Unlike full tab access, this is NOT
  // forced on for the "admin" role — losing Settings/Users access could
  // lock a shop out of fixing its own permissions, but losing shift
  // edit/delete is just a feature restriction, so it's fully in Super
  // Admin's hands like everything else in this matrix (see the disabled-
  // when-locked checkbox in UsersTab: only Super Admin can change what
  // "admin" itself is allowed here, same as any other role, and that
  // choice is per-shop since roles live in that shop's `roles_json`).
  // Super Admin's own account still always passes, same as it does for
  // every other permission in the app.
  // Older saved roles (local cache or cloud) that predate these fields
  // simply have them as `undefined`, which the `!!` below treats as off —
  // same "defaults off until explicitly turned on" rule used for premium
  // features, so upgrading never silently grants a role more than it had
  // before this feature existed.
  const canEditShift =
    isSuperAdmin || !!(currentUserRole && currentUserRole.shiftEdit);
  const canDeleteShift =
    isSuperAdmin || !!(currentUserRole && currentUserRole.shiftDelete);

  // `refundSale` gates the Reports-tab "Refund" button. Unlike the two
  // above, this permission was carved out of a feature that already
  // worked for every role that could see Reports (no restriction at all)
  // — so treating missing data as "off" would silently take Refund away
  // from every existing shop's Admin/Manager the moment they load this
  // update. Instead, only an EXPLICIT `false` blocks it; `undefined`
  // (old data) and `true` both allow it, same as the pre-existing
  // behavior. Super Admin can still turn it off per shop by unchecking it
  // in the Roles Management matrix, same place as the other two.
  const canRefundSale =
    isSuperAdmin || !(currentUserRole && currentUserRole.refundSale === false);

  // Same backward-compatible shape as canRefundSale — deleting a customer
  // already worked for any role that could see Customers (which is all
  // three default roles), so `undefined` still means allowed. Only an
  // explicit `false` (set by Super Admin in the matrix) blocks it.
  const canDeleteCustomer =
    isSuperAdmin ||
    !(currentUserRole && currentUserRole.customerDelete === false);

  const login = (username, password) => {
    const match = users.find(
      (u) =>
        u.username.trim().toLowerCase() === username.trim().toLowerCase() &&
        u.password === password,
    );
    if (!match) {
      setLoginError(t("toast_loginFailed"));
      return;
    }
    if (match.active === false) {
      setLoginError(t("toast_accountDisabled"));
      return;
    }
    setLoginError("");
    setSessionUserId(match.id);
    const permTabs =
      match.role === "admin"
        ? NAV.map((n) => n.id)
        : roleTabIds(roles.find((r) => r.id === match.role));
    setActiveTab(permTabs.includes("pos") ? "pos" : permTabs[0] || "pos");
  };
  const logout = () => {
    setSessionUserId(null);
  };

  // If an admin disables the account that's currently signed in on this
  // device (locally or from another device via Supabase sync), sign it out
  // right away instead of waiting for the next manual action.
  useEffect(() => {
    if (currentUser && currentUser.active === false) {
      setSessionUserId(null);
      showToast(t("toast_accountDisabled"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser && currentUser.active]);

  useEffect(() => {
    if (!currentUser) return;
    if (!allowedTabs.includes(activeTab)) setActiveTab(allowedTabs[0] || "pos");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser && currentUser.id]);

  // ---------- Users (admin only) ----------
  const saveUser = (form) => {
    if (!form.username || !form.name_km || (!form.id && !form.password)) {
      showToast(t("toast_userRequired"), "error");
      return;
    }
    const dup = users.find(
      (u) =>
        u.username.trim().toLowerCase() ===
          form.username.trim().toLowerCase() && u.id !== form.id,
    );
    if (dup) {
      showToast(t("toast_usernameTaken"), "error");
      return;
    }
    if (form.id) {
      const updated = {
        ...users.find((u) => u.id === form.id),
        ...form,
        password: form.password
          ? form.password
          : users.find((u) => u.id === form.id).password,
        updatedAt: Date.now(),
      };
      setUsers(users.map((u) => (u.id === form.id ? updated : u)));
      showToast(t("toast_userUpdated"));
      pushUserRow(updated);
      logAudit("edit", "user", updated.name_km || updated.username);
    } else {
      const created = { ...form, id: genId(), updatedAt: Date.now() };
      setUsers([...users, created]);
      showToast(t("toast_userAdded"));
      pushUserRow(created);
      logAudit("add", "user", created.name_km || created.username);
    }
    setUserModal(null);
  };

  const deleteUser = (id) => {
    if (id === sessionUserId) {
      showToast(t("toast_cannotDeleteSelf"), "error");
      return;
    }
    const target = users.find((u) => u.id === id);
    const remainingAdmins = users.filter(
      (u) => u.role === "admin" && u.id !== id,
    );
    if (target && target.role === "admin" && remainingAdmins.length === 0) {
      showToast(t("toast_needOneAdmin"), "error");
      return;
    }
    setUsers(users.filter((u) => u.id !== id));
    showToast(t("toast_userDeleted"));
    deleteUserRow(id);
    logAudit("delete", "user", target ? target.name_km || target.username : id);
  };

  const toggleUserActive = (id) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const nextActive = target.active === false; // currently disabled -> enable, else disable
    if (!nextActive) {
      // about to disable — make sure at least one other active admin remains
      const remainingActiveAdmins = users.filter(
        (u) => u.role === "admin" && u.id !== id && u.active !== false,
      );
      if (target.role === "admin" && remainingActiveAdmins.length === 0) {
        showToast(t("toast_needOneAdmin"), "error");
        return;
      }
    }
    const updated = { ...target, active: nextActive, updatedAt: Date.now() };
    setUsers(users.map((u) => (u.id === id ? updated : u)));
    pushUserRow(updated);
    showToast(t(nextActive ? "toast_userEnabled" : "toast_userDisabled"));
    logAudit(
      nextActive ? "enable" : "disable",
      "user",
      target.name_km || target.username,
    );
    // Disabling the account you're currently signed in as should sign you
    // out right away too — the currentUser-watching effect below handles
    // that as soon as `users` re-renders with active: false.
  };

  // ---------- Roles (admin only) ----------
  // Saves a role's name (add or rename). Tab permissions are edited
  // separately via the Save button in Role Management (saveRolePermissions
  // below), which commits the whole matrix and syncs it to the cloud.
  const saveRole = (form) => {
    const name = (form.name_km || form.name_en || "").trim();
    if (!name) {
      showToast(t("toast_roleNameRequired"), "error");
      return;
    }
    let nextRoles;
    if (form.id) {
      nextRoles = roles.map((r) =>
        r.id === form.id
          ? { ...r, name_km: form.name_km, name_en: form.name_en }
          : r,
      );
      showToast(t("toast_roleUpdated"));
      logAudit("edit", "role", form.name_km || form.name_en);
    } else {
      const created = {
        id: genId(),
        name_km: form.name_km,
        name_en: form.name_en,
        tabs: [],
      };
      nextRoles = [...roles, created];
      showToast(t("toast_roleAdded"));
      logAudit("add", "role", form.name_km || form.name_en);
    }
    setRoles(nextRoles);
    pushRoles(nextRoles);
    setRoleModal(null);
  };

  // Commits the whole permissions matrix in one shot: local state + a
  // single Cloud push + one clear toast, instead of syncing per checkbox
  // click. This is what the Save button in Role Management calls — the
  // matrix UI itself only edits a local draft copy until this runs, so
  // admins get one explicit "did this actually save" signal, and other
  // signed-in devices pick it up via the shop_settings realtime/poll sync.
  // The admin role is locked (see seedRoles) so its tabs never change here
  // even if a stale draft somehow included an edit for it.
  const saveRolePermissions = async (updatedRoles) => {
    const safeRoles = updatedRoles.map((r) => {
      const original = roles.find((x) => x.id === r.id);
      return original && original.locked && !isSuperAdmin ? original : r;
    });
    setRoles(safeRoles);
    const ok = await pushRoles(safeRoles);
    showToast(
      ok
        ? t("toast_rolePermissionsSaved")
        : t("toast_rolePermissionsSyncFailed"),
      ok ? "ok" : "error",
    );
    logAudit("edit", "role", t("nav_users_sub_roles"));
  };

  const deleteRole = (roleId) => {
    const target = roles.find((r) => r.id === roleId);
    if (!target || target.locked) return;
    const inUse = users.some((u) => u.role === roleId);
    if (inUse) {
      showToast(t("toast_roleInUse"), "error");
      return;
    }
    const nextRoles = roles.filter((r) => r.id !== roleId);
    setRoles(nextRoles);
    pushRoles(nextRoles);
    showToast(t("toast_roleDeleted"));
    logAudit("delete", "role", target.name_km || target.name_en);
  };

  // Lets any signed-in user (admin or staff) change their own password
  // from the sidebar, without needing an admin to do it for them.
  const changeOwnPassword = (currentPw, newPw) => {
    if (!currentUser) return "error";
    if (currentUser.password !== currentPw) return "wrong-current";
    if (!newPw || newPw.length < 6) return "too-short";
    const updated = { ...currentUser, password: newPw, updatedAt: Date.now() };
    setUsers(users.map((u) => (u.id === currentUser.id ? updated : u)));
    pushUserRow(updated);
    showToast(t("toast_pwChanged"));
    logAudit("edit", "user", currentUser.name_km || currentUser.username);
    return "ok";
  };

  // ---------- POS ----------
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        prodName(p).toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
      const matchesCat =
        categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, search, categoryFilter, lang]);

  // Total quantity already in the cart for a product, summed across every
  // line (a product can have more than one line — see splitCartLine below,
  // used e.g. to sell 10 beers at full price + 5 free on a separate line).
  const qtyInCartForProduct = (productId, excludeLineId) =>
    cart.reduce(
      (s, c) =>
        c.id === productId && c.lineId !== excludeLineId ? s + c.qty : s,
      0,
    );

  const addToCart = (product) => {
    const inCart = cart.find((c) => c.id === product.id);
    const currentQty = qtyInCartForProduct(product.id);
    if (currentQty + 1 > product.stock) {
      showToast(
        `${t("toast_insufficientStock")}: ${prodName(product)}`,
        "error",
      );
      return;
    }
    if (inCart) {
      setCart(
        cart.map((c) =>
          c.lineId === inCart.lineId ? { ...c, qty: c.qty + 1 } : c,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          lineId: genId(),
          id: product.id,
          name: prodName(product),
          price: product.price,
          cost: product.cost || 0,
          unit: prodUnit(product),
          qty: 1,
          image: product.image,
          discountPercent: 0,
        },
      ]);
    }
  };

  // Splits one unit off an existing cart line into its own new line, so a
  // cashier can give that portion a different discount — e.g. buy 10 beers,
  // give 5 free: add 10 normally, tap split 5 times (or adjust qty) to move
  // 5 into their own line, then set that line's discount to 100%.
  const splitCartLine = (lineId) => {
    setCart((prev) => {
      const line = prev.find((c) => c.lineId === lineId);
      if (!line || line.qty < 2) return prev;
      return prev
        .map((c) => (c.lineId === lineId ? { ...c, qty: c.qty - 1 } : c))
        .concat({
          ...line,
          lineId: genId(),
          qty: 1,
          discountPercent: 0,
        });
    });
  };

  // Per-item discount (%) — lets a cashier discount one line (e.g. a
  // promo item, a comped drink) without discounting the whole sale.
  const setItemDiscount = (lineId, percent) => {
    const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
    setCart(
      cart.map((c) =>
        c.lineId === lineId ? { ...c, discountPercent: clamped } : c,
      ),
    );
  };

  // Shared by the USB/Bluetooth scanner (which types into the search box
  // and sends Enter) and the camera scan modal (which returns decoded text
  // directly) — looks up the product by exact barcode match and adds it.
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const handleBarcodeScan = (code) => {
    const trimmed = (code || "").trim();
    if (!trimmed) return;
    const target = normalizeBarcode(trimmed);
    const product = products.find(
      (p) => p.barcode && normalizeBarcode(p.barcode) === target,
    );
    if (product) {
      addToCart(product);
      setSearch("");
    } else {
      showToast(t("toast_barcodeNotFound"), "error");
    }
  };

  const changeQty = (lineId, delta) => {
    const line = cart.find((c) => c.lineId === lineId);
    const product = line && products.find((p) => p.id === line.id);
    setCart(
      cart
        .map((c) => {
          if (c.lineId !== lineId) return c;
          const newQty = c.qty + delta;
          if (
            product &&
            qtyInCartForProduct(product.id, lineId) + newQty > product.stock
          ) {
            showToast(
              `${t("toast_insufficientStock")}: ${prodName(product)}`,
              "error",
            );
            return c;
          }
          return { ...c, qty: newQty };
        })
        .filter((c) => c.qty > 0),
    );
  };

  const removeFromCart = (lineId) =>
    setCart(cart.filter((c) => c.lineId !== lineId));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  // Sum of each line's own discount (price × qty × its own %), separate
  // from the order-level discount box below.
  const itemDiscountTotal = cart.reduce(
    (s, c) => s + (c.price * c.qty * (Number(c.discountPercent) || 0)) / 100,
    0,
  );
  const subtotalAfterItemDiscount = Math.max(subtotal - itemDiscountTotal, 0);
  const discountAmt =
    discountMode === "percent"
      ? Math.min(
          (subtotalAfterItemDiscount * (Number(discount) || 0)) / 100,
          subtotalAfterItemDiscount,
        )
      : Math.min(Number(discount) || 0, subtotalAfterItemDiscount);

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || null;
  const customerDiscountPercent = selectedCustomer
    ? Number(selectedCustomer.discount_percent) || 0
    : 0;
  const availablePoints = selectedCustomer
    ? Math.floor(selectedCustomer.points || 0)
    : 0;
  const afterDiscount = Math.max(subtotalAfterItemDiscount - discountAmt, 0);
  const maxRedeemablePoints = Math.min(
    availablePoints,
    Math.floor(afterDiscount * POINTS_PER_DOLLAR),
  );
  const redeemPointsNum = Math.max(
    0,
    Math.min(Math.floor(Number(redeemPoints) || 0), maxRedeemablePoints),
  );
  const pointsDiscount = redeemPointsNum / POINTS_PER_DOLLAR;
  const total = afterDiscount - pointsDiscount;
  const paymentNum = Number(payment) || 0;
  const change = paymentNum - total;

  // when a member customer with a discount % is selected, switch the field to percent mode
  // and prefill their rate — since it's a %, it stays correct even as the cart changes
  useEffect(() => {
    if (selectedCustomer && customerDiscountPercent > 0) {
      setDiscountMode("percent");
      setDiscount(String(customerDiscountPercent));
    } else if (!selectedCustomerId) {
      setDiscount("");
      setDiscountMode("amount");
    }
    setRedeemPoints("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  const resetCustomerDiscount = () => {
    if (selectedCustomer && customerDiscountPercent > 0) {
      setDiscountMode("percent");
      setDiscount(String(customerDiscountPercent));
    }
  };

  const clearSale = () => {
    setCart([]);
    setDiscount("");
    setDiscountMode("amount");
    setRedeemPoints("");
    setPayment("");
    setPaymentMethod("cash");
    setSelectedCustomerId("");
    setTableLabel("");
    setEditingTabId(null);
  };

  // Saves the current cart as an open tab (unpaid) under a table/customer
  // label instead of charging it now — for bars/restaurants where the guest
  // pays when they leave. Stock is NOT deducted yet; that still happens
  // once the tab is actually closed with payment via completeSale, so
  // inventory, reports, and profit are unaffected by tabs that are only
  // held, edited, or cancelled.
  const holdTab = () => {
    if (cart.length === 0) {
      showToast(t("toast_selectProduct"), "error");
      return;
    }
    const label = tableLabel.trim();
    if (!label) {
      showToast(t("toast_tableRequired"), "error");
      return;
    }
    const id = editingTabId || genId();
    const existing = openTabs.find((o) => o.id === id);
    const tab = {
      id,
      table: label,
      items: cart,
      discount,
      discountMode,
      itemDiscountTotal,
      discountAmt,
      subtotal,
      total,
      customerId: selectedCustomerId || null,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
    setOpenTabs([tab, ...openTabs.filter((o) => o.id !== id)]);
    pushTabRow(tab);
    showToast(t("toast_tabSaved", { table: label }), "ok");
    setReceipt({
      id: "tab-" + id,
      date: new Date().toISOString(),
      items: cart.map((c) => ({
        productId: c.id,
        name: c.name,
        price: c.price,
        qty: c.qty,
        unit: c.unit,
        discountPercent: Number(c.discountPercent) || 0,
        lineDiscount:
          (c.price * c.qty * (Number(c.discountPercent) || 0)) / 100,
      })),
      subtotal,
      discount: discountAmt + itemDiscountTotal,
      total,
      table: label,
      unpaid: true,
    });
    clearSale();
  };

  // Pulls a held tab's items back into the active cart for editing or to
  // collect payment. The tab stays in openTabs until completeSale (or
  // holdTab, to save edits back) resolves it.
  const resumeTab = (tab) => {
    setCart(tab.items || []);
    setDiscount(tab.discount || "");
    setDiscountMode(tab.discountMode || "amount");
    setSelectedCustomerId(tab.customerId || "");
    setTableLabel(tab.table || "");
    setEditingTabId(tab.id);
    setTabListOpen(false);
  };

  const cancelTab = (id) => {
    setOpenTabs(openTabs.filter((o) => o.id !== id));
    deleteTabRow(id);
    if (editingTabId === id) clearSale();
  };

  const completeSale = () => {
    if (cart.length === 0) {
      showToast(t("toast_selectProduct"), "error");
      return;
    }
    if (paymentMethod !== "khqr" && paymentNum < total) {
      showToast(t("toast_insufficientPayment"), "error");
      return;
    }
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const sale = {
      id: genId(),
      date: new Date().toISOString(),
      items: cart.map((c) => ({
        productId: c.id,
        name: c.name,
        price: c.price,
        qty: c.qty,
        unit: c.unit,
        discountPercent: Number(c.discountPercent) || 0,
        lineDiscount:
          (c.price * c.qty * (Number(c.discountPercent) || 0)) / 100,
      })),
      subtotal,
      // Combined total discount (per-item + order-level) so existing
      // profit/report math that reads sale.discount keeps working as-is.
      discount: discountAmt + itemDiscountTotal,
      itemDiscount: itemDiscountTotal,
      orderDiscount: discountAmt,
      total,
      paid: paymentMethod === "khqr" ? total : paymentNum,
      change: paymentMethod === "khqr" ? 0 : change,
      paymentMethod,
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : null,
      table: tableLabel || null,
      archived: false,
      refunded: false,
      refundedAt: null,
      updatedAt: Date.now(),
    };
    setSales([sale, ...sales]);
    const updatedProducts = products.map((p) => {
      const soldQty = qtyInCartForProduct(p.id);
      return soldQty > 0
        ? { ...p, stock: p.stock - soldQty, updatedAt: Date.now() }
        : p;
    });
    setProducts(updatedProducts);
    cart.forEach((c) => {
      const p = updatedProducts.find((x) => x.id === c.id);
      if (p) pushProductRow(p);
    });
    if (customer) {
      const updatedCustomer = {
        ...customer,
        totalSpent: (customer.totalSpent || 0) + total,
        visits: (customer.visits || 0) + 1,
        points: (customer.points || 0) + Math.floor(total),
        updatedAt: Date.now(),
      };
      setCustomers(
        customers.map((c) => (c.id === customer.id ? updatedCustomer : c)),
      );
      pushCustomerRow(updatedCustomer);
    }
    setReceipt(sale);
    if (editingTabId) {
      setOpenTabs(openTabs.filter((o) => o.id !== editingTabId));
      deleteTabRow(editingTabId);
    }
    clearSale();
    showToast(t("toast_saleSuccess"), "ok");
  };

  // ---------- Inventory ----------
  const invFiltered = useMemo(() => {
    return products.filter((p) => {
      const m1 =
        prodName(p).toLowerCase().includes(invSearch.toLowerCase()) ||
        (p.barcode &&
          p.barcode.toLowerCase().includes(invSearch.toLowerCase()));
      const m2 = invCategory === "all" || p.category === invCategory;
      return m1 && m2;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, invSearch, invCategory, lang]);

  const saveProduct = (form) => {
    if (!form.name_km || !form.price || !form.category) {
      showToast(t("toast_fillRequired"), "error");
      return;
    }
    if (form.id) {
      const updated = {
        ...products.find((p) => p.id === form.id),
        ...form,
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0,
        updatedAt: Date.now(),
      };
      setProducts(products.map((p) => (p.id === form.id ? updated : p)));
      showToast(t("toast_productUpdated"));
      pushProductRow(updated);
      logAudit("edit", "product", prodName(updated));
    } else {
      const created = {
        ...form,
        id: genId(),
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0,
        updatedAt: Date.now(),
      };
      setProducts([...products, created]);
      showToast(t("toast_productAdded"));
      pushProductRow(created);
      logAudit("add", "product", prodName(created));
    }
    setProductModal(null);
  };

  const deleteProduct = (id) => {
    const target = products.find((p) => p.id === id);
    setProducts(products.filter((p) => p.id !== id));
    showToast(t("toast_productDeleted"));
    deleteProductRow(id);
    logAudit("delete", "product", target ? prodName(target) : id);
  };

  // ---------- Online ordering (Supabase) ----------
  // Push only the ONE row that actually changed, right when it changed —
  // no debounce, no full-table SELECT diff. This is far lighter than
  // re-syncing the whole array on every keystroke-triggered state change,
  // and (combined with the updatedAt-based merge above) still converges
  // correctly across devices even if a push is briefly in flight.
  const pushProductRow = async (p) => {
    if (!supabase || !shopId) return;
    try {
      const { error } = await supabase.from("products").upsert(
        {
          id: p.id,
          shop_id: shopId,
          name_km: p.name_km,
          name_en: p.name_en || "",
          category: p.category,
          price: p.price,
          cost: p.cost || 0,
          stock: p.stock,
          unit_km: p.unit_km || "",
          unit_en: p.unit_en || "",
          image: p.image || null,
          barcode: p.barcode || null,
          updated_at: p.updatedAt || Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) {
        // Supabase's upsert() resolves (doesn't throw) even when the table
        // rejects the write — e.g. an RLS policy blocking this role. Surface
        // it, because a silently-failed push here means the product looks
        // saved locally but never reaches other devices or the storefront.
        showToast(t("toast_supabaseError"), "error");
        console.error("pushProductRow failed:", error);
      }
    } catch {
      /* offline — local copy still safe, will retry on next change */
    }
  };
  const deleteProductRow = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("deleteProductRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const pushUserRow = async (u) => {
    if (!supabase || !shopId) return;
    try {
      const { error } = await supabase.from("users").upsert(
        {
          id: u.id,
          shop_id: shopId,
          username: u.username,
          password: u.password,
          name_km: u.name_km || "",
          name_en: u.name_en || "",
          role: u.role,
          active: typeof u.active === "boolean" ? u.active : true,
          updated_at: u.updatedAt || Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) {
        // Supabase's upsert() resolves (doesn't throw) even when the table
        // rejects the write — e.g. an `active` column that doesn't exist yet
        // on this project. Surface it, because a silently-failed push here
        // means a disabled account keeps working on every other device.
        showToast(t("toast_userSyncFailed"), "error");
      }
    } catch {
      /* offline */
    }
  };
  const deleteUserRow = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("deleteUserRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const pushCustomerRow = async (c) => {
    if (!supabase || !shopId) return;
    try {
      const { error } = await supabase.from("customers").upsert(
        {
          id: c.id,
          shop_id: shopId,
          name: c.name,
          phone: c.phone || "",
          discount_percent: c.discount_percent || 0,
          total_spent: c.totalSpent || 0,
          visits: c.visits || 0,
          points: c.points || 0,
          updated_at: c.updatedAt || Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("pushCustomerRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const deleteCustomerRow = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("deleteCustomerRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const pushShiftRow = async (s) => {
    if (!supabase || !shopId) return;
    try {
      const { error } = await supabase.from("shifts").upsert(
        {
          id: s.id,
          shop_id: shopId,
          opened_by: s.openedBy || "",
          opened_at: s.openedAt,
          opening_cash: s.openingCash,
          closed_by: s.closedBy || null,
          closed_at: s.closedAt || null,
          cash_sales: s.cashSales ?? null,
          cash_refunds: s.cashRefunds ?? null,
          adjustments: s.adjustments ?? 0,
          expected_cash: s.expectedCash ?? null,
          counted_cash: s.countedCash ?? null,
          difference: s.difference ?? null,
          note: s.note || "",
          updated_at: s.updatedAt || Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("pushShiftRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const deleteShiftRow = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("deleteShiftRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };

  const pushExpenseRow = async (e) => {
    if (!supabase || !shopId) return;
    try {
      const { error } = await supabase.from("expenses").upsert(
        {
          id: e.id,
          shop_id: shopId,
          date: e.date,
          category: e.category,
          amount: e.amount,
          note: e.note || "",
          user_id: e.userId || null,
          username: e.username || "",
          updated_at: e.updatedAt || Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("pushExpenseRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const deleteExpenseRow = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("deleteExpenseRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const pushCategoryRow = async (c) => {
    if (!supabase || !shopId) return;
    try {
      const { error } = await supabase.from("categories").upsert(
        {
          key: c.key,
          shop_id: shopId,
          label_km: c.label_km || "",
          label_en: c.label_en || "",
          updated_at: c.updatedAt || Date.now(),
        },
        { onConflict: "shop_id,key" },
      );
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("pushCategoryRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };
  const deleteCategoryRow = async (key) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("key", key);
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("deleteCategoryRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };

  // Held/unpaid tabs (e.g. a table waiting to pay) — pushed the same way as
  // products/sales/etc. so a tab opened on one device (the counter PC) shows
  // up on another signed-in device for the same shop (a tablet, a phone),
  // instead of being stuck in that one device's localStorage.
  const pushTabRow = async (tab) => {
    if (!supabase || !shopId) return;
    try {
      const { error } = await supabase.from("open_tabs").upsert(
        {
          id: tab.id,
          shop_id: shopId,
          table_label: tab.table || "",
          items: tab.items || [],
          discount:
            tab.discount === "" ||
            tab.discount === null ||
            tab.discount === undefined
              ? null
              : Number(tab.discount),
          discount_mode: tab.discountMode || null,
          item_discount_total: tab.itemDiscountTotal || 0,
          discount_amt: tab.discountAmt || 0,
          subtotal: tab.subtotal || 0,
          total: tab.total || 0,
          customer_id: tab.customerId || null,
          created_at: tab.createdAt || Date.now(),
          updated_at: tab.updatedAt || Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("pushTabRow failed:", error);
      }
    } catch {
      /* offline — local copy still safe, will retry on next change */
    }
  };
  const deleteTabRow = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("open_tabs").delete().eq("id", id);
      if (error) {
        showToast(t("toast_supabaseError"), "error");
        console.error("deleteTabRow failed:", error);
      }
    } catch {
      /* offline */
    }
  };

  const [onlineOrders, setOnlineOrders] = useState([]);
  const [notifySoundOn, setNotifySoundOn] = useState(
    () => localStorage.getItem("notifySoundOn") !== "off",
  );
  useEffect(() => {
    try {
      localStorage.setItem("notifySoundOn", notifySoundOn ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, [notifySoundOn]);
  // Which preset ("chime", "bell", ... or "custom") plays for new orders.
  const [notifySoundId, setNotifySoundId] = useState(
    () => localStorage.getItem("notifySoundId") || DEFAULT_SOUND_ID,
  );
  // Data-URL of a user-uploaded custom sound file, if any.
  const [notifySoundCustom, setNotifySoundCustom] = useState(
    () => localStorage.getItem("notifySoundCustom") || "",
  );
  const [notifySoundCustomName, setNotifySoundCustomName] = useState(
    () => localStorage.getItem("notifySoundCustomName") || "",
  );
  // How long (seconds) the sound keeps repeating before auto-stopping.
  // 0 = play once.
  const [notifySoundDuration, setNotifySoundDuration] = useState(
    () => Number(localStorage.getItem("notifySoundDuration")) || 0,
  );
  useEffect(() => {
    try {
      localStorage.setItem("notifySoundId", notifySoundId);
    } catch {
      /* ignore */
    }
  }, [notifySoundId]);
  useEffect(() => {
    try {
      if (notifySoundCustom)
        localStorage.setItem("notifySoundCustom", notifySoundCustom);
      else localStorage.removeItem("notifySoundCustom");
    } catch {
      /* custom sound file may be too large for localStorage — ignore */
    }
  }, [notifySoundCustom]);
  useEffect(() => {
    try {
      localStorage.setItem("notifySoundCustomName", notifySoundCustomName);
    } catch {
      /* ignore */
    }
  }, [notifySoundCustomName]);
  useEffect(() => {
    try {
      localStorage.setItem("notifySoundDuration", String(notifySoundDuration));
    } catch {
      /* ignore */
    }
  }, [notifySoundDuration]);
  useEffect(() => {
    if (
      supabase &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      try {
        Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
  }, []);
  const pendingOrderCount = onlineOrders.filter(
    (o) => o.status === "pending" && !o.archived,
  ).length;
  const activeOnlineOrders = onlineOrders.filter((o) => !o.archived);
  const archivedOnlineOrders = onlineOrders.filter((o) => o.archived);
  const [supabaseStatus, setSupabaseStatus] = useState(
    supabase ? "connecting" : "off",
  );

  // merge helper: whichever copy was edited MORE RECENTLY wins on id conflicts
  // (compares updatedAt), so two devices editing the same item converge on the
  // real latest change instead of one device's edits always winning.
  // Rows without updatedAt (e.g. old local data, sales) are treated as local wins.
  // A local row missing from the cloud fetch is either (a) brand new and not
  // synced yet, or (b) deleted on another device — if it's older than 20s
  // (well past a normal sync round-trip) we assume (b) and drop it locally too.
  const mergeById = (local, remote) => {
    const map = new Map();
    remote.forEach((item) => map.set(item.id, item));
    local.forEach((item) => {
      const existing = map.get(item.id);
      if (existing) {
        // Treat a missing timestamp as the oldest possible value (0) instead of
        // an automatic local win — otherwise legacy/local-only rows (e.g. seed
        // products with no updatedAt) would always overwrite newer remote data.
        const localTime =
          typeof item.updatedAt === "number" ? item.updatedAt : 0;
        const remoteTime =
          typeof existing.updatedAt === "number" ? existing.updatedAt : 0;
        if (remoteTime > localTime) {
          return; // remote copy is newer — keep it
        }
        map.set(item.id, item);
        return;
      }
      if (typeof item.updatedAt !== "number") {
        map.set(item.id, item); // no timestamp (e.g. sales) — always keep local-only rows
        return;
      }
      const age = Date.now() - item.updatedAt;
      if (age < 20000) {
        map.set(item.id, item); // probably just created, not synced yet — keep
      }
      // else: assume deleted on another device, drop it
    });
    return Array.from(map.values());
  };

  // Same convergence rule as mergeById, but categories are keyed by their
  // "key" string (e.g. "beverage") instead of a generated id.
  const mergeCategories = (local, remote) => {
    const map = new Map();
    remote.forEach((item) => map.set(item.key, item));
    local.forEach((item) => {
      const existing = map.get(item.key);
      if (existing) {
        const localTime =
          typeof item.updatedAt === "number" ? item.updatedAt : 0;
        const remoteTime =
          typeof existing.updatedAt === "number" ? existing.updatedAt : 0;
        if (remoteTime > localTime) return;
        map.set(item.key, item);
        return;
      }
      if (typeof item.updatedAt !== "number") {
        map.set(item.key, item);
        return;
      }
      const age = Date.now() - item.updatedAt;
      if (age < 20000) map.set(item.key, item);
    });
    return Array.from(map.values());
  };

  // ---- Push local sales to Supabase so other devices (e.g. your phone) see them ----
  // Every sale now carries an `updatedAt` timestamp (set on create, and
  // bumped again on refund/archive/restore) — mergeById below uses it to
  // decide which device's copy of a sale is newer. Without it, a refund
  // done on one device could never "win" against another device's older,
  // still-unrefunded local copy of the same sale.
  useEffect(() => {
    if (loading || !supabase || !shopId || !sales.length) return;
    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase.from("sales").upsert(
          sales.map((s) => ({
            id: s.id,
            shop_id: shopId,
            date: s.date,
            items: s.items,
            subtotal: s.subtotal,
            discount: s.discount,
            total: s.total,
            paid: s.paid,
            change: s.change,
            customer_name: s.customerName || null,
            payment_method: s.paymentMethod || "cash",
            archived: !!s.archived,
            refunded: !!s.refunded,
            refunded_at: s.refundedAt || null,
            updated_at: s.updatedAt || Date.now(),
          })),
          { onConflict: "id" },
        );
        if (error) {
          // Same silent-failure risk as product/user pushes: if RLS or a
          // schema mismatch rejects this, sales stay stuck on this device
          // only unless the error is surfaced.
          showToast(t("toast_supabaseError"), "error");
          console.error("sales sync failed:", error);
        }
      } catch {
        /* offline — local copy still safe, will retry on next change */
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [sales, loading, shopId]);

  // ---- Pull sales/customers from Supabase so this device picks up what other devices recorded ----
  // Bug fix: none of the fetchCloud* functions below filtered by shop_id, so
  // every device pulled every shop's rows and merged them together locally.
  // Each now scopes its query to the signed-in shop.
  const fetchCloudSales = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      const mapped = (data || []).map((r) => ({
        id: r.id,
        date: r.date,
        items: r.items,
        subtotal: r.subtotal,
        discount: r.discount,
        total: r.total,
        paid: r.paid,
        change: r.change,
        customerName: r.customer_name || "",
        paymentMethod: r.payment_method || "cash",
        archived: !!r.archived,
        refunded: !!r.refunded,
        refundedAt: r.refunded_at || null,
        updatedAt: r.updated_at || 0,
      }));
      setSales((prev) => mergeById(prev, mapped));
    } catch {
      /* ignore, local cache still works */
    }
  };

  const fetchCloudCustomers = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      const mapped = (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone || "",
        discount_percent: r.discount_percent || 0,
        totalSpent: r.total_spent || 0,
        visits: r.visits || 0,
        points: r.points || 0,
        updatedAt: r.updated_at || 0,
      }));
      setCustomers((prev) => mergeById(prev, mapped));
    } catch {
      /* ignore, local cache still works */
    }
  };

  const fetchCloudShifts = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      const mapped = (data || []).map((r) => ({
        id: r.id,
        openedBy: r.opened_by || "",
        openedAt: r.opened_at,
        openingCash: r.opening_cash,
        closedBy: r.closed_by || null,
        closedAt: r.closed_at || null,
        cashSales: r.cash_sales,
        cashRefunds: r.cash_refunds,
        adjustments: r.adjustments || 0,
        expectedCash: r.expected_cash,
        countedCash: r.counted_cash,
        difference: r.difference,
        note: r.note || "",
        updatedAt: r.updated_at || 0,
      }));
      setShifts((prev) => mergeById(prev, mapped));
    } catch {
      /* ignore, local cache still works */
    }
  };

  const fetchCloudExpenses = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      const mapped = (data || []).map((r) => ({
        id: r.id,
        date: r.date,
        category: r.category,
        amount: r.amount,
        note: r.note || "",
        userId: r.user_id || null,
        username: r.username || "",
        updatedAt: r.updated_at || 0,
      }));
      setExpenses((prev) => mergeById(prev, mapped));
    } catch {
      /* ignore, local cache still works */
    }
  };

  const fetchCloudCategories = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      if (data && data.length) {
        const mapped = data.map((r) => ({
          key: r.key,
          label_km: r.label_km || "",
          label_en: r.label_en || "",
          updatedAt: r.updated_at || 0,
        }));
        setCategories((prev) => mergeCategories(prev, mapped));
      }
    } catch {
      /* ignore, local cache still works */
    }
  };

  // ---- Pull held/unpaid tabs so a tab opened on one device (e.g. the
  // counter PC) shows up on every other signed-in device for this shop ----
  const fetchCloudTabs = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("open_tabs")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      const mapped = (data || []).map((r) => ({
        id: r.id,
        table: r.table_label || "",
        items: r.items || [],
        discount: r.discount,
        discountMode: r.discount_mode || "amount",
        itemDiscountTotal: r.item_discount_total || 0,
        discountAmt: r.discount_amt || 0,
        subtotal: r.subtotal || 0,
        total: r.total || 0,
        customerId: r.customer_id || null,
        createdAt: r.created_at || 0,
        updatedAt: r.updated_at || 0,
      }));
      setOpenTabs((prev) => mergeById(prev, mapped));
    } catch {
      /* ignore, local cache still works */
    }
  };

  // ---- Pull products/users from Supabase so every device shares the same catalog + accounts ----
  const fetchCloudProducts = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      if (data && data.length) {
        const mapped = data.map((r) => ({
          id: r.id,
          name_km: r.name_km,
          name_en: r.name_en || "",
          category: r.category,
          price: r.price,
          cost: r.cost || 0,
          stock: r.stock,
          unit_km: r.unit_km || "",
          unit_en: r.unit_en || "",
          image: r.image || null,
          barcode: r.barcode || "",
          updatedAt: r.updated_at || 0,
        }));
        setProducts((prev) => mergeById(prev, mapped));
      }
    } catch {
      /* ignore, local cache still works */
    }
  };

  const fetchCloudUsers = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("shop_id", shopId);
      if (error) throw error;
      if (data && data.length) {
        const mapped = data.map((r) => ({
          id: r.id,
          username: r.username,
          password: r.password,
          name_km: r.name_km || "",
          name_en: r.name_en || "",
          role: r.role,
          active: typeof r.active === "boolean" ? r.active : true,
          updatedAt: r.updated_at || 0,
        }));
        setUsers((prev) => mergeById(prev, mapped));
      }
    } catch {
      /* ignore, local cache still works */
    }
  };

  // ---- Shop-wide settings (e.g. KHR rate) shared across every device ----
  const fetchCloudSettings = async () => {
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("id", shopId)
        .maybeSingle();
      if (error) throw error;
      if (data && data.khr_rate) setKhrRate(data.khr_rate);
      if (data && typeof data.shop_name === "string")
        setShopName(data.shop_name);
      if (data && typeof data.shop_logo === "string")
        setShopLogo(data.shop_logo);
      if (data && typeof data.pay_cash_enabled === "boolean")
        setPayCashEnabled(data.pay_cash_enabled);
      if (data && typeof data.pay_khqr_enabled === "boolean")
        setPayKhqrEnabled(data.pay_khqr_enabled);
      if (data && typeof data.khqr_image === "string")
        setKhqrImage(data.khqr_image);
      if (data && typeof data.khqr_dynamic_enabled === "boolean")
        setKhqrDynamicEnabled(data.khqr_dynamic_enabled);
      if (data && typeof data.khqr_account_id === "string")
        setKhqrAccountId(data.khqr_account_id);
      if (data && typeof data.khqr_merchant_name === "string")
        setKhqrMerchantName(data.khqr_merchant_name);
      if (data && typeof data.khqr_merchant_city === "string")
        setKhqrMerchantCity(data.khqr_merchant_city);
      if (data && typeof data.khqr_bank_name === "string")
        setKhqrBankName(data.khqr_bank_name);
      if (data && typeof data.roles_json === "string") {
        try {
          const cloudRoles = JSON.parse(data.roles_json);
          // Only replace local roles once we actually have a non-empty
          // array back — an empty/blank column (fresh project, or a
          // device that hasn't saved permissions yet) should never wipe
          // out what's already on screen.
          if (Array.isArray(cloudRoles) && cloudRoles.length) {
            setRoles(cloudRoles);
          }
        } catch {
          /* malformed roles payload — keep local roles as-is */
        }
      }
      if (data && typeof data.features_json === "string") {
        try {
          const cloudFeatures = JSON.parse(data.features_json);
          if (cloudFeatures && typeof cloudFeatures === "object") {
            // Merge over the defaults (not a plain replace) so a shop
            // that predates a newly-added premium feature treats it as
            // off, rather than the JSON.parse result simply omitting the
            // key and some other code path treating "undefined" as truthy.
            setFeatures({ ...DEFAULT_FEATURES, ...cloudFeatures });
          }
        } catch {
          /* malformed features payload — keep local features as-is */
        }
      }
    } catch {
      /* ignore, local cache still works */
    }
  };

  const pushPaymentSettings = async (
    cashEnabled,
    khqrEnabled,
    khqrImg,
    dynEnabled,
    acctId,
    merchName,
    merchCity,
    bank,
  ) => {
    if (!supabase || !shopId) return;
    try {
      await supabase.from("shop_settings").upsert(
        {
          id: shopId,
          shop_id: shopId,
          pay_cash_enabled: cashEnabled,
          pay_khqr_enabled: khqrEnabled,
          khqr_image: khqrImg || null,
          khqr_dynamic_enabled: !!dynEnabled,
          khqr_account_id: acctId || null,
          khqr_merchant_name: merchName || null,
          khqr_merchant_city: merchCity || null,
          khqr_bank_name: bank || null,
          updated_at: Date.now(),
        },
        { onConflict: "id" },
      );
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const pushKhrRate = async (rate) => {
    if (!supabase || !shopId) return;
    try {
      await supabase.from("shop_settings").upsert(
        {
          id: shopId,
          shop_id: shopId,
          khr_rate: rate,
          updated_at: Date.now(),
        },
        { onConflict: "id" },
      );
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const pushShopInfo = async (name, logo) => {
    if (!supabase || !shopId) return;
    try {
      await supabase.from("shop_settings").upsert(
        {
          id: shopId,
          shop_id: shopId,
          shop_name: name || null,
          shop_logo: logo || null,
          updated_at: Date.now(),
        },
        { onConflict: "id" },
      );
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // Role permissions are pushed as one JSON blob (not row-by-row like
  // users/products) since the whole matrix is edited and saved together —
  // this is what makes changes on one device actually show up for other
  // signed-in devices, which was missing before. Returns true/false so
  // callers can tell the admin whether the cloud save actually worked.
  const pushRoles = async (rolesList) => {
    if (!supabase || !shopId) return true;
    try {
      const { error } = await supabase.from("shop_settings").upsert(
        {
          id: shopId,
          shop_id: shopId,
          roles_json: JSON.stringify(rolesList),
          updated_at: Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  };

  // Same one-JSON-blob pattern as pushRoles above, but this one is only
  // ever called from the Super Admin panel — a shop's own admin has no UI
  // that can reach this, since paid features are Super Admin's call, not
  // theirs.
  const pushFeatures = async (featuresObj) => {
    if (!supabase || !shopId) return true;
    try {
      const { error } = await supabase.from("shop_settings").upsert(
        {
          id: shopId,
          shop_id: shopId,
          features_json: JSON.stringify(featuresObj),
          updated_at: Date.now(),
        },
        { onConflict: "id" },
      );
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!supabase || loading || !shopId) return;
    fetchCloudSales();
    fetchCloudCustomers();
    fetchCloudProducts();
    fetchCloudUsers();
    fetchCloudSettings();
    fetchCloudExpenses();
    fetchCloudCategories();
    fetchCloudShifts();
    fetchCloudTabs();
    const poll = setInterval(() => {
      fetchCloudSales();
      fetchCloudCustomers();
      fetchCloudProducts();
      fetchCloudUsers();
      fetchCloudSettings();
      fetchCloudExpenses();
      fetchCloudCategories();
      fetchCloudShifts();
      fetchCloudTabs();
    }, 15000);
    let channel;
    try {
      channel = supabase
        .channel("pos_data_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sales",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchCloudSales,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customers",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchCloudCustomers,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchCloudProducts,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchCloudUsers,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "shop_settings",
            filter: `id=eq.${shopId}`,
          },
          fetchCloudSettings,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "expenses",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchCloudExpenses,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "categories",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchCloudCategories,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "open_tabs",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchCloudTabs,
        )
        .subscribe();
    } catch {
      /* realtime unavailable, polling still covers it */
    }
    return () => {
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, shopId]);

  const fetchOnlineOrders = async () => {
    // Bug fix: this used to select every row in online_orders with no
    // shop filter, so every shop saw every other shop's online orders
    // (and their line items) mixed together. Scope it to this shop.
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("online_orders")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOnlineOrders(data || []);
      setSupabaseStatus("live");
    } catch {
      setSupabaseStatus("error");
    }
  };

  useEffect(() => {
    if (!supabase || loading || !shopId) return;
    fetchOnlineOrders();
    const poll = setInterval(fetchOnlineOrders, 15000); // fallback in case realtime isn't enabled
    let channel;
    try {
      channel = supabase
        .channel("online_orders_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "online_orders",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchOnlineOrders,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "online_orders",
            filter: `shop_id=eq.${shopId}`,
          },
          (payload) => {
            const soundOn = localStorage.getItem("notifySoundOn") !== "off";
            if (soundOn)
              playNotifySound({
                soundId:
                  localStorage.getItem("notifySoundId") || DEFAULT_SOUND_ID,
                customUrl: localStorage.getItem("notifySoundCustom") || null,
                durationSec:
                  Number(localStorage.getItem("notifySoundDuration")) || 0,
              });
            showToast(
              t("toast_newOrderReceived", {
                name: (payload.new && payload.new.customer_name) || "",
              }),
            );
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted" &&
              document.hidden
            ) {
              try {
                new Notification(
                  t("toast_newOrderReceived", {
                    name: (payload.new && payload.new.customer_name) || "",
                  }),
                );
              } catch {
                /* ignore */
              }
            }
          },
        )
        .subscribe();
    } catch {
      /* realtime unavailable, polling still covers it */
    }
    return () => {
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, shopId]);

  // ---------- Audit log (who added/edited/deleted what) ----------
  const [auditLog, setAuditLog] = useState([]);
  const fetchAuditLog = async () => {
    // Same bug as online_orders: no shop filter meant every shop saw every
    // other shop's audit trail. Scope it to this shop.
    if (!supabase || !shopId) return;
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      setAuditLog(data || []);
    } catch {
      /* table may not exist yet — ignore */
    }
  };

  useEffect(() => {
    if (!supabase || loading || !shopId || !allowedTabs.includes("auditLog"))
      return;
    fetchAuditLog();
    const poll = setInterval(fetchAuditLog, 15000);
    let channel;
    try {
      channel = supabase
        .channel("audit_log_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "audit_log",
            filter: `shop_id=eq.${shopId}`,
          },
          fetchAuditLog,
        )
        .subscribe();
    } catch {
      /* realtime unavailable, polling still covers it */
    }
    return () => {
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, shopId, currentUser && currentUser.id]);

  // Records who did what, for accountability. Best-effort: if it fails (e.g.
  // offline, or the audit_log table doesn't exist yet) it never blocks the
  // actual add/edit/delete action.
  const logAudit = async (action, entityType, entityLabel) => {
    const entry = {
      id: genId(),
      user_id: currentUser ? currentUser.id : null,
      username: currentUser
        ? currentUser.name_km || currentUser.name_en || currentUser.username
        : "—",
      action, // "add" | "edit" | "delete"
      entity_type: entityType, // "product" | "customer" | "user"
      entity_label: entityLabel,
      created_at: new Date().toISOString(),
    };
    setAuditLog((prev) => [entry, ...prev]);
    if (!supabase || !shopId) return;
    try {
      await supabase.from("audit_log").insert({ ...entry, shop_id: shopId });
    } catch {
      /* offline or table missing — local list above still shows it this session */
    }
  };

  // Danger-zone action from Settings: wipes all sales history so the
  // Dashboard/Reports numbers go back to zero. Does NOT touch products,
  // customers, expenses, or users — only the `sales` table.
  //
  // Supabase can return "success" (no error) on a delete that Row Level
  // Security silently filtered down to 0 affected rows — so we don't just
  // trust the absence of an error. We chain .select("id") to see exactly
  // which rows were removed, then re-count the table to confirm nothing
  // was left behind by a partial/blocked delete. That re-count MUST be
  // scoped to this shop_id — the read policy on these tables allows
  // reading every shop's rows, so an unscoped count includes other shops'
  // untouched data and would falsely report "blocked by RLS" even when
  // this shop's own delete fully succeeded.
  const resetSalesData = async () => {
    try {
      if (supabase && shopId) {
        const { error } = await supabase
          .from("sales")
          .delete()
          .eq("shop_id", shopId)
          .select("id");
        if (error) throw error;
        const { count, error: countError } = await supabase
          .from("sales")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId);
        if (countError) throw countError;
        if (count && count > 0) {
          showToast(t("settings_resetBlockedByRls"), "error");
          return;
        }
      }
      setSales([]);
      logAudit("delete", "sales_data", t("settings_resetSalesData"));
      showToast(t("settings_resetSalesDataDone"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // Danger-zone action: sets every product's stock quantity to 0 while
  // keeping the product catalog itself (name, price, category, barcode...)
  // intact. Useful before a fresh physical stock count.
  const resetStockQuantities = async () => {
    try {
      const updated = products.map((p) => ({
        ...p,
        stock: 0,
        updatedAt: Date.now(),
      }));
      if (supabase && shopId) {
        const { error } = await supabase.from("products").upsert(
          updated.map((p) => ({
            id: p.id,
            shop_id: shopId,
            name_km: p.name_km,
            name_en: p.name_en || "",
            category: p.category,
            price: p.price,
            cost: p.cost || 0,
            stock: 0,
            unit_km: p.unit_km || "",
            unit_en: p.unit_en || "",
            image: p.image || null,
            barcode: p.barcode || null,
            updated_at: p.updatedAt,
          })),
          { onConflict: "id" },
        );
        if (error) throw error;
        // Confirm the write actually landed — RLS can block an UPDATE
        // (via upsert) silently too, leaving stock untouched server-side.
        // Scoped to this shop_id: the read policy allows seeing every
        // shop's rows, so an unscoped count would include other shops'
        // still-nonzero stock and falsely report this shop's update as
        // blocked.
        const { count, error: countError } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId)
          .gt("stock", 0);
        if (countError) throw countError;
        if (count && count > 0) {
          showToast(t("settings_resetBlockedByRls"), "error");
          return;
        }
      }
      setProducts(updated);
      logAudit("edit", "stock_data", t("settings_resetStockQty"));
      showToast(t("settings_resetStockQtyDone"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // Danger-zone action: deletes every product from the catalog entirely
  // (not just their stock numbers). Sales history is untouched.
  const deleteAllProducts = async () => {
    try {
      if (supabase && shopId) {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("shop_id", shopId)
          .select("id");
        if (error) throw error;
        // Scoped to this shop_id — see note in resetSalesData above on why
        // an unscoped count here would falsely report a successful,
        // shop-scoped delete as "blocked by RLS".
        const { count, error: countError } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId);
        if (countError) throw countError;
        if (count && count > 0) {
          showToast(t("settings_resetBlockedByRls"), "error");
          return;
        }
      }
      setProducts([]);
      logAudit("delete", "products_all", t("settings_deleteAllProducts"));
      showToast(t("settings_deleteAllProductsDone"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const acceptOnlineOrder = async (order) => {
    try {
      // acknowledge + reserve stock only — revenue is NOT recorded yet since payment hasn't been collected
      const items = order.items || [];
      setProducts((prev) =>
        prev.map((p) => {
          const line = items.find((i) => i.id === p.id);
          return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
        }),
      );
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ status: "accepted" })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "accepted" } : o)),
      );
      showToast(t("toast_orderAccepted"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const markOrderPaid = async (order) => {
    try {
      // customer has actually paid now — this is the point revenue gets recorded
      setSales((prev) => [
        ...prev,
        {
          id: genId(),
          orderId: order.id,
          date: new Date().toISOString(),
          items: order.items || [],
          subtotal: order.subtotal,
          discount: 0,
          total: order.subtotal,
          paid: order.subtotal,
          change: 0,
          customerName: order.customer_name || "",
          archived: false,
          refunded: false,
          refundedAt: null,
          updatedAt: Date.now(),
        },
      ]);
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ status: "paid" })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "paid" } : o)),
      );
      showToast(t("toast_orderPaid"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // Corrective action for when a staff member mis-clicks "Mark as paid" —
  // reverts the order to accepted/unpaid and removes the revenue entry
  // that was recorded for it, so books stay accurate.
  const undoMarkPaid = async (order) => {
    try {
      const sale = sales.find((s) => s.orderId === order.id);
      if (supabase) {
        await supabase
          .from("online_orders")
          .update({ status: "accepted" })
          .eq("id", order.id);
        if (sale) await supabase.from("sales").delete().eq("id", sale.id);
      }
      setOnlineOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "accepted" } : o)),
      );
      if (sale) setSales((prev) => prev.filter((s) => s.id !== sale.id));
      showToast(t("toast_orderUnpaid"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const cancelAcceptedOrder = async (order, reason) => {
    try {
      // customer never paid / no-show — restore the reserved stock
      const items = order.items || [];
      const byName = currentUser
        ? currentUser.name_km || currentUser.name_en || currentUser.username
        : "";
      setProducts((prev) =>
        prev.map((p) => {
          const line = items.find((i) => i.id === p.id);
          return line ? { ...p, stock: p.stock + line.qty } : p;
        }),
      );
      if (supabase)
        await supabase
          .from("online_orders")
          .update({
            status: "cancelled",
            status_reason: reason,
            status_by: byName,
          })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "cancelled",
                status_reason: reason,
                status_by: byName,
              }
            : o,
        ),
      );
      showToast(t("toast_orderCancelled"));
      logAudit("cancel", "order", order.customer_name || order.id);
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const rejectOnlineOrder = async (order, reason) => {
    try {
      const byName = currentUser
        ? currentUser.name_km || currentUser.name_en || currentUser.username
        : "";
      if (supabase)
        await supabase
          .from("online_orders")
          .update({
            status: "rejected",
            status_reason: reason,
            status_by: byName,
          })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "rejected",
                status_reason: reason,
                status_by: byName,
              }
            : o,
        ),
      );
      showToast(t("toast_orderRejected"));
      logAudit("reject", "order", order.customer_name || order.id);
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // ---------- Archive for finished online orders (paid/rejected/cancelled) ----------
  const archiveOrder = async (order) => {
    try {
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ archived: true })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, archived: true } : o)),
      );
      showToast(t("toast_archived", { count: 1 }));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const restoreOrder = async (order) => {
    try {
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ archived: false })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, archived: false } : o)),
      );
      showToast(t("toast_restored"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const archiveFinishedOrders = async () => {
    const finished = onlineOrders.filter(
      (o) =>
        !o.archived && ["paid", "rejected", "cancelled"].includes(o.status),
    );
    if (finished.length === 0) {
      showToast(t("toast_nothingToArchive"), "error");
      return;
    }
    const ids = finished.map((o) => o.id);
    try {
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ archived: true })
          .in("id", ids);
      setOnlineOrders((prev) =>
        prev.map((o) => (ids.includes(o.id) ? { ...o, archived: true } : o)),
      );
      showToast(t("toast_archived", { count: ids.length }));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const restoreAllOrders = async () => {
    const archived = onlineOrders.filter((o) => o.archived);
    if (archived.length === 0) return;
    const ids = archived.map((o) => o.id);
    try {
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ archived: false })
          .in("id", ids);
      setOnlineOrders((prev) =>
        prev.map((o) => (ids.includes(o.id) ? { ...o, archived: false } : o)),
      );
      showToast(t("toast_restoredAll"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // ---------- Permanent delete for archived online orders (Super Admin only) ----------
  // Unlike archive/restore above, these actually remove the row from
  // `online_orders` in Supabase — irreversible. Gated behind `isSuperAdmin`
  // in the UI. Every id passed in already comes from `onlineOrders`, which
  // is fetched with `.eq("shop_id", shopId)` (see fetchOnlineOrders above),
  // so these can only ever touch the current shop's own rows — but since
  // this is a hard delete (not a soft archive), we also repeat the
  // shop_id filter on the delete call itself as a second guard, in case
  // `order`/`ids` were ever built from a different source in the future.
  const deleteOrderPermanently = async (order) => {
    try {
      if (supabase)
        await supabase
          .from("online_orders")
          .delete()
          .eq("id", order.id)
          .eq("shop_id", shopId);
      setOnlineOrders((prev) => prev.filter((o) => o.id !== order.id));
      showToast(t("toast_orderDeleted"));
      logAudit("delete", "order", order.customer_name || order.id);
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const deleteAllArchivedOrders = async () => {
    const archived = onlineOrders.filter((o) => o.archived);
    if (archived.length === 0) return;
    const ids = archived.map((o) => o.id);
    try {
      if (supabase)
        await supabase
          .from("online_orders")
          .delete()
          .in("id", ids)
          .eq("shop_id", shopId);
      setOnlineOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      showToast(t("toast_ordersDeletedAll", { count: ids.length }));
      logAudit("delete", "order", `${ids.length} orders (bulk)`);
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // ---------- Customers ----------
  const saveCustomer = (form) => {
    if (!form.name) {
      showToast(t("toast_customerRequired"), "error");
      return;
    }
    const clean = {
      ...form,
      discount_percent: Math.max(
        0,
        Math.min(100, Number(form.discount_percent) || 0),
      ),
    };
    if (clean.id) {
      const updated = {
        ...customers.find((c) => c.id === clean.id),
        ...clean,
        updatedAt: Date.now(),
      };
      setCustomers(customers.map((c) => (c.id === clean.id ? updated : c)));
      showToast(t("toast_customerUpdated"));
      pushCustomerRow(updated);
      logAudit("edit", "customer", updated.name);
    } else {
      const created = {
        ...clean,
        id: genId(),
        totalSpent: 0,
        visits: 0,
        points: 0,
        updatedAt: Date.now(),
      };
      setCustomers([...customers, created]);
      showToast(t("toast_customerAdded"));
      pushCustomerRow(created);
      logAudit("add", "customer", created.name);
    }
    setCustomerModal(null);
  };
  const deleteCustomer = (id) => {
    const target = customers.find((c) => c.id === id);
    setCustomers(customers.filter((c) => c.id !== id));
    showToast(t("toast_customerDeleted"));
    deleteCustomerRow(id);
    logAudit("delete", "customer", target ? target.name : id);
  };

  const saveExpense = (form) => {
    if (!form.category || !form.amount || Number(form.amount) <= 0) {
      showToast(t("toast_customerRequired"), "error");
      return;
    }
    const clean = {
      category: form.category,
      amount: Number(form.amount) || 0,
      note: form.note || "",
      date: form.date || new Date().toISOString().slice(0, 10),
    };
    const label = `${t("exp_cat_" + clean.category)} — ${fmt(clean.amount)}`;
    if (form.id) {
      const updated = {
        ...expenses.find((e) => e.id === form.id),
        ...clean,
        updatedAt: Date.now(),
      };
      setExpenses(expenses.map((e) => (e.id === form.id ? updated : e)));
      showToast(t("toast_expenseUpdated"));
      pushExpenseRow(updated);
      logAudit("edit", "expense", label);
    } else {
      const created = {
        ...clean,
        id: genId(),
        userId: currentUser ? currentUser.id : null,
        username: currentUser
          ? currentUser.name_km || currentUser.name_en || currentUser.username
          : "",
        updatedAt: Date.now(),
      };
      setExpenses([created, ...expenses]);
      showToast(t("toast_expenseAdded"));
      pushExpenseRow(created);
      logAudit("add", "expense", label);
    }
    setExpenseModal(null);
  };
  const deleteExpense = (id) => {
    const target = expenses.find((e) => e.id === id);
    setExpenses(expenses.filter((e) => e.id !== id));
    showToast(t("toast_expenseDeleted"));
    deleteExpenseRow(id);
    logAudit(
      "delete",
      "expense",
      target
        ? `${t("exp_cat_" + target.category)} — ${fmt(target.amount)}`
        : id,
    );
  };

  // ---------- Shift / cash-drawer reconciliation ----------
  // Every in-person sale rung up on this screen has no separate payment
  // method today (unlike online orders, which can be cash or KHQR) — so
  // this treats every sale total as cash received. If a shop actually
  // takes KHQR at the counter too, staff should net that out using the
  // "adjustments" field when ending the shift.
  const currentShift = useMemo(
    () => shifts.find((s) => !s.closedAt) || null,
    [shifts],
  );
  const displayName = (u) => (u ? u.name_km || u.name_en || u.username : "");

  const startShift = (openingCash) => {
    if (currentShift) return;
    const shift = {
      id: genId(),
      openedBy: displayName(currentUser),
      openedAt: Date.now(),
      openingCash: Number(openingCash) || 0,
      closedBy: null,
      closedAt: null,
      cashSales: null,
      cashRefunds: null,
      adjustments: 0,
      expectedCash: null,
      countedCash: null,
      difference: null,
      note: "",
      updatedAt: Date.now(),
    };
    setShifts((prev) => [shift, ...prev]);
    pushShiftRow(shift);
    logAudit(
      "add",
      "shift",
      `${t("shift_started")} — ${fmt(shift.openingCash)}`,
    );
    showToast(t("shift_startedToast"));
  };

  // Cash sales/refunds rung up between openedAt and now — used both for
  // the live preview while a shift is open and to freeze final numbers
  // when the shift is closed.
  const computeShiftCashFlow = (openedAt, closedAt) => {
    const end = closedAt || Date.now();
    let cashSales = 0;
    let cashRefunds = 0;
    sales.forEach((s) => {
      // Only sales actually paid in cash affect the drawer — KHQR sales
      // never put physical cash in the till, so they're excluded here.
      if ((s.paymentMethod || "cash") !== "cash") return;
      const soldAt = new Date(s.date).getTime();
      if (soldAt >= openedAt && soldAt < end) cashSales += s.total;
      if (s.refunded && s.refundedAt) {
        const refundedAt = new Date(s.refundedAt).getTime();
        if (refundedAt >= openedAt && refundedAt < end) cashRefunds += s.total;
      }
    });
    return { cashSales, cashRefunds };
  };

  const endShift = ({ countedCash, adjustments, note }) => {
    if (!currentShift) return;
    const closedAt = Date.now();
    const { cashSales, cashRefunds } = computeShiftCashFlow(
      currentShift.openedAt,
      closedAt,
    );
    const adj = Number(adjustments) || 0;
    const expectedCash =
      currentShift.openingCash + cashSales - cashRefunds - adj;
    const counted = Number(countedCash) || 0;
    const updated = {
      ...currentShift,
      closedBy: displayName(currentUser),
      closedAt,
      cashSales,
      cashRefunds,
      adjustments: adj,
      expectedCash,
      countedCash: counted,
      difference: counted - expectedCash,
      note: note || "",
      updatedAt: Date.now(),
    };
    setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    pushShiftRow(updated);
    logAudit(
      "edit",
      "shift",
      `${t("shift_closed")} — ${t("shift_diff")}: ${fmt(updated.difference)}`,
    );
    showToast(t("shift_closedToast"));
  };

  // Corrects an already-closed shift record (e.g. a counted-cash typo or a
  // forgotten adjustment) — gated by `canEditShift` (see ShiftTab render).
  // `cashSales`/`cashRefunds` stay frozen at whatever was recorded when the
  // shift was originally closed (computeShiftCashFlow already locked those
  // in at closing time); only the counted amount, adjustments, and note are
  // editable, and expectedCash/difference are recomputed from those frozen
  // figures so the math always stays internally consistent.
  const editShift = ({ id, countedCash, adjustments, note }) => {
    const target = shifts.find((s) => s.id === id);
    if (!target) return;
    const adj = Number(adjustments) || 0;
    const counted = Number(countedCash) || 0;
    const expectedCash =
      target.openingCash +
      (target.cashSales || 0) -
      (target.cashRefunds || 0) -
      adj;
    const updated = {
      ...target,
      adjustments: adj,
      expectedCash,
      countedCash: counted,
      difference: counted - expectedCash,
      note: note || "",
      updatedAt: Date.now(),
    };
    setShifts((prev) => prev.map((s) => (s.id === id ? updated : s)));
    pushShiftRow(updated);
    logAudit(
      "edit",
      "shift",
      `${t("shift_edited")} — ${t("shift_diff")}: ${fmt(updated.difference)}`,
    );
    showToast(t("shift_editedToast"));
  };

  // Removes a shift record entirely — gated by `canDeleteShift`, a
  // separate (stricter) permission than editing. Only meant for closed
  // history entries (see ShiftTab, which never offers this for the
  // currently-open shift).
  const deleteShift = (id) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    deleteShiftRow(id);
    logAudit("delete", "shift", t("shift_deleted"));
    showToast(t("shift_deletedToast"));
  };

  const saveCategory = (form) => {
    const label_km = (form.label_km || "").trim();
    const label_en = (form.label_en || "").trim();
    if (!label_km && !label_en) {
      showToast(t("cat_nameRequired"), "error");
      return;
    }
    const key = (label_en || label_km)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u1780-\u17ff]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (categories.some((c) => c.key === key)) {
      showToast(t("cat_duplicateKey"), "error");
      return;
    }
    const created = { key, label_km, label_en, updatedAt: Date.now() };
    setCategories([...categories, created]);
    showToast(t("toast_categoryAdded"));
    pushCategoryRow(created);
    logAudit("add", "category", label_km || label_en);
  };
  const deleteCategory = (key) => {
    const inUse = products.filter((p) => p.category === key).length;
    if (inUse > 0) {
      showToast(t("cat_inUse", { count: inUse }), "error");
      return;
    }
    const target = categories.find((c) => c.key === key);
    setCategories(categories.filter((c) => c.key !== key));
    showToast(t("toast_categoryDeleted"));
    deleteCategoryRow(key);
    logAudit(
      "delete",
      "category",
      target ? target.label_km || target.label_en : key,
    );
  };

  // ---------- Reports ----------
  const rangedSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (s.archived) return false;
      const d = new Date(s.date);
      if (reportRange === "today")
        return d.toDateString() === now.toDateString();
      if (reportRange === "week") {
        const w = new Date(now);
        w.setDate(now.getDate() - 7);
        return d >= w;
      }
      if (reportRange === "month")
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      return true;
    });
  }, [sales, reportRange]);

  const rangedExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const d = new Date(e.date);
      if (reportRange === "today")
        return d.toDateString() === now.toDateString();
      if (reportRange === "week") {
        const w = new Date(now);
        w.setDate(now.getDate() - 7);
        return d >= w;
      }
      if (reportRange === "month")
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      return true;
    });
  }, [expenses, reportRange]);

  // ---------- Archive (keep old sales out of active reports without deleting them) ----------
  const archivedSales = useMemo(
    () =>
      sales
        .filter((s) => s.archived)
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [sales],
  );

  const archiveOldSales = (cutoffMonths) => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - cutoffMonths);
    const idsToArchive = sales
      .filter((s) => !s.archived && new Date(s.date) < cutoff)
      .map((s) => s.id);
    if (idsToArchive.length === 0) {
      showToast(t("toast_nothingToArchive"), "error");
      return;
    }
    const idSet = new Set(idsToArchive);
    setSales((prev) =>
      prev.map((s) =>
        idSet.has(s.id)
          ? {
              ...s,
              archived: true,
              archivedAt: new Date().toISOString(),
              updatedAt: Date.now(),
            }
          : s,
      ),
    );
    showToast(t("toast_archived", { count: idsToArchive.length }));
  };

  const restoreSale = (id) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, archived: false, archivedAt: null, updatedAt: Date.now() }
          : s,
      ),
    );
    showToast(t("toast_restored"));
  };

  // Refund a completed sale: restocks the items sold, reverses any points/
  // spend the linked customer earned from it, and flags the sale so it drops
  // out of revenue/profit totals — without deleting the record itself.
  const refundSale = (saleId) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.refunded) return;

    const updatedProducts = products.map((p) => {
      const item = (sale.items || []).find((i) => i.productId === p.id);
      return item
        ? { ...p, stock: p.stock + item.qty, updatedAt: Date.now() }
        : p;
    });
    setProducts(updatedProducts);
    (sale.items || []).forEach((item) => {
      const p = updatedProducts.find((x) => x.id === item.productId);
      if (p) pushProductRow(p);
    });

    if (sale.customerId) {
      const customer = customers.find((c) => c.id === sale.customerId);
      if (customer) {
        const updatedCustomer = {
          ...customer,
          totalSpent: Math.max(0, (customer.totalSpent || 0) - sale.total),
          points: Math.max(0, (customer.points || 0) - Math.floor(sale.total)),
          updatedAt: Date.now(),
        };
        setCustomers(
          customers.map((c) => (c.id === customer.id ? updatedCustomer : c)),
        );
        pushCustomerRow(updatedCustomer);
      }
    }

    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              refunded: true,
              refundedAt: new Date().toISOString(),
              updatedAt: Date.now(),
            }
          : s,
      ),
    );
    logAudit(
      "refund",
      "sale",
      `#${saleId.slice(-6).toUpperCase()} — ${fmt(sale.total)}`,
    );
    showToast(t("toast_refundSuccess"));
  };

  const restoreAllSales = () => {
    if (archivedSales.length === 0) return;
    setSales((prev) =>
      prev.map((s) =>
        s.archived
          ? { ...s, archived: false, archivedAt: null, updatedAt: Date.now() }
          : s,
      ),
    );
    showToast(t("toast_restoredAll"));
  };

  const exportArchiveJson = () => {
    if (archivedSales.length === 0) {
      showToast(t("toast_nothingToArchive"), "error");
      return;
    }
    const blob = new Blob([JSON.stringify(archivedSales, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-archive-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importArchiveJson = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error("invalid format");
        const existingIds = new Set(sales.map((s) => s.id));
        const toAdd = data.filter((s) => s && s.id && !existingIds.has(s.id));
        setSales((prev) => [...prev, ...toAdd]);
        showToast(t("toast_imported", { count: toAdd.length }));
      } catch {
        showToast(t("toast_importFailed"), "error");
      }
    };
    reader.readAsText(file);
  };

  const reportSummary = useMemo(() => {
    const activeSales = rangedSales.filter((s) => !s.refunded);
    const revenue = activeSales.reduce((s, sale) => s + sale.total, 0);
    const itemsSold = activeSales.reduce(
      (s, sale) => s + sale.items.reduce((a, i) => a + i.qty, 0),
      0,
    );
    const profit = activeSales.reduce((s, sale) => {
      const itemProfit = sale.items.reduce(
        (a, i) => a + i.qty * (i.price - (i.cost || 0)),
        0,
      );
      return s + itemProfit - (sale.discount || 0);
    }, 0);
    const txCount = activeSales.length;
    const avg = txCount ? revenue / txCount : 0;
    const productMap = {};
    activeSales.forEach((sale) =>
      sale.items.forEach((i) => {
        productMap[i.name] = (productMap[i.name] || 0) + i.qty;
      }),
    );
    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const expensesTotal = rangedExpenses.reduce(
      (s, e) => s + (Number(e.amount) || 0),
      0,
    );
    const netProfit = profit - expensesTotal;
    return {
      revenue,
      itemsSold,
      txCount,
      avg,
      profit,
      expensesTotal,
      netProfit,
      topProducts,
    };
  }, [rangedSales, rangedExpenses]);

  const chartData = useMemo(() => {
    const now = new Date();
    const wLabels = WEEKDAY_LABELS[lang] || WEEKDAY_LABELS.km;
    const mLabels = MONTH_LABELS[lang] || MONTH_LABELS.km;
    const activeSales = rangedSales.filter((s) => !s.refunded);

    if (reportRange === "today") {
      const buckets = Array.from({ length: 24 }, (_, h) => ({
        label: h % 3 === 0 ? `${h}h` : "",
        value: 0,
      }));
      activeSales.forEach((s) => {
        buckets[new Date(s.date).getHours()].value += s.total;
      });
      return buckets;
    }
    if (reportRange === "week") {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push({
          key: d.toDateString(),
          label: wLabels[d.getDay()],
          value: 0,
        });
      }
      activeSales.forEach((s) => {
        const key = new Date(s.date).toDateString();
        const bucket = days.find((d) => d.key === key);
        if (bucket) bucket.value += s.total;
      });
      return days.map(({ label, value }) => ({ label, value }));
    }
    if (reportRange === "month") {
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const buckets = Array.from({ length: daysInMonth }, (_, i) => ({
        label: (i + 1) % 5 === 0 ? String(i + 1) : "",
        value: 0,
      }));
      activeSales.forEach((s) => {
        const d = new Date(s.date);
        if (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
          buckets[d.getDate() - 1].value += s.total;
      });
      return buckets;
    }
    // all-time: group by month
    const map = {};
    activeSales.forEach((s) => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + s.total;
    });
    return Object.keys(map)
      .sort()
      .map((key) => {
        const [y, m] = key.split("-").map(Number);
        return { label: `${mLabels[m]} ${y}`, value: map[key] };
      });
  }, [rangedSales, reportRange, lang]);

  // Always-last-7-days trend for the Dashboard card, independent of the
  // Reports tab's range filter above.
  const dashboardChartData = useMemo(() => {
    const now = new Date();
    const wLabels = WEEKDAY_LABELS[lang] || WEEKDAY_LABELS.km;
    const activeSales = sales.filter((s) => !s.refunded);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push({
        key: d.toDateString(),
        label: wLabels[d.getDay()],
        value: 0,
      });
    }
    activeSales.forEach((s) => {
      const key = new Date(s.date).toDateString();
      const bucket = days.find((d) => d.key === key);
      if (bucket) bucket.value += s.total;
    });
    return days.map(({ label, value }) => ({ label, value }));
  }, [sales, lang]);

  const exportCsv = () => {
    const header = [
      "Date",
      "Customer",
      "Items",
      "Subtotal",
      "Discount",
      "Total",
      "Paid",
      "Change",
      "Refunded",
    ];
    const rows = rangedSales.map((s) => [
      new Date(s.date).toLocaleString(),
      s.customerName || "",
      s.items.map((i) => `${i.name} x${i.qty}`).join(" | "),
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
      s.paid.toFixed(2),
      s.change.toFixed(2),
      s.refunded ? "Yes" : "No",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    // prefix a UTF-8 BOM so Excel renders Khmer text correctly instead of garbled characters
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${reportRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todaySales = useMemo(
    () =>
      sales.filter(
        (s) =>
          !s.refunded &&
          new Date(s.date).toDateString() === new Date().toDateString(),
      ),
    [sales],
  );
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);
  const lowStock = products.filter((p) => p.stock <= 5);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <FontStyles />
        <div
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
            fontSize: "15px",
          }}
        >
          {t("loading")}
        </div>
      </div>
    );
  }

  if (supabase && shopAuthChecking) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <FontStyles />
        <div
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
            fontSize: "15px",
          }}
        >
          {t("shopLogin_checking")}
        </div>
      </div>
    );
  }

  if (supabase && !shopId && isSuperAdmin) {
    return (
      <LangContext.Provider value={{ lang, t, catLabel, categories }}>
        <ShopPickerScreen
          shops={superAdminShops}
          loading={superAdminShopsLoading}
          onPick={enterShopAsSuperAdmin}
          onRefresh={loadSuperAdminShops}
          onSignOut={signOutShop}
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
        />
      </LangContext.Provider>
    );
  }

  if (supabase && !shopId) {
    return (
      <LangContext.Provider value={{ lang, t, catLabel, categories }}>
        <ShopLoginScreen
          onSubmit={signInShop}
          error={shopAuthError}
          clearError={() => setShopAuthError("")}
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
        />
      </LangContext.Provider>
    );
  }

  if (!currentUser) {
    return (
      <LangContext.Provider value={{ lang, t, catLabel, categories }}>
        <LoginScreen
          shopName={shopName || t("shopNameDefault")}
          shopLogo={shopLogo}
          lang={lang}
          setLang={setLang}
          onLogin={login}
          error={loginError}
          clearError={() => setLoginError("")}
          theme={theme}
          setTheme={setTheme}
        />
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, t, catLabel, categories }}>
      <div
        style={{
          background: "var(--bg)",
          height: "100vh",
          width: "100vw",
          fontFamily: "var(--font-body)",
          color: "var(--text)",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <FontStyles />

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {mobileNavOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <div
          className={"app-sidebar" + (mobileNavOpen ? " open" : "")}
          style={{
            width: "220px",
            flexShrink: 0,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "22px 18px 14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "2px",
              }}
            >
              {shopLogo ? (
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <img
                    src={shopLogo}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "var(--primary)",
                  lineHeight: 1.3,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {shopName || t("shopNameDefault")}
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginTop: "3px",
              }}
            >
              {t("tagline")}
            </div>
          </div>

          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              padding: "8px",
            }}
          >
            {visibleNav.map((n) => {
              const Icon = n.icon;
              const active = activeTab === n.id;
              return (
                <button
                  key={n.id}
                  className={"nav-item" + (active ? " active" : "")}
                  onClick={() => {
                    setActiveTab(n.id);
                    setMobileNavOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    padding: "11px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "#fff" : "var(--text)",
                    fontSize: "14.5px",
                    fontWeight: active ? 700 : 500,
                    fontFamily: "var(--font-body)",
                    transition: "background .15s",
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                  {t(n.key)}
                  {n.id === "inventory" && lowStock.length > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: active
                          ? "rgba(255,255,255,.25)"
                          : "var(--danger)",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "var(--radius-pill)",
                        padding: "1px 7px",
                      }}
                    >
                      {lowStock.length}
                    </span>
                  )}
                  {n.id === "onlineOrders" && pendingOrderCount > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: active
                          ? "rgba(255,255,255,.25)"
                          : "var(--danger)",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "var(--radius-pill)",
                        padding: "1px 7px",
                      }}
                    >
                      {pendingOrderCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto" }}>
            <div style={{ padding: "10px 14px", display: "flex", gap: "7px" }}>
              <LangSwitch lang={lang} setLang={setLang} style={{ flex: 1 }} />
              <ThemeSwitch theme={theme} setTheme={setTheme} t={t} />
            </div>
            <div
              style={{
                padding: "4px 18px 18px",
                borderTop: "1px solid var(--border)",
                paddingTop: "14px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {t("todaySales")}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "var(--primary)",
                }}
              >
                {fmt(todayRevenue)}
              </div>
            </div>
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "9px",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--surface-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <UserIcon size={15} color="var(--primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {lang === "en"
                    ? currentUser.name_en || currentUser.name_km
                    : currentUser.name_km}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {roleLabel(currentUserRole, lang)}
                </div>
              </div>
              <button
                onClick={() => setChangePwOpen(true)}
                title={t("changePassword")}
                style={{ ...iconBtnStyle, marginRight: "2px" }}
              >
                <Key size={13} />
              </button>
              {supabase && currentUser.role === "admin" && (
                <button
                  onClick={() => setSwitchShopConfirmOpen(true)}
                  title={t("settings_switchShop")}
                  style={{ ...iconBtnStyle, marginRight: "2px" }}
                >
                  <Store size={13} />
                </button>
              )}
              <button
                onClick={logout}
                title={t("logout")}
                style={{ ...iconBtnStyle, color: "var(--danger)" }}
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>

        <div
          className="app-main"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeTab === "pos" && (
            <POSTab
              products={filteredProducts}
              prodName={prodName}
              prodUnit={prodUnit}
              catLabel={catLabel}
              search={search}
              setSearch={setSearch}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              cart={cart}
              addToCart={addToCart}
              changeQty={changeQty}
              removeFromCart={removeFromCart}
              setItemDiscount={setItemDiscount}
              splitCartLine={splitCartLine}
              itemDiscountTotal={itemDiscountTotal}
              openTabs={openTabs}
              tableLabel={tableLabel}
              setTableLabel={setTableLabel}
              editingTabId={editingTabId}
              holdTab={holdTab}
              resumeTab={resumeTab}
              cancelTab={cancelTab}
              tabListOpen={tabListOpen}
              setTabListOpen={setTabListOpen}
              clearCart={() => setCart([])}
              subtotal={subtotal}
              discount={discount}
              setDiscount={setDiscount}
              total={total}
              payment={payment}
              setPayment={setPayment}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              payCashEnabled={payCashEnabled}
              payKhqrEnabled={payKhqrEnabled}
              khqrImage={khqrImage}
              khqrDynamicEnabled={khqrDynamicEnabled}
              khqrAccountId={khqrAccountId}
              khqrMerchantName={khqrMerchantName}
              khqrMerchantCity={khqrMerchantCity}
              khqrBankName={khqrBankName}
              change={change}
              completeSale={completeSale}
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              customerDiscountPercent={customerDiscountPercent}
              resetCustomerDiscount={resetCustomerDiscount}
              discountMode={discountMode}
              setDiscountMode={setDiscountMode}
              khrRate={khrRate}
              onBarcodeScan={handleBarcodeScan}
              onOpenScanner={() => {
                unlockBeepAudio();
                setScanModalOpen(true);
              }}
            />
          )}
          {activeTab === "dashboard" && (
            <DashboardTab
              todayRevenue={todayRevenue}
              todayCount={todaySales.length}
              lowStock={lowStock}
              products={products}
              sales={sales}
              weekChartData={dashboardChartData}
              setActiveTab={setActiveTab}
              prodName={prodName}
            />
          )}
          {activeTab === "inventory" && (
            <InventoryTab
              products={invFiltered}
              prodName={prodName}
              prodUnit={prodUnit}
              catLabel={catLabel}
              search={invSearch}
              setSearch={setInvSearch}
              categoryFilter={invCategory}
              setCategoryFilter={setInvCategory}
              openAdd={() => setProductModal({ mode: "add" })}
              openEdit={(p) => setProductModal({ mode: "edit", product: p })}
              deleteProduct={deleteProduct}
              openManageCategories={() => setCategoryModal(true)}
            />
          )}
          {activeTab === "reports" && (
            <ReportsTab
              reportRange={reportRange}
              setReportRange={setReportRange}
              summary={reportSummary}
              chartData={chartData}
              sales={rangedSales}
              expandedSale={expandedSale}
              setExpandedSale={setExpandedSale}
              exportCsv={exportCsv}
              onReprint={setReceipt}
              archivedSales={archivedSales}
              onArchiveOld={archiveOldSales}
              onRestore={restoreSale}
              onRestoreAll={restoreAllSales}
              onExportArchive={exportArchiveJson}
              onImportArchive={importArchiveJson}
              onRefund={refundSale}
              canRefund={canRefundSale}
            />
          )}
          {activeTab === "customers" && (
            <CustomersTab
              customers={customers}
              openAdd={() => setCustomerModal({ mode: "add" })}
              openEdit={(c) => setCustomerModal({ mode: "edit", customer: c })}
              deleteCustomer={deleteCustomer}
              canDelete={canDeleteCustomer}
            />
          )}
          {activeTab === "expenses" && allowedTabs.includes("expenses") && (
            <ExpensesTab
              expenses={expenses}
              openAdd={() => setExpenseModal({ mode: "add" })}
              openEdit={(e) => setExpenseModal({ mode: "edit", expense: e })}
              deleteExpense={deleteExpense}
            />
          )}
          {activeTab === "shift" && allowedTabs.includes("shift") && (
            <ShiftTab
              shifts={shifts}
              currentShift={currentShift}
              sales={sales}
              lang={lang}
              onStart={startShift}
              onEnd={endShift}
              canEdit={canEditShift}
              canDelete={canDeleteShift}
              onEdit={editShift}
              onDelete={deleteShift}
            />
          )}
          {activeTab === "onlineOrders" &&
            allowedTabs.includes("onlineOrders") && (
              <OnlineOrdersTab
                orders={activeOnlineOrders}
                archivedOrders={archivedOnlineOrders}
                products={products}
                supabaseStatus={supabaseStatus}
                shopSlug={shopSlug}
                onAccept={acceptOnlineOrder}
                onReject={rejectOnlineOrder}
                onMarkPaid={markOrderPaid}
                onUndoPaid={undoMarkPaid}
                notifySoundOn={notifySoundOn}
                setNotifySoundOn={setNotifySoundOn}
                onCancel={cancelAcceptedOrder}
                onArchiveOrder={archiveOrder}
                onArchiveFinished={archiveFinishedOrders}
                onRestoreOrder={restoreOrder}
                onRestoreAllOrders={restoreAllOrders}
                isSuperAdmin={isSuperAdmin}
                onDeleteOrder={deleteOrderPermanently}
                onDeleteAllArchived={deleteAllArchivedOrders}
              />
            )}
          {activeTab === "users" && allowedTabs.includes("users") && (
            <UsersTab
              users={users}
              roles={roles}
              currentUser={currentUser}
              openAdd={() => setUserModal({ mode: "add" })}
              openEdit={(u) => setUserModal({ mode: "edit", user: u })}
              deleteUser={deleteUser}
              toggleUserActive={toggleUserActive}
              openAddRole={() => setRoleModal({ mode: "add" })}
              openEditRole={(r) => setRoleModal({ mode: "edit", role: r })}
              deleteRole={deleteRole}
              saveRolePermissions={saveRolePermissions}
              isSuperAdmin={isSuperAdmin}
            />
          )}
          {activeTab === "auditLog" && allowedTabs.includes("auditLog") && (
            <AuditLogTab auditLog={auditLog} />
          )}
          {activeTab === "settings" && allowedTabs.includes("settings") && (
            <SettingsTab
              khrRate={khrRate}
              setKhrRate={setKhrRate}
              onSaveKhrRate={pushKhrRate}
              shopName={shopName}
              setShopName={setShopName}
              shopLogo={shopLogo}
              setShopLogo={setShopLogo}
              onSaveShopInfo={pushShopInfo}
              notifySoundOn={notifySoundOn}
              setNotifySoundOn={setNotifySoundOn}
              notifySoundId={notifySoundId}
              setNotifySoundId={setNotifySoundId}
              notifySoundCustom={notifySoundCustom}
              setNotifySoundCustom={setNotifySoundCustom}
              notifySoundCustomName={notifySoundCustomName}
              setNotifySoundCustomName={setNotifySoundCustomName}
              notifySoundDuration={notifySoundDuration}
              setNotifySoundDuration={setNotifySoundDuration}
              payCashEnabled={payCashEnabled}
              payKhqrEnabled={payKhqrEnabled}
              khqrImage={khqrImage}
              khqrDynamicEnabled={khqrDynamicEnabled}
              khqrAccountId={khqrAccountId}
              khqrMerchantName={khqrMerchantName}
              khqrMerchantCity={khqrMerchantCity}
              khqrBankName={khqrBankName}
              onSavePaymentSettings={(
                cash,
                khqr,
                img,
                dynEnabled,
                acctId,
                merchName,
                merchCity,
                bank,
              ) => {
                setPayCashEnabled(cash);
                setPayKhqrEnabled(khqr);
                setKhqrImage(img);
                setKhqrDynamicEnabled(dynEnabled);
                setKhqrAccountId(acctId);
                setKhqrMerchantName(merchName);
                setKhqrMerchantCity(merchCity);
                setKhqrBankName(bank);
                pushPaymentSettings(
                  cash,
                  khqr,
                  img,
                  dynEnabled,
                  acctId,
                  merchName,
                  merchCity,
                  bank,
                );
              }}
              receiptWidth={receiptWidth}
              setReceiptWidth={setReceiptWidth}
              currentUser={currentUser}
              onResetSalesData={resetSalesData}
              onResetStockQty={resetStockQuantities}
              onDeleteAllProducts={deleteAllProducts}
              features={features}
              isSuperAdmin={isSuperAdmin}
            />
          )}
          {activeTab === "superAdmin" && isSuperAdmin && (
            <SuperAdminTab
              shopName={shopName}
              shopSlug={shopSlug}
              features={features}
              onSaveFeatures={async (next) => {
                setFeatures(next);
                return pushFeatures(next);
              }}
              onSwitchShop={leaveShopAsSuperAdmin}
            />
          )}
          {!allowedTabs.includes(activeTab) && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "14px",
              }}
            >
              {t("permDenied")}
            </div>
          )}
        </div>

        {productModal && (
          <ProductModal
            data={productModal}
            onClose={() => setProductModal(null)}
            onSave={saveProduct}
          />
        )}
        {customerModal && (
          <CustomerModal
            data={customerModal}
            onClose={() => setCustomerModal(null)}
            onSave={saveCustomer}
          />
        )}
        {expenseModal && (
          <ExpenseModal
            data={expenseModal}
            onClose={() => setExpenseModal(null)}
            onSave={saveExpense}
          />
        )}
        {categoryModal && (
          <CategoryModal
            categories={categories}
            products={products}
            onClose={() => setCategoryModal(false)}
            onAdd={saveCategory}
            onDelete={deleteCategory}
          />
        )}
        {userModal && (
          <UserModal
            data={userModal}
            roles={roles}
            onClose={() => setUserModal(null)}
            onSave={saveUser}
          />
        )}
        {roleModal && (
          <RoleModal
            data={roleModal}
            onClose={() => setRoleModal(null)}
            onSave={saveRole}
          />
        )}
        {changePwOpen && (
          <ChangePasswordModal
            onClose={() => setChangePwOpen(false)}
            onChangePassword={changeOwnPassword}
          />
        )}
        {receipt && (
          <ReceiptModal
            sale={receipt}
            shopName={shopName || t("shopNameDefault")}
            shopLogo={shopLogo}
            khrRate={khrRate}
            receiptWidth={receiptWidth}
            onClose={() => setReceipt(null)}
          />
        )}
        {scanModalOpen && (
          <BarcodeScanModal
            onClose={() => setScanModalOpen(false)}
            onDetected={(code) => {
              setScanModalOpen(false);
              handleBarcodeScan(code);
            }}
          />
        )}
        {toast && <Toast msg={toast.msg} kind={toast.kind} />}
        {switchShopConfirmOpen && (
          <ConfirmDialog
            title={t("settings_switchShop")}
            message={t("settings_switchShopConfirm")}
            confirmLabel={t("settings_switchShop")}
            danger={false}
            onCancel={() => setSwitchShopConfirmOpen(false)}
            onConfirm={() => {
              setSwitchShopConfirmOpen(false);
              signOutShop();
            }}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}

// ================= shared bits =================

function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@500;600;700&family=Noto+Sans+Khmer:wght@400;500;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
      :root {
        --bg: #F7F7F9; --surface: #FFFFFF; --surface-alt: #EFEFF3; --border: #E1E1E8;
        --text: #14151C; --text-muted: #6E7180; --primary: #33409E; --primary-dark: #262F78;
        --accent: #C99A46; --danger: #C0433A;
        --font-display: 'Kantumruy Pro', 'Noto Sans Khmer', 'Inter', sans-serif;
        --font-body: 'Noto Sans Khmer', 'Inter', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;

        /* ---- Standardized scale (use these everywhere instead of
           one-off px values, so radius/shadow/spacing stay consistent
           across the whole app) ---- */
        --radius-sm: 8px;   /* small badges, chips, inputs */
        --radius-md: 10px;  /* buttons, inputs, small cards */
        --radius-lg: 14px;  /* primary cards, panels */
        --radius-xl: 18px;  /* modals, large surfaces */
        --radius-pill: 999px; /* pill badges, toggles */

        --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
        --space-5: 20px; --space-6: 24px; --space-8: 32px;

        --shadow-sm: 0 2px 8px rgba(20, 21, 28, .06);
        --shadow-md: 0 6px 16px rgba(20, 21, 28, .1);
        --shadow-lg: 0 12px 32px rgba(20, 21, 28, .16);
      }
      [data-theme="dark"] {
        --bg: #14161C; --surface: #1B1E27; --surface-alt: #232732; --border: #333846;
        --text: #EDEEF3; --text-muted: #9297A8; --primary: #6C7AE0; --primary-dark: #4A57B8;
        --accent: #E0B563; --danger: #E6685C;
        /* dark surfaces need darker, less diffuse shadows or they look washed out */
        --shadow-sm: 0 2px 8px rgba(0, 0, 0, .25);
        --shadow-md: 0 6px 18px rgba(0, 0, 0, .35);
        --shadow-lg: 0 14px 36px rgba(0, 0, 0, .45);
      }
      [data-theme="dark"] img { filter: brightness(.92); }
      body { background: var(--bg); transition: background .2s ease, color .2s ease; }
      * { transition: background-color .18s ease, border-color .18s ease, color .18s ease; }
      * { box-sizing: border-box; }
      input, select { font-family: var(--font-body); outline: none; }
      input:focus, select:focus { border-color: var(--primary) !important; }
      ::-webkit-scrollbar { width: 9px; height: 9px; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: var(--radius-sm); }
      button { font-family: var(--font-body); color: inherit; }

      /* ---- Universal button hover/press feedback ---- */
      button {
        transition: filter .15s ease, transform .1s ease, opacity .15s ease, box-shadow .15s ease;
      }
      button:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      button:active:not(:disabled) {
        transform: scale(0.97);
        filter: brightness(0.94);
      }
      button:disabled {
        cursor: not-allowed;
      }
      a, .clickable { transition: filter .15s ease, opacity .15s ease; }

      .nav-item {
        transition: background-color .15s ease, color .15s ease !important;
      }
      .nav-item:hover:not(.active) {
        background: var(--surface-alt) !important;
      }
      .nav-item:hover, .nav-item:active {
        filter: none !important;
        transform: none !important;
      }
      .list-card-row {
        transition: background-color .15s ease;
      }
      .list-card-row:hover {
        background: var(--surface-alt);
      }
      .pos-product-card {
        transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease !important;
      }
      .pos-product-card:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        filter: none;
      }
      .pos-product-card:active:not(:disabled) {
        transform: translateY(0) scale(.98);
      }
      .stat-card {
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      .order-card {
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .order-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      .dash-row {
        transition: background-color .12s ease;
        border-radius: var(--radius-sm);
      }
      .dash-row:hover {
        background: var(--surface-alt);
      }
      .cart-line-row {
        position: relative;
        transition: background-color .12s ease;
        border-radius: var(--radius-sm);
      }
      .cart-line-row:hover {
        background: var(--surface-alt);
      }
      .cart-line-qty {
        display: flex;
        align-items: center;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        flex-shrink: 0;
      }
      .cart-line-qty button {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: var(--surface);
        cursor: pointer;
        color: var(--text);
      }
      .cart-line-qty button:hover:not(:disabled) {
        background: var(--surface-alt);
        filter: none;
      }
      .cart-line-qty span {
        min-width: 22px;
        text-align: center;
        font-family: var(--font-mono);
        font-size: 12.5px;
        font-weight: 700;
      }
      .cart-line-remove {
        opacity: 0;
        transition: opacity .12s ease;
      }
      .cart-line-row:hover .cart-line-remove,
      .cart-line-row:focus-within .cart-line-remove {
        opacity: 1;
      }
      .quick-cash-btn {
        padding: 6px 4px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .quick-cash-btn:hover:not(:disabled) {
        border-color: var(--primary);
        color: var(--primary);
        filter: none;
      }
      .theme-toggle-btn {
        display: flex; align-items: center; justify-content: center;
        width: 38px; height: 38px; border-radius: var(--radius-sm);
        border: 1px solid var(--border); background: var(--surface-alt);
        color: var(--text); cursor: pointer; flex-shrink: 0;
      }
      .ghost-btn:hover:not(:disabled) {
        background: var(--surface-alt);
        color: var(--text);
        filter: none;
      }
      .danger-btn:hover:not(:disabled) {
        background: var(--danger);
        color: #fff;
        filter: none;
      }

      /* ---- Login screen polish ---- */
      @keyframes loginCardIn {
        from { opacity: 0; transform: translateY(14px) scale(.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes loginLogoPop {
        0% { opacity: 0; transform: scale(.6) rotate(-8deg); }
        60% { opacity: 1; transform: scale(1.08) rotate(2deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes shake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }
      .login-card {
        animation: loginCardIn .5s cubic-bezier(.22,1,.36,1);
      }
      .login-logo {
        animation: loginLogoPop .6s cubic-bezier(.22,1,.36,1);
      }
      .login-error {
        animation: shake .4s cubic-bezier(.36,.07,.19,.97);
      }
      .login-field input {
        transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;
      }
      .login-field input:focus {
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
      }
      .login-submit-btn {
        position: relative;
        overflow: hidden;
        transition: filter .15s ease, transform .12s ease, box-shadow .2s ease, opacity .15s ease;
      }
      .login-submit-btn:hover:not(:disabled) {
        box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 35%, transparent);
        transform: translateY(-1px);
      }
      .login-submit-btn:active:not(:disabled) {
        transform: translateY(0) scale(.98);
      }
      .spin-icon {
        animation: spin .8s linear infinite;
      }
      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--primary);
        flex-shrink: 0;
        animation: livePulse 1.4s ease-in-out infinite;
      }
      @keyframes livePulse {
        0%, 100% { opacity: .35; transform: scale(.85); }
        50% { opacity: 1; transform: scale(1.15); }
      }

      /* ---- Mobile hamburger + sidebar drawer (hidden on desktop) ---- */
      .mobile-menu-btn {
        display: none;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        cursor: pointer;
      }
      .sidebar-backdrop { display: none; }

      @media (max-width: 1100px) {
        .mobile-menu-btn {
          display: flex;
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 45;
          box-shadow: 0 4px 14px rgba(0,0,0,.12);
        }
        .app-sidebar {
          position: fixed !important;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 44;
          transform: translateX(-100%);
          transition: transform .25s ease;
          box-shadow: 10px 0 30px rgba(0,0,0,.18);
        }
        .app-sidebar.open { transform: translateX(0); }
        .sidebar-backdrop {
          display: block;
          position: fixed;
          inset: 0;
          background: rgba(15, 25, 22, .4);
          z-index: 42;
        }
        .app-main { padding-top: 54px; }

        .pos-layout { flex-direction: column; overflow-y: auto; }
        .pos-products { border-right: none !important; border-bottom: 1px solid var(--border); }
        .pos-invoice { width: 100% !important; }

        .responsive-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        .responsive-grid-2 { grid-template-columns: 1fr !important; }
      }

      @media (max-width: 520px) {
        .responsive-grid-4 { grid-template-columns: 1fr !important; }
        .pos-invoice { overflow-x: hidden; }
        .invoice-header-row { gap: 6px !important; }
        .invoice-table-row button { flex: 1 1 100%; justify-content: center; }
      }

      @media print {
        @page { margin: 8mm; }
        body * { visibility: hidden; }
        #receipt-print-area, #receipt-print-area * { visibility: visible; }
        #receipt-print-area {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          width: var(--receipt-print-width, 300px);
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          color: #111 !important;
        }
        #receipt-print-area * {
          background: transparent !important;
          color: #111 !important;
          border-color: #999 !important;
        }
        #receipt-print-area .receipt-row span:last-child {
          font-variant-numeric: tabular-nums;
        }
        #receipt-print-actions { display: none !important; }
      }
    `}</style>
  );
}

function LangSwitch({ lang, setLang, style }) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--surface-alt)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-pill)",
        padding: "3px",
        ...style,
      }}
    >
      {["km", "en"].map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          style={{
            flex: 1,
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            cursor: "pointer",
            fontSize: "12.5px",
            fontWeight: 700,
            background: lang === l ? "var(--primary)" : "transparent",
            color: lang === l ? "#fff" : "var(--text-muted)",
            transition: "background .15s, color .15s",
            whiteSpace: "nowrap",
          }}
        >
          {l === "km" ? "ខ្មែរ" : "EN"}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch({ theme, setTheme, t }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? t("lightMode") : t("darkMode")}
      aria-label={isDark ? t("lightMode") : t("darkMode")}
      style={{
        width: "44px",
        height: "26px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--border)",
        background: isDark ? "var(--primary)" : "var(--surface-alt)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: isDark ? "20px" : "2px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "left .15s",
          boxShadow: "0 1px 3px rgba(0,0,0,.3)",
        }}
      >
        {isDark ? (
          <Moon size={12} color="var(--primary)" />
        ) : (
          <Sun size={12} color="#f5a623" />
        )}
      </span>
    </button>
  );
}

function LoginScreen({
  shopName,
  shopLogo,
  lang,
  setLang,
  onLogin,
  error,
  clearError,
  theme,
  setTheme,
}) {
  const { t } = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const submit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    // small delay so the loading state is visible and the transition feels
    // deliberate rather than an instant flash
    setTimeout(() => {
      onLogin(username, password);
      setSubmitting(false);
    }, 450);
  };

  useEffect(() => {
    if (error) setShakeKey((k) => k + 1);
  }, [error]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "var(--font-body)",
        color: "var(--text)",
      }}
    >
      <FontStyles />
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "8px",
        }}
      >
        <LangSwitch lang={lang} setLang={setLang} />
        <ThemeSwitch theme={theme} setTheme={setTheme} t={t} />
      </div>
      <form
        onSubmit={submit}
        className="login-card"
        style={{
          width: "340px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "30px 28px",
          boxShadow: "0 20px 50px rgba(0,0,0,.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "22px",
          }}
        >
          <div
            className="login-logo"
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-lg)",
              background: shopLogo ? "transparent" : "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              overflow: "hidden",
            }}
          >
            {shopLogo ? (
              <img
                src={shopLogo}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <ShieldCheck size={26} color="#fff" />
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "18px",
              color: "var(--primary)",
            }}
          >
            {shopName}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            {t("login_subtitle")}
          </div>
        </div>

        <label style={fieldLabel}>{t("fieldUsername")}</label>
        <div
          className="login-field"
          style={{ position: "relative", marginBottom: "14px" }}
        >
          <UserIcon
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            autoFocus
            disabled={submitting}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              clearError();
            }}
            style={{
              ...fieldInput,
              marginBottom: 0,
              paddingLeft: "36px",
              opacity: submitting ? 0.6 : 1,
            }}
            placeholder="admin"
          />
        </div>

        <label style={fieldLabel}>{t("fieldPassword")}</label>
        <div
          className="login-field"
          style={{ position: "relative", marginBottom: "6px" }}
        >
          <Lock
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type={showPw ? "text" : "password"}
            disabled={submitting}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            style={{
              ...fieldInput,
              marginBottom: 0,
              paddingLeft: "36px",
              paddingRight: "36px",
              opacity: submitting ? 0.6 : 1,
            }}
            placeholder="••••••••"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: submitting ? "default" : "pointer",
              color: "var(--text-muted)",
              display: "flex",
            }}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {error && (
          <div
            key={shakeKey}
            className="login-error"
            style={{
              color: "var(--danger)",
              fontSize: "12.5px",
              fontWeight: 600,
              marginBottom: "10px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="login-submit-btn"
          style={{
            ...primaryBtnStyle,
            width: "100%",
            justifyContent: "center",
            marginTop: "10px",
            opacity: submitting ? 0.9 : 1,
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="spin-icon" />
              {t("loginBtnLoading") || t("loginBtn")}
            </>
          ) : (
            t("loginBtn")
          )}
        </button>
      </form>
    </div>
  );
}

// Device-level sign-in that identifies which shop this device belongs to.
// Separate from the staff PIN screen above — this runs once per device
// (Supabase remembers the session afterwards) and is required before any
// cloud data will sync, since RLS scopes every row to a shop_id tied to
// this account.
function ShopLoginScreen({
  onSubmit,
  error,
  clearError,
  lang,
  setLang,
  theme,
  setTheme,
}) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || !email.trim() || !password) return;
    setSubmitting(true);
    await onSubmit(email, password);
    setSubmitting(false);
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "var(--font-body)",
        color: "var(--text)",
      }}
    >
      <FontStyles />
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "8px",
        }}
      >
        <LangSwitch lang={lang} setLang={setLang} />
        <ThemeSwitch theme={theme} setTheme={setTheme} t={t} />
      </div>
      <form
        onSubmit={submit}
        className="login-card"
        style={{
          width: "340px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "30px 28px",
          boxShadow: "0 20px 50px rgba(0,0,0,.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-lg)",
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <Store size={26} color="#fff" />
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "18px",
              color: "var(--primary)",
            }}
          >
            {t("shopLogin_title")}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              marginTop: "4px",
              textAlign: "center",
            }}
          >
            {t("shopLogin_subtitle")}
          </div>
        </div>

        <label style={fieldLabel}>{t("shopLogin_email")}</label>
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <UserIcon
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            autoFocus
            type="email"
            disabled={submitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError();
            }}
            style={{
              ...fieldInput,
              marginBottom: 0,
              paddingLeft: "36px",
              opacity: submitting ? 0.6 : 1,
            }}
            placeholder="you@example.com"
          />
        </div>

        <label style={fieldLabel}>{t("shopLogin_password")}</label>
        <div style={{ position: "relative", marginBottom: "6px" }}>
          <Lock
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type={showPw ? "text" : "password"}
            disabled={submitting}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            style={{
              ...fieldInput,
              marginBottom: 0,
              paddingLeft: "36px",
              paddingRight: "36px",
              opacity: submitting ? 0.6 : 1,
            }}
            placeholder="••••••••"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: submitting ? "default" : "pointer",
              color: "var(--text-muted)",
              display: "flex",
            }}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {error && (
          <div
            style={{
              color: "var(--danger)",
              fontSize: "12.5px",
              fontWeight: 600,
              marginBottom: "10px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            ...primaryBtnStyle,
            width: "100%",
            justifyContent: "center",
            marginTop: "10px",
            opacity: submitting ? 0.9 : 1,
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="spin-icon" />
              {t("shopLogin_submitting")}
            </>
          ) : (
            t("shopLogin_submit")
          )}
        </button>
      </form>
    </div>
  );
}

// Landing screen for a signed-in Super Admin (a Supabase Auth account with
// no shop_id of its own). Picking a shop here just sets `shopId` in
// POSApp — from that point on every other screen behaves exactly as it
// does for that shop's own admin, since none of the rest of the app knows
// or cares whether shopId came from a normal shop login or a Super Admin
// picking it here.
function ShopPickerScreen({
  shops,
  loading,
  onPick,
  onRefresh,
  onSignOut,
  lang,
  setLang,
  theme,
  setTheme,
}) {
  const { t } = useT();
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "var(--font-body)",
        color: "var(--text)",
      }}
    >
      <FontStyles />
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "8px",
        }}
      >
        <LangSwitch lang={lang} setLang={setLang} />
        <ThemeSwitch theme={theme} setTheme={setTheme} t={t} />
      </div>
      <div
        style={{
          width: "380px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "26px 24px",
          boxShadow: "0 20px 50px rgba(0,0,0,.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-lg)",
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <Crown size={26} color="#fff" />
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "18px",
              color: "var(--primary)",
              textAlign: "center",
            }}
          >
            {t("shopPicker_title")}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              marginTop: "4px",
              textAlign: "center",
            }}
          >
            {t("shopPicker_subtitle")}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "14px" }}>
          {loading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "20px 0",
                color: "var(--text-muted)",
              }}
            >
              <Loader2 size={20} className="spin-icon" />
            </div>
          )}
          {!loading && shops.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "13px",
                padding: "20px 0",
              }}
            >
              {t("shopPicker_empty")}
            </div>
          )}
          {!loading &&
            shops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => onPick(shop.id, shop.slug)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Store size={16} color="#fff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "13.5px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {shop.name || shop.slug}
                  </div>
                  {shop.slug && (
                    <div
                      style={{ fontSize: "11.5px", color: "var(--text-muted)" }}
                    >
                      {shop.slug}
                    </div>
                  )}
                </div>
              </button>
            ))}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              ...secondaryBtnStyle,
              flex: 1,
              justifyContent: "center",
            }}
          >
            <RefreshCw size={14} />
            {t("shopPicker_refresh")}
          </button>
          <button
            onClick={onSignOut}
            style={{
              ...secondaryBtnStyle,
              flex: 1,
              justifyContent: "center",
            }}
          >
            <LogOut size={14} />
            {t("shopPicker_signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Super Admin's per-shop control panel — a toggle per premium feature,
// pushed straight to shop_settings.features_json (see pushFeatures in
// POSApp) so the shop sees the change immediately, plus a way to go back
// to <ShopPickerScreen> and manage a different shop.
function SuperAdminTab({
  shopName,
  shopSlug,
  features,
  onSaveFeatures,
  onSwitchShop,
}) {
  const { t, lang } = useT();
  const [saving, setSaving] = useState(null); // feature id currently saving
  const [savedFlash, setSavedFlash] = useState(null);

  const toggleFeature = async (featureId) => {
    const next = { ...features, [featureId]: !features[featureId] };
    setSaving(featureId);
    const ok = await onSaveFeatures(next);
    setSaving(null);
    if (ok) {
      setSavedFlash(featureId);
      setTimeout(() => setSavedFlash(null), 1500);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 26px" }}>
      <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
        {t("superAdmin_title")}
      </div>
      <div
        style={{
          fontSize: "12.5px",
          color: "var(--text-muted)",
          marginBottom: "18px",
        }}
      >
        {t("superAdmin_subtitle")}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--surface-alt)",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "2px",
            }}
          >
            {t("superAdmin_currentShop")}
          </div>
          <div style={{ fontWeight: 700, fontSize: "14px" }}>
            {shopName || shopSlug}
          </div>
        </div>
        <button
          onClick={onSwitchShop}
          style={{ ...secondaryBtnStyle, fontSize: "12.5px" }}
        >
          <RefreshCw size={13} />
          {t("superAdmin_switchShop")}
        </button>
      </div>

      {PREMIUM_FEATURES.map((f) => (
        <div
          key={f.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
              {lang === "en" ? f.name_en : f.name_km}
            </span>
            {saving === f.id && <Loader2 size={13} className="spin-icon" />}
            {savedFlash === f.id && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--success, #16a34a)",
                  fontWeight: 600,
                }}
              >
                {t("superAdmin_saved")}
              </span>
            )}
          </div>
          <ToggleSwitch
            on={!!features[f.id]}
            disabled={saving === f.id}
            onClick={() => toggleFeature(f.id)}
          />
        </div>
      ))}
    </div>
  );
}

function TopBar({ title, subtitle, action }) {
  return (
    <div
      style={{
        padding: "20px 26px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "21px",
            fontWeight: 700,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "3px",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

function OrderStatusBadge({ status, t }) {
  const map = {
    pending: {
      label: t("storefront_status_pending"),
      bg: "var(--accent)",
      fg: "#fff",
      Icon: Clock3,
    },
    accepted: {
      label: t("storefront_status_accepted"),
      bg: "#e0a030",
      fg: "#fff",
      Icon: Clock3,
    },
    paid: {
      label: t("storefront_status_paid"),
      bg: "var(--primary)",
      fg: "#fff",
      Icon: Check,
    },
    rejected: {
      label: t("storefront_status_rejected"),
      bg: "var(--danger)",
      fg: "#fff",
      Icon: XCircle,
    },
    cancelled: {
      label: t("storefront_status_cancelled"),
      bg: "var(--text-muted)",
      fg: "#fff",
      Icon: XCircle,
    },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "var(--radius-pill)",
        fontSize: "11.5px",
        fontWeight: 700,
        background: s.bg,
        color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      <s.Icon size={12} /> {s.label}
    </span>
  );
}

function Toast({ msg, kind }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "18px",
        right: "18px",
        left: "18px",
        marginLeft: "auto",
        maxWidth: "min(420px, calc(100vw - 36px))",
        zIndex: 200,
        background: kind === "error" ? "var(--danger)" : "var(--primary)",
        color: "#fff",
        padding: "12px 18px",
        borderRadius: "var(--radius-md)",
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 6px 16px rgba(0,0,0,.18)",
        display: "flex",
        alignItems: "center",
        gap: "9px",
        wordBreak: "break-word",
      }}
    >
      {kind === "error" ? (
        <AlertTriangle size={16} />
      ) : (
        <CheckCircle2 size={16} />
      )}
      {msg}
    </div>
  );
}

const iconBtnStyle = {
  width: "26px",
  height: "26px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
  color: "var(--text)",
};
const primaryBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "11px 16px",
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "var(--primary)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};
const secondaryBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "9px 14px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "13.5px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
// Low-emphasis action (e.g. "cancel", a secondary link-like action inside a
// row) — no border/fill, just text, so it doesn't compete with the primary
// action on the same screen.
const ghostBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "9px 14px",
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: "13.5px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
// Destructive action (delete, refund, remove staff...). Outlined rather than
// solid-filled so it doesn't read with the same visual weight as the
// primary action — a destructive button shouldn't be the loudest thing on
// the screen, but it must still be unambiguous.
const dangerBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "9px 14px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--danger)",
  background: "var(--surface)",
  color: "var(--danger)",
  fontSize: "13.5px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const thStyle = { padding: "8px 12px", fontWeight: 600, textAlign: "start" };
const tdStyle = { padding: "11px 12px" };

function ToggleSwitch({ on, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "40px",
        height: "23px",
        borderRadius: "var(--radius-lg)",
        border: "none",
        background: on ? "var(--primary)" : "var(--border)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        transition: "background .15s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "2px",
          left: on ? "19px" : "2px",
          width: "19px",
          height: "19px",
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

function CategoryPill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid " + (active ? "var(--primary)" : "var(--border)"),
        background: active ? "var(--primary)" : "var(--surface)",
        color: active ? "#fff" : "var(--text)",
        fontSize: "12.5px",
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// Shared empty-state block: icon + title + optional description + optional
// action button. Used for "nothing here yet" screens across tabs so they
// read as an intentional invitation instead of a blank/broken page.
function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div
      style={{
        gridColumn: "1/-1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "44px 20px",
        gap: "4px",
      }}
    >
      {Icon && (
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-alt)",
            marginBottom: "10px",
          }}
        >
          <Icon size={24} color="var(--text-muted)" />
        </div>
      )}
      <div
        style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)" }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            maxWidth: "320px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{ ...primaryBtnStyle, marginTop: "12px" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ProductThumb({ image, size = 40 }) {
  if (image)
    return (
      <img
        src={image}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "var(--radius-sm)",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-alt)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Package size={size * 0.45} color="var(--text-muted)" />
    </div>
  );
}

// ================= POS =================

function POSTab(props) {
  const { t, categories } = useT();
  const {
    products,
    prodName,
    prodUnit,
    catLabel,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    cart,
    addToCart,
    changeQty,
    removeFromCart,
    setItemDiscount,
    splitCartLine,
    itemDiscountTotal,
    openTabs,
    tableLabel,
    setTableLabel,
    editingTabId,
    holdTab,
    resumeTab,
    cancelTab,
    tabListOpen,
    setTabListOpen,
    clearCart,
    subtotal,
    discount,
    setDiscount,
    total,
    payment,
    setPayment,
    paymentMethod,
    setPaymentMethod,
    payCashEnabled,
    payKhqrEnabled,
    khqrImage,
    khqrDynamicEnabled,
    khqrAccountId,
    khqrMerchantName,
    khqrMerchantCity,
    khqrBankName,
    change,
    completeSale,
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    customerDiscountPercent,
    resetCustomerDiscount,
    discountMode,
    setDiscountMode,
    khrRate,
    onBarcodeScan,
    onOpenScanner,
  } = props;
  const [khqrCurrency, setKhqrCurrency] = useState("usd");

  return (
    <div
      className="pos-layout"
      style={{ flex: 1, display: "flex", minHeight: 0 }}
    >
      <div
        className="pos-products"
        style={{
          flex: 1.4,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          borderRight: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "13px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onBarcodeScan(search);
              }}
              placeholder={t("searchProducts")}
              style={{
                width: "100%",
                padding: "11px 40px 11px 38px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                fontSize: "14px",
                background: "var(--surface-alt)",
              }}
            />
            <button
              onClick={onOpenScanner}
              title={t("scanBarcode")}
              style={{
                position: "absolute",
                right: "6px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <Camera size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
            <CategoryPill
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
              label={t("cat_all")}
            />
            {categories.map(({ key: c }) => (
              <CategoryPill
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
                label={catLabel(c)}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 22px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "12px",
            alignContent: "start",
          }}
        >
          {products.length === 0 && (
            <EmptyState
              icon={Search}
              title={t("noProductsFound")}
              actionLabel={search ? t("clearSearch") : undefined}
              onAction={search ? () => setSearch("") : undefined}
            />
          )}
          {products.map((p) => {
            const inCartQty = cart.find((c) => c.id === p.id)?.qty || 0;
            return (
              <button
                key={p.id}
                className="pos-product-card"
                onClick={() => addToCart(p)}
                disabled={p.stock === 0}
                style={{
                  position: "relative",
                  textAlign: "left",
                  padding: "12px",
                  borderRadius: "var(--radius-lg)",
                  border:
                    "1px solid " +
                    (inCartQty > 0 ? "var(--primary)" : "var(--border)"),
                  background:
                    p.stock === 0 ? "var(--surface-alt)" : "var(--surface)",
                  cursor: p.stock === 0 ? "not-allowed" : "pointer",
                  opacity: p.stock === 0 ? 0.5 : 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {inCartQty > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-7px",
                      right: "-7px",
                      minWidth: "20px",
                      height: "20px",
                      padding: "0 5px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--primary)",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,.18)",
                      zIndex: 1,
                    }}
                  >
                    {inCartQty}
                  </span>
                )}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16/10",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    background: "var(--surface-alt)",
                  }}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Package size={22} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 600,
                    lineHeight: 1.35,
                    minHeight: "36px",
                  }}
                >
                  {prodName(p)}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "var(--primary)",
                    }}
                  >
                    {fmt(p.price)}
                  </span>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: "var(--radius-pill)",
                      background:
                        p.stock <= 5
                          ? "color-mix(in srgb, var(--danger) 14%, transparent)"
                          : "var(--surface-alt)",
                      color:
                        p.stock <= 5 ? "var(--danger)" : "var(--text-muted)",
                    }}
                  >
                    {p.stock === 0
                      ? t("outOfStock")
                      : `${p.stock} ${prodUnit(p)}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="pos-invoice"
        style={{
          width: "340px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            padding: "18px 20px 12px",
            borderBottom: "1px dashed var(--border)",
          }}
        >
          <div
            className="invoice-header-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              rowGap: "6px",
              gap: "9px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "9px",
              }}
            >
              <Receipt size={18} color="var(--primary)" /> {t("invoice")}
              {cart.length > 0 && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--primary)",
                    background:
                      "color-mix(in srgb, var(--primary) 12%, transparent)",
                    borderRadius: "var(--radius-pill)",
                    padding: "2px 8px",
                  }}
                >
                  {cart.reduce((n, c) => n + c.qty, 0)}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setTabListOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-pill)",
                  color: "var(--text-muted)",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 10px",
                }}
              >
                <Clock3 size={12} />
                {t("openTabsLabel")}
                {openTabs.length > 0 && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "#fff",
                      background: "var(--primary)",
                      borderRadius: "var(--radius-pill)",
                      padding: "1px 6px",
                    }}
                  >
                    {openTabs.length}
                  </span>
                )}
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 2px",
                    textDecoration: "underline",
                  }}
                >
                  {t("clearCart")}
                </button>
              )}
            </div>
          </div>
          {editingTabId && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "var(--primary)",
              }}
            >
              {t("editingTabBadge", { table: tableLabel })}
            </div>
          )}
          <div
            className="invoice-table-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "10px",
              flexWrap: "wrap",
            }}
          >
            <input
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
              placeholder={t("tableLabelPlaceholder")}
              style={{
                flex: 1,
                minWidth: "120px",
                padding: "7px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontSize: "12.5px",
              }}
            />
            <button
              onClick={holdTab}
              disabled={cart.length === 0}
              title={t("holdTabBtn")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--primary)",
                background: "none",
                color: "var(--primary)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: cart.length === 0 ? "default" : "pointer",
                opacity: cart.length === 0 ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              <Clock3 size={13} />
              {t("holdTabBtn")}
            </button>
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            style={{
              marginTop: "12px",
              width: "100%",
              padding: "9px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontSize: "13.5px",
              background: "var(--surface-alt)",
            }}
          >
            <option value="">{t("walkInCustomer")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {Number(c.discount_percent) > 0
                  ? ` (-${c.discount_percent}%)`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
          {cart.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                color: "var(--text-muted)",
                fontSize: "13.5px",
                textAlign: "center",
                padding: "44px 0",
              }}
            >
              <ShoppingCart size={26} color="var(--border)" />
              {t("emptyCart")}
            </div>
          )}
          {cart.map((c) => {
            const lineGross = c.price * c.qty;
            const lineDiscPct = Number(c.discountPercent) || 0;
            const lineDisc = (lineGross * lineDiscPct) / 100;
            const lineNet = lineGross - lineDisc;
            return (
              <div
                key={c.lineId}
                className="cart-line-row"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "8px 6px",
                  marginBottom: "2px",
                }}
              >
                <ProductThumb image={c.image} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {fmt(c.price)} × {c.qty} ={" "}
                    {lineDiscPct > 0 ? (
                      <>
                        <span
                          style={{
                            textDecoration: "line-through",
                            opacity: 0.55,
                          }}
                        >
                          {fmt(lineGross)}
                        </span>{" "}
                        <span
                          style={{ color: "var(--primary)", fontWeight: 700 }}
                        >
                          {fmt(lineNet)}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "var(--text)", fontWeight: 700 }}>
                        {fmt(lineGross)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "3px",
                    }}
                  >
                    <Percent size={10} color="var(--text-muted)" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={c.discountPercent || ""}
                      onChange={(e) =>
                        setItemDiscount(c.lineId, e.target.value)
                      }
                      placeholder="0"
                      style={{
                        width: "42px",
                        padding: "1px 4px",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        textAlign: "right",
                      }}
                    />
                    <span
                      style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                    >
                      {t("itemDiscountLabel")}
                    </span>
                    {c.qty >= 2 && (
                      <button
                        type="button"
                        onClick={() => splitCartLine(c.lineId)}
                        title={t("splitLine")}
                        style={{
                          marginLeft: "auto",
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {t("splitLine")}
                      </button>
                    )}
                  </div>
                </div>
                <div className="cart-line-qty">
                  <button onClick={() => changeQty(c.lineId, -1)}>
                    <Minus size={12} />
                  </button>
                  <span>{c.qty}</span>
                  <button onClick={() => changeQty(c.lineId, 1)}>
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  className="cart-line-remove"
                  onClick={() => removeFromCart(c.lineId)}
                  style={{ ...iconBtnStyle, color: "var(--danger)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px dashed var(--border)",
            background: "var(--surface-alt)",
          }}
        >
          <Row label={t("subtotal")} value={fmt(subtotal)} />
          {itemDiscountTotal > 0 && (
            <Row
              label={t("itemDiscountLabel")}
              value={`-${fmt(itemDiscountTotal)}`}
            />
          )}
          {customerDiscountPercent > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "2px 0 3px",
              }}
            >
              <span
                style={{
                  fontSize: "11.5px",
                  color: "var(--primary)",
                  fontWeight: 600,
                }}
              >
                {t("customerDiscountBadge", {
                  percent: customerDiscountPercent,
                })}
              </span>
              {(discountMode !== "percent" ||
                discount !== String(customerDiscountPercent)) && (
                <button
                  onClick={resetCustomerDiscount}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  {t("reapplyDiscount")}
                </button>
              )}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "7px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {t("discountLabel")}
              </span>
              <div
                style={{
                  display: "flex",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (discountMode !== "amount") {
                      setDiscountMode("amount");
                      setDiscount("");
                    }
                  }}
                  style={{
                    padding: "2px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background:
                      discountMode === "amount"
                        ? "var(--primary)"
                        : "var(--surface)",
                    color:
                      discountMode === "amount" ? "#fff" : "var(--text-muted)",
                  }}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (discountMode !== "percent") {
                      setDiscountMode("percent");
                      setDiscount("");
                    }
                  }}
                  style={{
                    padding: "2px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background:
                      discountMode === "percent"
                        ? "var(--primary)"
                        : "var(--surface)",
                    color:
                      discountMode === "percent" ? "#fff" : "var(--text-muted)",
                  }}
                >
                  %
                </button>
              </div>
            </div>
            <input
              type="number"
              min="0"
              max={discountMode === "percent" ? 100 : undefined}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
              style={{
                width: "86px",
                textAlign: "right",
                padding: "5px 9px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
            />
          </div>
          <Row
            label={t("total")}
            value={fmt(total)}
            subValue={fmtKhr(total, khrRate)}
            bold
            big
          />
          {(() => {
            const khqrDynamicReady =
              khqrDynamicEnabled &&
              khqrAccountId &&
              khqrMerchantName &&
              khqrMerchantCity;
            const khqrAvailable =
              payKhqrEnabled && (khqrDynamicReady || khqrImage);
            return (
              <>
                {khqrAvailable && (
                  <div
                    style={{ display: "flex", gap: "8px", margin: "9px 0 5px" }}
                  >
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: "var(--radius-md)",
                        border:
                          paymentMethod === "cash"
                            ? "2px solid var(--primary)"
                            : "1px solid var(--border)",
                        background:
                          paymentMethod === "cash"
                            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                            : "var(--surface)",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {t("pos_payCash")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("khqr")}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: "var(--radius-md)",
                        border:
                          paymentMethod === "khqr"
                            ? "2px solid var(--primary)"
                            : "1px solid var(--border)",
                        background:
                          paymentMethod === "khqr"
                            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                            : "var(--surface)",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {t("pos_payKhqr")}
                    </button>
                  </div>
                )}
                {paymentMethod === "khqr" && khqrAvailable ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "12px",
                      margin: "5px 0",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)",
                    }}
                  >
                    {khqrDynamicReady ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            justifyContent: "center",
                            marginBottom: "10px",
                          }}
                        >
                          {["usd", "khr"].map((cur) => (
                            <button
                              key={cur}
                              type="button"
                              onClick={() => setKhqrCurrency(cur)}
                              style={{
                                padding: "4px 12px",
                                borderRadius: "var(--radius-pill)",
                                border:
                                  khqrCurrency === cur
                                    ? "2px solid var(--primary)"
                                    : "1px solid var(--border)",
                                background:
                                  khqrCurrency === cur
                                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                                    : "var(--surface)",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {cur === "usd" ? "USD $" : "KHR ៛"}
                            </button>
                          ))}
                        </div>
                        <DynamicQrImage
                          payload={buildDynamicKhqr({
                            accountId: khqrAccountId,
                            merchantName: khqrMerchantName,
                            merchantCity: khqrMerchantCity,
                            bankName: khqrBankName,
                            currency: khqrCurrency,
                            amount:
                              khqrCurrency === "khr"
                                ? Math.round(
                                    (Number(total) || 0) *
                                      (Number(khrRate) || 0),
                                  )
                                : total,
                          })}
                        />
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "12.5px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {khqrCurrency === "khr"
                            ? fmtKhr(total, khrRate)
                            : fmt(total)}
                        </div>
                      </>
                    ) : (
                      <img
                        src={khqrImage}
                        alt="KHQR"
                        style={{
                          width: "150px",
                          height: "150px",
                          objectFit: "contain",
                          margin: "0 auto",
                          background: "#fff",
                          borderRadius: "var(--radius-sm)",
                          padding: "6px",
                        }}
                      />
                    )}
                  </div>
                ) : null}
              </>
            );
          })()}
          {!(
            paymentMethod === "khqr" &&
            payKhqrEnabled &&
            (khqrImage ||
              (khqrDynamicEnabled &&
                khqrAccountId &&
                khqrMerchantName &&
                khqrMerchantCity))
          ) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "9px 0 5px",
              }}
            >
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {t("paymentReceived")}
              </span>
              <input
                type="number"
                min="0"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "106px",
                  textAlign: "right",
                  padding: "6px 9px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              />
            </div>
          )}
          {paymentMethod !== "khqr" && total > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "5px",
                marginBottom: "9px",
              }}
            >
              <button
                type="button"
                className="quick-cash-btn"
                onClick={() => setPayment(total.toFixed(2))}
              >
                {t("exactAmount")}
              </button>
              {Array.from(
                new Set(
                  [1, 5, 10, 20]
                    .map((step) => Math.ceil(total / step) * step)
                    .filter((v) => v > 0),
                ),
              )
                .sort((a, b) => a - b)
                .slice(0, 4)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="quick-cash-btn"
                    onClick={() => setPayment(String(v))}
                  >
                    ${v}
                  </button>
                ))}
            </div>
          )}
          <Row
            label={t("changeDue")}
            value={fmt(Math.max(change, 0))}
            subValue={fmtKhr(Math.max(change, 0), khrRate)}
            accent
          />
          <button
            onClick={completeSale}
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "13px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
            }}
          >
            <CheckCircle2 size={18} /> {t("completeSale")}
          </button>
        </div>
      </div>
      {tabListOpen && (
        <OpenTabsModal
          openTabs={openTabs}
          onClose={() => setTabListOpen(false)}
          onResume={resumeTab}
          onCancel={cancelTab}
          khrRate={khrRate}
        />
      )}
    </div>
  );
}

function OpenTabsModal({ openTabs, onClose, onResume, onCancel, khrRate }) {
  const { t, lang } = useT();
  const [cancelTargetId, setCancelTargetId] = useState(null);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,30,27,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          width: "380px",
          maxWidth: "100%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 700,
              fontSize: "15px",
            }}
          >
            <Clock3 size={16} color="var(--primary)" />
            {t("openTabsLabel")}
          </div>
          <button onClick={onClose} style={iconBtnStyle}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 10px" }}>
          {openTabs.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "13px",
                padding: "30px 10px",
              }}
            >
              {t("noOpenTabs")}
            </div>
          )}
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 8px",
                borderBottom: "1px dashed var(--border)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "13.5px" }}>
                  {tab.table}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {(tab.items || []).reduce((n, c) => n + c.qty, 0)} ×{" "}
                  {fmt(tab.total)}
                </div>
                <div
                  style={{
                    fontSize: "10.5px",
                    color: "var(--text-muted)",
                  }}
                >
                  {new Date(tab.createdAt).toLocaleString(
                    lang === "en" ? "en-US" : "km-KH",
                  )}
                </div>
              </div>
              <button
                onClick={() => onResume(tab)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--primary)",
                  background: "none",
                  color: "var(--primary)",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t("resumeTabBtn")}
              </button>
              <button
                onClick={() => setCancelTargetId(tab.id)}
                style={{
                  padding: "6px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "none",
                  color: "var(--danger)",
                  cursor: "pointer",
                }}
                title={t("cancelTabBtn")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {cancelTargetId && (
        <ConfirmDialog
          title={t("cancelTabBtn")}
          message={t("confirmCancelTab")}
          confirmLabel={t("cancelTabBtn")}
          onCancel={() => setCancelTargetId(null)}
          onConfirm={() => {
            onCancel(cancelTargetId);
            setCancelTargetId(null);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value, subValue, bold, big, accent }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: subValue ? "flex-start" : "center",
        padding: "3px 0",
      }}
    >
      <span
        style={{
          fontSize: big ? "14px" : "13px",
          color: accent ? "var(--accent)" : "var(--text-muted)",
          fontWeight: bold ? 700 : 500,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: big ? "19px" : "14px",
            fontWeight: bold ? 800 : 700,
            color: accent ? "var(--accent)" : "var(--text)",
          }}
        >
          {value}
        </span>
        {subValue && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-muted)",
            }}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ================= Dashboard =================

function DashboardTab({
  todayRevenue,
  todayCount,
  lowStock,
  products,
  sales,
  weekChartData,
  setActiveTab,
  prodName,
}) {
  const { t, lang } = useT();
  const totalStockValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const totalRevenue = sales.reduce(
    (s, sale) => (sale.refunded ? s : s + sale.total),
    0,
  );

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar title={t("dash_title")} subtitle={t("dash_subtitle")} />
      <div
        className="responsive-grid-4"
        style={{
          padding: "20px 26px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "14px",
        }}
      >
        <StatCard
          label={t("stat_todayRevenue")}
          value={fmt(todayRevenue)}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label={t("stat_todayTx")}
          value={todayCount}
          icon={Receipt}
          tone="accent"
        />
        <StatCard
          label={t("stat_totalRevenue")}
          value={fmt(totalRevenue)}
          icon={BarChart3}
          tone="primary"
        />
        <StatCard
          label={t("stat_stockValue")}
          value={fmt(totalStockValue)}
          icon={Package}
          tone="accent"
        />
      </div>

      <div style={{ padding: "4px 26px 20px" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "8px",
            }}
          >
            <TrendingUp size={17} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: "14.5px" }}>
              {t("dash_salesTrend")}
            </span>
          </div>
          <RevenueChart data={weekChartData} />
        </div>
      </div>

      <div
        className="responsive-grid-2"
        style={{
          padding: "4px 26px 26px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "12px",
            }}
          >
            <AlertTriangle size={17} color="var(--danger)" />
            <span style={{ fontWeight: 700, fontSize: "14.5px" }}>
              {t("lowStockTitle")}
            </span>
          </div>
          {lowStock.length === 0 ? (
            <div style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
              {t("noLowStock")}
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "7px" }}
            >
              {lowStock.map((p) => (
                <div
                  key={p.id}
                  className="dash-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13.5px",
                    padding: "6px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <ProductThumb image={p.image} size={28} />
                  <span style={{ flex: 1 }}>{prodName(p)}</span>
                  <span
                    style={{
                      color: "var(--danger)",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {p.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setActiveTab("inventory")}
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "var(--primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {t("manageStock")}
            <ChevronDown size={13} style={{ transform: "rotate(-90deg)" }} />
          </button>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "12px",
            }}
          >
            <Receipt size={17} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: "14.5px" }}>
              {t("recentSales")}
            </span>
          </div>
          {sales.length === 0 ? (
            <div style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
              {t("noSalesYet")}
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "7px" }}
            >
              {sales.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="dash-row"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13.5px",
                    padding: "6px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>
                    {new Date(s.date).toLocaleTimeString(
                      lang === "en" ? "en-US" : "km-KH",
                      { hour: "2-digit", minute: "2-digit" },
                    )}{" "}
                    · {s.items.length} {t("itemsWord")}
                  </span>
                  <span
                    style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}
                  >
                    {fmt(s.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setActiveTab("reports")}
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "var(--primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {t("viewReports")}
            <ChevronDown size={13} style={{ transform: "rotate(-90deg)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "primary" }) {
  const toneColor = tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div
      className="stat-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "12.5px",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `color-mix(in srgb, ${toneColor} 14%, transparent)`,
            flexShrink: 0,
          }}
        >
          <Icon size={16} color={toneColor} />
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 800,
          fontSize: "21px",
          marginTop: "10px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ================= Inventory =================

// Same "⋮ Actions" dropdown as Users — Edit / Delete in one button instead
// of two separate icon buttons in the row.
function ProductActionMenu({ t, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  const menuItemStyle = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    background: "none",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
  };
  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={t("userActions")}
        style={{
          ...iconBtnStyle,
          background: open ? "var(--surface-alt)" : "none",
        }}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 55,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 12px 30px rgba(0,0,0,.16)",
            padding: "5px",
            minWidth: "160px",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            style={menuItemStyle}
          >
            <Pencil size={14} /> {t("editProduct")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            style={{ ...menuItemStyle, color: "var(--danger)" }}
          >
            <Trash2 size={14} /> {t("deleteProduct")}
          </button>
        </div>
      )}
    </div>
  );
}

function InventoryTab({
  products,
  prodName,
  prodUnit,
  catLabel,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  openAdd,
  openEdit,
  deleteProduct,
  openManageCategories,
}) {
  const { t, categories } = useT();
  const [expandedId, setExpandedId] = useState(null);
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("nav_inventory")}
        subtitle={t("inv_subtitle", { count: products.length })}
        action={
          <button onClick={openAdd} style={primaryBtnStyle}>
            <Plus size={16} /> {t("addProduct")}
          </button>
        }
      />
      <div style={{ padding: "16px 26px 0", display: "flex", gap: "12px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchProducts")}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontSize: "14px",
            }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "9px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            fontSize: "14px",
          }}
        >
          <option value="all">{t("allCategories")}</option>
          {categories.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {catLabel(cat.key)}
            </option>
          ))}
        </select>
        <button onClick={openManageCategories} style={secondaryBtnStyle}>
          <Package size={15} /> {t("manageCategories")}
        </button>
      </div>

      <div
        style={{
          padding: "16px 26px 26px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {products.map((p) => {
          const isExpanded = expandedId === p.id;
          const lowStock = p.stock <= 5;
          return (
            <div
              key={p.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
              }}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className="list-card-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                }}
              >
                <ProductThumb image={p.image} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14.5px", fontWeight: 700 }}>
                    {prodName(p)}
                  </div>
                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {catLabel(p.category)}
                    {p.barcode && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          marginLeft: "8px",
                        }}
                      >
                        · {p.barcode}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  {fmt(p.price)}
                </div>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)",
                    background: lowStock
                      ? "rgba(220,38,38,.12)"
                      : "var(--surface-alt)",
                    color: lowStock ? "var(--danger)" : "var(--text)",
                  }}
                >
                  {p.stock} {prodUnit(p)}
                </span>
                <ProductActionMenu
                  t={t}
                  onEdit={() => openEdit(p)}
                  onDelete={() => deleteProduct(p.id)}
                />
                <ChevronDown
                  size={15}
                  style={{
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    transform: isExpanded ? "rotate(180deg)" : "none",
                    transition: "transform .15s",
                  }}
                />
              </div>
              {isExpanded && (
                <div
                  style={{
                    padding: "0 14px 14px 64px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{ fontSize: "12.5px", color: "var(--text-muted)" }}
                  >
                    {t("th_margin")}:{" "}
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>
                      {p.cost > 0
                        ? `${fmt(p.price - p.cost)} (${
                            p.price > 0
                              ? Math.round(((p.price - p.cost) / p.price) * 100)
                              : 0
                          }%)`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {products.length === 0 && (
          <EmptyState
            icon={Package}
            title={t("noProducts")}
            actionLabel={t("addProduct")}
            onAction={openAdd}
          />
        )}
      </div>
    </div>
  );
}

// ================= Reports =================

function RevenueChart({ data }) {
  const { t } = useT();
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div
        style={{
          height: "210px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "13.5px",
        }}
      >
        {t("chartNoData")}
      </div>
    );
  }

  const W = 760,
    H = 220,
    padL = 44,
    padR = 12,
    padT = 14,
    padB = 26;
  const plotW = W - padL - padR,
    plotH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax =
    max <= 10
      ? Math.ceil(max)
      : Math.ceil(max / Math.pow(10, String(Math.floor(max)).length - 1)) *
        Math.pow(10, String(Math.floor(max)).length - 1);
  const barGap = data.length > 20 ? 1 : 5;
  const barW = Math.max(1, plotW / data.length - barGap);
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "220px", overflow: "visible" }}
    >
      {gridLines.map((g) => {
        const y = padT + plotH * (1 - g);
        return (
          <g key={g}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={g === 0 ? "0" : "3,3"}
            />
            <text
              x={padL - 8}
              y={y + 3}
              fontSize="9.5"
              textAnchor="end"
              fill="var(--text-muted)"
              fontFamily="var(--font-mono)"
            >
              {g === 0 ? "0" : fmt(niceMax * g).replace(".00", "")}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barH = niceMax > 0 ? (d.value / niceMax) * plotH : 0;
        const x =
          padL + i * (plotW / data.length) + (plotW / data.length - barW) / 2;
        const y = padT + plotH - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(barH, d.value > 0 ? 2 : 0)}
              rx={Math.min(3, barW / 2)}
              fill="var(--primary)"
              opacity={d.value > 0 ? 1 : 0.12}
            >
              <title>
                {d.label || ""}: {fmt(d.value)}
              </title>
            </rect>
            {d.label && (
              <text
                x={x + barW / 2}
                y={H - padB + 13}
                fontSize="9.5"
                textAnchor="middle"
                fill="var(--text-muted)"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ReportsTab({
  reportRange,
  setReportRange,
  summary,
  chartData,
  sales,
  expandedSale,
  setExpandedSale,
  exportCsv,
  onReprint,
  archivedSales,
  onArchiveOld,
  onRestore,
  onRestoreAll,
  onExportArchive,
  onImportArchive,
  onRefund,
  canRefund,
}) {
  const { t, lang } = useT();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [archiveView, setArchiveView] = useState("active"); // 'active' | 'archived'
  const [cutoffMonths, setCutoffMonths] = useState(6);
  const importInputRef = useRef(null);
  const ranges = [
    { id: "today", key: "range_today" },
    { id: "week", key: "range_week" },
    { id: "month", key: "range_month" },
    { id: "all", key: "range_all" },
  ];
  const visibleSales = archiveView === "archived" ? archivedSales : sales;
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("rep_title")}
        subtitle={t("rep_subtitle")}
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {ranges.map((r) => (
              <CategoryPill
                key={r.id}
                active={reportRange === r.id}
                onClick={() => setReportRange(r.id)}
                label={t(r.key)}
              />
            ))}
            <button
              onClick={exportCsv}
              style={{
                ...iconBtnStyle,
                width: "auto",
                padding: "8px 12px",
                gap: "6px",
                display: "flex",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <Download size={14} /> {t("exportCsv")}
            </button>
            <button
              onClick={() => setArchiveOpen(!archiveOpen)}
              style={{
                ...iconBtnStyle,
                width: "auto",
                padding: "8px 12px",
                gap: "6px",
                display: "flex",
                fontSize: "13px",
                fontWeight: 600,
                color: archiveOpen ? "var(--primary)" : undefined,
              }}
            >
              <History size={14} /> {t("archive_manageBtn")}
            </button>
          </div>
        }
      />

      {archiveOpen && (
        <div style={{ padding: "16px 26px 0" }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "14.5px",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <History size={16} color="var(--primary)" /> {t("archive_title")}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                color: "var(--text-muted)",
                marginBottom: "14px",
              }}
            >
              {t("archive_subtitle", { count: archivedSales.length })}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600 }}>
                {t("archive_cutoffLabel")}
              </span>
              {[
                { m: 3, key: "archive_3m" },
                { m: 6, key: "archive_6m" },
                { m: 12, key: "archive_12m" },
              ].map((c) => (
                <CategoryPill
                  key={c.m}
                  active={cutoffMonths === c.m}
                  onClick={() => setCutoffMonths(c.m)}
                  label={t(c.key)}
                />
              ))}
              <button
                onClick={() => onArchiveOld(cutoffMonths)}
                style={{
                  ...primaryBtnStyle,
                  padding: "8px 14px",
                  fontSize: "13px",
                }}
              >
                {t("archive_runBtn")}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                borderTop: "1px dashed var(--border)",
                paddingTop: "12px",
              }}
            >
              <button
                onClick={() =>
                  setArchiveView(
                    archiveView === "archived" ? "active" : "archived",
                  )
                }
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "8px 12px",
                  gap: "6px",
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {archiveView === "archived"
                  ? t("archive_backToActive")
                  : t("archive_viewBtn", { count: archivedSales.length })}
              </button>
              <button
                onClick={onRestoreAll}
                disabled={archivedSales.length === 0}
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "8px 12px",
                  gap: "6px",
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                  opacity: archivedSales.length === 0 ? 0.5 : 1,
                }}
              >
                {t("archive_restoreAll")}
              </button>
              <button
                onClick={onExportArchive}
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "8px 12px",
                  gap: "6px",
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Download size={14} /> {t("archive_export")}
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "8px 12px",
                  gap: "6px",
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {t("archive_import")}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) onImportArchive(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
      )}
      <div
        className="responsive-grid-4"
        style={{
          padding: "20px 26px 0",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "14px",
        }}
      >
        <StatCard
          label={t("stat_revenue")}
          value={fmt(summary.revenue)}
          icon={TrendingUp}
        />
        <StatCard
          label={t("stat_transactions")}
          value={summary.txCount}
          icon={Receipt}
        />
        <StatCard
          label={t("stat_avgTx")}
          value={fmt(summary.avg)}
          icon={BarChart3}
        />
        <StatCard
          label={t("stat_itemsSold")}
          value={summary.itemsSold}
          icon={Package}
        />
        <StatCard
          label={t("stat_profit")}
          value={fmt(summary.profit)}
          icon={TrendingUp}
        />
        <StatCard
          label={t("stat_expenses")}
          value={fmt(summary.expensesTotal)}
          icon={Wallet}
        />
        <StatCard
          label={t("stat_netProfit")}
          value={fmt(summary.netProfit)}
          icon={TrendingUp}
        />
      </div>

      <div style={{ padding: "16px 26px 0" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px 18px 6px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "14.5px",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <BarChart3 size={16} color="var(--primary)" /> {t("chartTitle")}
          </div>
          <RevenueChart data={chartData} />
        </div>
      </div>

      <div
        className="responsive-grid-2"
        style={{
          padding: "16px 26px",
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "14.5px",
              marginBottom: "12px",
            }}
          >
            {t("topProducts")}
          </div>
          {summary.topProducts.length === 0 ? (
            <div style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
              {t("noData")}
            </div>
          ) : (
            summary.topProducts.map(([name, qty], i) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "7px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface-alt)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--primary)",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: "13.5px" }}>{name}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "13.5px",
                  }}
                >
                  ×{qty}
                </span>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
            maxHeight: "380px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "14.5px",
              marginBottom: "12px",
            }}
          >
            {archiveView === "archived"
              ? t("archive_title")
              : t("transactions", { count: visibleSales.length })}
          </div>
          {visibleSales.length === 0 && (
            <div style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
              {archiveView === "archived"
                ? t("archive_empty")
                : t("noTransactions")}
            </div>
          )}
          {visibleSales.map((s) => (
            <div key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={() =>
                  setExpandedSale(expandedSale === s.id ? null : s.id)
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "9px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <ChevronDown
                  size={14}
                  style={{
                    transform:
                      expandedSale === s.id ? "rotate(180deg)" : "none",
                    transition: "transform .15s",
                    color: "var(--text-muted)",
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                >
                  {new Date(s.date).toLocaleDateString(
                    lang === "en" ? "en-US" : "km-KH",
                  )}{" "}
                  {new Date(s.date).toLocaleTimeString(
                    lang === "en" ? "en-US" : "km-KH",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    flex: 1,
                    color: "var(--text-muted)",
                  }}
                >
                  {s.customerName || "—"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "14px",
                    textDecoration: s.refunded ? "line-through" : "none",
                    color: s.refunded ? "var(--text-muted)" : "inherit",
                  }}
                >
                  {fmt(s.total)}
                </span>
                {s.refunded && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--danger)",
                      background: "rgba(220,38,38,.1)",
                      borderRadius: "var(--radius-sm)",
                      padding: "2px 7px",
                      flexShrink: 0,
                    }}
                  >
                    {t("refunded")}
                  </span>
                )}
              </button>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "16px",
                  padding: "0 0 6px 23px",
                }}
              >
                {!s.refunded && canRefund && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRefundTarget(s);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <RotateCcw size={12} /> {t("refund")}
                  </button>
                )}
                {archiveView === "archived" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(s.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <History size={12} /> {t("archive_restore")}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReprint(s);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Printer size={12} /> {t("print")}
                </button>
              </div>
              {expandedSale === s.id && (
                <div style={{ padding: "4px 0 12px 23px" }}>
                  {s.items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "12.5px",
                        color: "var(--text-muted)",
                        padding: "2px 0",
                      }}
                    >
                      <span>
                        {it.name} × {it.qty}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {fmt(it.price * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {refundTarget && (
        <ConfirmDialog
          title={t("refund_confirmTitle")}
          message={t("refund_confirmMsg")}
          confirmLabel={t("refund")}
          onCancel={() => setRefundTarget(null)}
          onConfirm={() => {
            onRefund(refundTarget.id);
            setRefundTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ================= Customers =================

function CustomersTab({
  customers,
  openAdd,
  openEdit,
  deleteCustomer,
  canDelete,
}) {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q),
      )
    : customers;

  const tierStyle = {
    gold: { bg: "rgba(217,119,6,.12)", color: "#b45309", Icon: Crown },
    silver: { bg: "rgba(100,116,139,.14)", color: "#475569", Icon: Award },
    bronze: { bg: "rgba(180,83,9,.10)", color: "#92400e", Icon: Award },
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("nav_customers")}
        subtitle={t("cust_subtitle", { count: customers.length })}
        action={
          <button onClick={openAdd} style={primaryBtnStyle}>
            <UserPlus size={16} /> {t("addCustomer")}
          </button>
        }
      />
      <div style={{ padding: "16px 26px 0" }}>
        <div style={{ position: "relative", maxWidth: "340px" }}>
          <Search
            size={15}
            color="var(--text-muted)"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("cust_searchPlaceholder")}
            style={{
              ...fieldInput,
              margin: 0,
              paddingLeft: "34px",
              paddingRight: search ? "34px" : "12px",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          padding: "18px 26px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "14px",
        }}
      >
        {customers.length === 0 && (
          <EmptyState
            icon={Users}
            title={t("noCustomersYet")}
            description={t("noCustomersYetDesc")}
            actionLabel={t("addCustomer")}
            onAction={openAdd}
          />
        )}
        {customers.length > 0 && filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              color: "var(--text-muted)",
              fontSize: "14px",
              textAlign: "center",
              padding: "34px 0",
            }}
          >
            {t("cust_noSearchResults")}
          </div>
        )}
        {filtered.map((c) => {
          const tier = customerTier(c.totalSpent);
          const initial = (c.name || "?").trim().charAt(0).toUpperCase();
          return (
            <div
              key={c.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "start" }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "var(--radius-pill)",
                      background: tier
                        ? tierStyle[tier].bg
                        : "var(--surface-alt)",
                      color: tier ? tierStyle[tier].color : "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "15px" }}>
                        {c.name}
                      </div>
                      {Number(c.discount_percent) > 0 && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: "var(--primary)",
                            color: "#fff",
                          }}
                        >
                          -{c.discount_percent}%
                        </span>
                      )}
                      {tier && (
                        <span
                          title={t("cust_tier_" + tier)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            background: tierStyle[tier].bg,
                            color: tierStyle[tier].color,
                          }}
                        >
                          {(() => {
                            const TierIcon = tierStyle[tier].Icon;
                            return <TierIcon size={11} />;
                          })()}
                          {t("cust_tier_" + tier)}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text-muted)",
                        marginTop: "3px",
                      }}
                    >
                      {c.phone || t("noPhone")}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <button onClick={() => openEdit(c)} style={iconBtnStyle}>
                    <Pencil size={13} />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setDeleteTarget(c)}
                      style={{ ...iconBtnStyle, color: "var(--danger)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  marginTop: "14px",
                  paddingTop: "11px",
                  borderTop: "1px dashed var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {t("totalSpent")}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    {fmt(c.totalSpent || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {t("visits")}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    {c.visits || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {t("points")}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "var(--accent)",
                    }}
                  >
                    {c.points || 0}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {deleteTarget && (
        <ConfirmDialog
          title={t("cust_deleteConfirm")}
          message={`${deleteTarget.name}${
            deleteTarget.phone ? " (" + deleteTarget.phone + ")" : ""
          } — ${t("confirmDialog_irreversible")}`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteCustomer(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ================= Expenses =================

function ExpensesTab({ expenses, openAdd, openEdit, deleteExpense }) {
  const { t } = useT();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const now = new Date();
  const thisMonthTotal = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("nav_expenses")}
        subtitle={t("exp_subtitle")}
        action={
          <button onClick={openAdd} style={primaryBtnStyle}>
            <Plus size={16} /> {t("exp_addBtn")}
          </button>
        }
      />
      <div style={{ padding: "18px 26px 0" }}>
        <StatCard
          label={t("exp_totalThisMonth")}
          value={fmt(thisMonthTotal)}
          icon={Wallet}
        />
      </div>
      <div style={{ padding: "18px 26px" }}>
        {sorted.length === 0 && (
          <EmptyState
            icon={Wallet}
            title={t("exp_empty")}
            actionLabel={t("exp_addBtn")}
            onAction={openAdd}
          />
        )}
        {sorted.length > 0 && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "start",
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <th style={{ ...thStyle, width: "14%" }}>{t("exp_date")}</th>
                  <th style={{ ...thStyle, width: "16%" }}>
                    {t("exp_category")}
                  </th>
                  <th style={{ ...thStyle, width: "28%" }}>{t("exp_note")}</th>
                  <th style={{ ...thStyle, width: "16%" }}>
                    {t("exp_addedBy")}
                  </th>
                  <th style={{ ...thStyle, width: "16%", textAlign: "end" }}>
                    {t("exp_amount")}
                  </th>
                  <th style={{ ...thStyle, width: "10%" }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      style={{
                        ...tdStyle,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.date}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("exp_cat_" + e.category)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.note || "—"}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.username || "—"}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "end",
                        fontWeight: 700,
                      }}
                    >
                      {fmt(e.amount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "end" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => openEdit(e)}
                          style={iconBtnStyle}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(e.id)}
                          style={{ ...iconBtnStyle, color: "var(--danger)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {deleteTarget && (
        <ConfirmDialog
          title={t("exp_deleteConfirm")}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteExpense(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ================= Shift / Cash Reconciliation =================

function ShiftTab({
  shifts,
  currentShift,
  sales,
  lang,
  onStart,
  onEnd,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  const { t } = useT();
  const [openingInput, setOpeningInput] = useState("");
  const [endOpen, setEndOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const showActions = canEdit || canDelete;

  const fmtTime = (ms) => {
    try {
      return new Date(ms).toLocaleString(lang === "en" ? "en-US" : "km-KH", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "";
    }
  };

  let liveCashSales = 0;
  let liveCashRefunds = 0;
  if (currentShift) {
    sales.forEach((s) => {
      if ((s.paymentMethod || "cash") !== "cash") return;
      const soldAt = new Date(s.date).getTime();
      if (soldAt >= currentShift.openedAt) liveCashSales += s.total;
      if (s.refunded && s.refundedAt) {
        const refundedAt = new Date(s.refundedAt).getTime();
        if (refundedAt >= currentShift.openedAt) liveCashRefunds += s.total;
      }
    });
  }
  const liveExpected = currentShift
    ? currentShift.openingCash + liveCashSales - liveCashRefunds
    : 0;

  const closedShifts = [...shifts]
    .filter((s) => s.closedAt)
    .sort((a, b) => b.closedAt - a.closedAt);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar title={t("nav_shift")} subtitle={t("shift_subtitle")} />
      <div style={{ padding: "18px 26px" }}>
        {!currentShift && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              maxWidth: "360px",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "15px" }}>
              {t("shift_startTitle")}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                color: "var(--text-muted)",
                marginTop: "4px",
                marginBottom: "14px",
              }}
            >
              {t("shift_startDesc")}
            </div>
            <label style={fieldLabel}>{t("shift_openingCash")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingInput}
              onChange={(e) => setOpeningInput(e.target.value)}
              style={fieldInput}
              placeholder="0.00"
              autoFocus
            />
            <button
              onClick={() => {
                onStart(openingInput);
                setOpeningInput("");
              }}
              style={{ ...primaryBtnStyle, marginTop: "6px" }}
            >
              <Banknote size={16} /> {t("shift_startBtn")}
            </button>
          </div>
        )}

        {currentShift && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>
                  {t("shift_active")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  {t("shift_openedBy")}: {currentShift.openedBy} ·{" "}
                  {fmtTime(currentShift.openedAt)}
                </div>
              </div>
              <button
                onClick={() => setEndOpen(true)}
                style={{ ...primaryBtnStyle, background: "var(--danger)" }}
              >
                {t("shift_endBtn")}
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              <StatCard
                label={t("shift_openingCash")}
                value={fmt(currentShift.openingCash)}
                icon={Banknote}
              />
              <StatCard
                label={t("shift_cashSales")}
                value={fmt(liveCashSales)}
                icon={TrendingUp}
              />
              <StatCard
                label={t("shift_cashRefunds")}
                value={fmt(liveCashRefunds)}
                icon={RotateCcw}
              />
              <StatCard
                label={t("shift_expectedCash")}
                value={fmt(liveExpected)}
                icon={Wallet}
                tone="accent"
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <div
            style={{ fontWeight: 700, fontSize: "14px", marginBottom: "10px" }}
          >
            {t("shift_history")}
          </div>
          {closedShifts.length === 0 && (
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {t("shift_historyEmpty")}
            </div>
          )}
          {closedShifts.length > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  minWidth: "640px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      textAlign: "start",
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <th style={{ ...thStyle, width: "22%" }}>
                      {t("shift_closedAt")}
                    </th>
                    <th style={{ ...thStyle, width: "18%" }}>
                      {t("shift_closedBy")}
                    </th>
                    <th style={{ ...thStyle, width: "20%", textAlign: "end" }}>
                      {t("shift_expectedCash")}
                    </th>
                    <th style={{ ...thStyle, width: "20%", textAlign: "end" }}>
                      {t("shift_countedCash")}
                    </th>
                    <th style={{ ...thStyle, width: "20%", textAlign: "end" }}>
                      {t("shift_diff")}
                    </th>
                    {showActions && (
                      <th style={{ ...thStyle, width: "70px" }}></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {closedShifts.map((s) => (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td style={tdStyle}>{fmtTime(s.closedAt)}</td>
                      <td style={tdStyle}>{s.closedBy}</td>
                      <td style={{ ...tdStyle, textAlign: "end" }}>
                        {fmt(s.expectedCash)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "end" }}>
                        {fmt(s.countedCash)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "end",
                          fontWeight: 700,
                          color:
                            Math.abs(s.difference) < 0.01
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {s.difference > 0 ? "+" : ""}
                        {fmt(s.difference)}
                      </td>
                      {showActions && (
                        <td style={{ ...tdStyle, textAlign: "end" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "5px",
                              justifyContent: "flex-end",
                            }}
                          >
                            {canEdit && (
                              <button
                                onClick={() => setEditTarget(s)}
                                style={iconBtnStyle}
                                title={t("shift_editTitle")}
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(s.id)}
                                style={{
                                  ...iconBtnStyle,
                                  color: "var(--danger)",
                                }}
                                title={t("shift_deleteConfirm")}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {endOpen && currentShift && (
        <EndShiftModal
          liveExpected={liveExpected}
          onClose={() => setEndOpen(false)}
          onConfirm={(vals) => {
            onEnd(vals);
            setEndOpen(false);
          }}
        />
      )}

      {editTarget && (
        <EditShiftModal
          shift={editTarget}
          onClose={() => setEditTarget(null)}
          onConfirm={(vals) => {
            onEdit({ id: editTarget.id, ...vals });
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("shift_deleteConfirm")}
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            onDelete(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function EndShiftModal({ liveExpected, onClose, onConfirm }) {
  const { t } = useT();
  const [countedCash, setCountedCash] = useState("");
  const [adjustments, setAdjustments] = useState("");
  const [note, setNote] = useState("");

  const expectedAfterAdj = liveExpected - (Number(adjustments) || 0);
  const diff = (Number(countedCash) || 0) - expectedAfterAdj;
  const hasCounted = countedCash !== "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "22px",
          width: "380px",
          maxWidth: "100%",
        }}
      >
        <div
          style={{ fontWeight: 700, fontSize: "16px", marginBottom: "14px" }}
        >
          {t("shift_endBtn")}
        </div>

        <label style={fieldLabel}>{t("shift_adjustments")}</label>
        <input
          type="number"
          step="0.01"
          value={adjustments}
          onChange={(e) => setAdjustments(e.target.value)}
          style={fieldInput}
          placeholder="0.00"
        />
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "-8px",
            marginBottom: "12px",
          }}
        >
          {t("shift_adjustmentsHint")}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13.5px",
            fontWeight: 700,
            padding: "10px 12px",
            background: "var(--bg)",
            borderRadius: "var(--radius-md)",
            marginBottom: "14px",
          }}
        >
          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            {t("shift_expectedCash")}
          </span>
          <span>{fmt(expectedAfterAdj)}</span>
        </div>

        <label style={fieldLabel}>{t("shift_countedCash")}</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={countedCash}
          onChange={(e) => setCountedCash(e.target.value)}
          style={fieldInput}
          placeholder="0.00"
          autoFocus
        />

        {hasCounted && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13.5px",
              fontWeight: 700,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              marginBottom: "14px",
              background: `color-mix(in srgb, ${
                Math.abs(diff) < 0.01 ? "var(--success)" : "var(--danger)"
              } 12%, transparent)`,
              color: Math.abs(diff) < 0.01 ? "var(--success)" : "var(--danger)",
            }}
          >
            <span>{t("shift_diff")}</span>
            <span>
              {diff > 0 ? "+" : ""}
              {fmt(diff)}
            </span>
          </div>
        )}

        <label style={fieldLabel}>{t("shift_note")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ ...fieldInput, minHeight: "60px", resize: "vertical" }}
          placeholder={t("shift_notePlaceholder")}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            onClick={onClose}
            style={{
              ...secondaryBtnStyle,
              flex: 1,
              justifyContent: "center",
            }}
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onConfirm({ countedCash, adjustments, note })}
            disabled={!hasCounted}
            style={{
              ...primaryBtnStyle,
              flex: 1,
              justifyContent: "center",
              opacity: hasCounted ? 1 : 0.5,
            }}
          >
            {t("shift_confirmEnd")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Lets a permitted role (see canEdit/canEditShift) correct an already-closed
// shift record. Opening cash and the frozen cash-sales/cash-refunds figures
// (locked in when the shift was originally closed) are shown but not
// editable — only counted cash, adjustments, and the note can change, and
// expected cash / difference are recomputed live from those frozen figures.
function EditShiftModal({ shift, onClose, onConfirm }) {
  const { t } = useT();
  const [countedCash, setCountedCash] = useState(
    shift.countedCash != null ? String(shift.countedCash) : "",
  );
  const [adjustments, setAdjustments] = useState(
    shift.adjustments ? String(shift.adjustments) : "",
  );
  const [note, setNote] = useState(shift.note || "");

  const baseExpected =
    shift.openingCash + (shift.cashSales || 0) - (shift.cashRefunds || 0);
  const expectedAfterAdj = baseExpected - (Number(adjustments) || 0);
  const diff = (Number(countedCash) || 0) - expectedAfterAdj;
  const hasCounted = countedCash !== "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "22px",
          width: "380px",
          maxWidth: "100%",
        }}
      >
        <div
          style={{ fontWeight: 700, fontSize: "16px", marginBottom: "14px" }}
        >
          {t("shift_editTitle")}
        </div>

        <label style={fieldLabel}>{t("shift_adjustments")}</label>
        <input
          type="number"
          step="0.01"
          value={adjustments}
          onChange={(e) => setAdjustments(e.target.value)}
          style={fieldInput}
          placeholder="0.00"
        />
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "-8px",
            marginBottom: "12px",
          }}
        >
          {t("shift_adjustmentsHint")}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13.5px",
            fontWeight: 700,
            padding: "10px 12px",
            background: "var(--bg)",
            borderRadius: "var(--radius-md)",
            marginBottom: "14px",
          }}
        >
          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            {t("shift_expectedCash")}
          </span>
          <span>{fmt(expectedAfterAdj)}</span>
        </div>

        <label style={fieldLabel}>{t("shift_countedCash")}</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={countedCash}
          onChange={(e) => setCountedCash(e.target.value)}
          style={fieldInput}
          placeholder="0.00"
          autoFocus
        />

        {hasCounted && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13.5px",
              fontWeight: 700,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              marginBottom: "14px",
              background: `color-mix(in srgb, ${
                Math.abs(diff) < 0.01 ? "var(--success)" : "var(--danger)"
              } 12%, transparent)`,
              color: Math.abs(diff) < 0.01 ? "var(--success)" : "var(--danger)",
            }}
          >
            <span>{t("shift_diff")}</span>
            <span>
              {diff > 0 ? "+" : ""}
              {fmt(diff)}
            </span>
          </div>
        )}

        <label style={fieldLabel}>{t("shift_note")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ ...fieldInput, minHeight: "60px", resize: "vertical" }}
          placeholder={t("shift_notePlaceholder")}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            onClick={onClose}
            style={{
              ...secondaryBtnStyle,
              flex: 1,
              justifyContent: "center",
            }}
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onConfirm({ countedCash, adjustments, note })}
            disabled={!hasCounted}
            style={{
              ...primaryBtnStyle,
              flex: 1,
              justifyContent: "center",
              opacity: hasCounted ? 1 : 0.5,
            }}
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Online Orders =================

// Required-reason prompt shown before a pending order can be rejected, or
// an accepted order cancelled — captures why, and (via onConfirm in the
// parent) who did it, so the order keeps a record instead of just
// disappearing into "Rejected"/"Cancelled" with no explanation.
function OrderReasonModal({ order, actionType, onClose, onConfirm }) {
  const { t } = useT();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  const isReject = actionType === "reject";

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <ModalShell
      title={t(
        isReject ? "orderReason_titleReject" : "orderReason_titleCancel",
      )}
      onClose={onClose}
    >
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          marginBottom: "12px",
        }}
      >
        {order.customer_name || "—"}
        {order.customer_phone ? ` · ${order.customer_phone}` : ""}
      </div>
      <label style={fieldLabel}>{t("order_reasonLabel")}</label>
      <textarea
        autoFocus
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (error) setError(false);
        }}
        placeholder={t("orderReason_placeholder")}
        rows={3}
        style={{
          ...fieldInput,
          fontFamily: "var(--font-body)",
          resize: "vertical",
          marginBottom: error ? "6px" : "14px",
          borderColor: error ? "var(--danger)" : "var(--border)",
        }}
      />
      {error && (
        <div
          style={{
            color: "var(--danger)",
            fontSize: "12.5px",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          {t("orderReason_required")}
        </div>
      )}
      <button
        onClick={submit}
        style={{
          ...primaryBtnStyle,
          width: "100%",
          justifyContent: "center",
          background: "var(--danger)",
        }}
      >
        {t(
          isReject ? "orderReason_confirmReject" : "orderReason_confirmCancel",
        )}
      </button>
    </ModalShell>
  );
}

function OnlineOrdersTab({
  orders,
  archivedOrders,
  products,
  supabaseStatus,
  shopSlug,
  onAccept,
  onReject,
  onMarkPaid,
  onUndoPaid,
  onCancel,
  onArchiveOrder,
  onArchiveFinished,
  onRestoreOrder,
  onRestoreAllOrders,
  isSuperAdmin,
  onDeleteOrder,
  onDeleteAllArchived,
  notifySoundOn,
  setNotifySoundOn,
}) {
  const { t, lang } = useT();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [archiveView, setArchiveView] = useState("active"); // 'active' | 'archived'
  const [statusFilter, setStatusFilter] = useState("all");
  const [undoTarget, setUndoTarget] = useState(null);
  const [reasonTarget, setReasonTarget] = useState(null); // { order, actionType: 'reject'|'cancel' }
  const [deleteTarget, setDeleteTarget] = useState(null); // single order pending permanent delete
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false); // bulk delete confirm
  const allVisibleOrders = archiveView === "archived" ? archivedOrders : orders;
  const visibleOrders =
    statusFilter === "all"
      ? allVisibleOrders
      : allVisibleOrders.filter((o) => o.status === statusFilter);

  const storeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?order=1${
          shopSlug ? `&shop=${encodeURIComponent(shopSlug)}` : ""
        }`
      : "";

  const qrImgUrl = (size) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(storeUrl)}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  if (!supabase) {
    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <TopBar
          title={t("nav_onlineOrders")}
          subtitle={t("onlineOrders_subtitle", { count: 0 })}
        />
        <div
          style={{
            margin: "20px 26px",
            padding: "20px",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-alt)",
            border: "1px dashed var(--border)",
          }}
        >
          <div
            style={{ fontWeight: 700, fontSize: "14.5px", marginBottom: "5px" }}
          >
            {t("supabaseNotConfigured")}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {t("supabaseNotConfiguredHint")}
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = (status) => {
    const map = {
      pending: {
        label: t("status_pending"),
        bg: "var(--accent)",
        fg: "#fff",
        Icon: Clock3,
      },
      accepted: {
        label: t("status_accepted"),
        bg: "#e0a030",
        fg: "#fff",
        Icon: Clock3,
      },
      paid: {
        label: t("status_paid"),
        bg: "var(--primary)",
        fg: "#fff",
        Icon: Check,
      },
      rejected: {
        label: t("status_rejected"),
        bg: "var(--surface-alt)",
        fg: "var(--text-muted)",
        Icon: XCircle,
      },
      cancelled: {
        label: t("status_cancelled"),
        bg: "var(--surface-alt)",
        fg: "var(--text-muted)",
        Icon: XCircle,
      },
    };
    const s = map[status] || map.pending;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 9px",
          borderRadius: "var(--radius-pill)",
          fontSize: "11px",
          fontWeight: 700,
          background: s.bg,
          color: s.fg,
        }}
      >
        <s.Icon size={11} /> {s.label}
      </span>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("nav_onlineOrders")}
        subtitle={t("onlineOrders_subtitle", { count: orders.length })}
        action={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                setArchiveView(
                  archiveView === "archived" ? "active" : "archived",
                )
              }
              style={{
                ...iconBtnStyle,
                width: "auto",
                padding: "8px 12px",
                gap: "6px",
                display: "flex",
                fontSize: "13px",
                fontWeight: 600,
                color:
                  archiveView === "archived" ? "var(--primary)" : undefined,
              }}
            >
              <History size={14} />{" "}
              {archiveView === "archived"
                ? t("archive_backToActive")
                : t("archive_viewBtn", { count: archivedOrders.length })}
            </button>
            {archiveView === "active" ? (
              <button
                onClick={onArchiveFinished}
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "8px 12px",
                  gap: "6px",
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {t("archive_finishedBtn")}
              </button>
            ) : (
              <button
                onClick={onRestoreAllOrders}
                disabled={archivedOrders.length === 0}
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "8px 12px",
                  gap: "6px",
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                  opacity: archivedOrders.length === 0 ? 0.5 : 1,
                }}
              >
                {t("archive_restoreAll")}
              </button>
            )}
            {archiveView === "archived" && isSuperAdmin && (
              <button
                onClick={() => setDeleteAllConfirm(true)}
                disabled={archivedOrders.length === 0}
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "8px 12px",
                  gap: "6px",
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--danger)",
                  opacity: archivedOrders.length === 0 ? 0.5 : 1,
                }}
              >
                <Trash2 size={14} /> {t("archive_deleteAllPermanent")}
              </button>
            )}
            <button
              onClick={() => setNotifySoundOn(!notifySoundOn)}
              title={notifySoundOn ? t("notifySound_on") : t("notifySound_off")}
              style={{
                ...iconBtnStyle,
                width: "auto",
                padding: "8px 10px",
                color: notifySoundOn ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {notifySoundOn ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 700,
                color:
                  supabaseStatus === "live"
                    ? "var(--primary)"
                    : "var(--text-muted)",
              }}
            >
              {supabaseStatus === "live" ? (
                <Wifi size={14} />
              ) : (
                <WifiOff size={14} />
              )}
              {supabaseStatus === "live"
                ? t("liveIndicator")
                : t("offlineIndicator")}
            </div>
          </div>
        }
      />

      {archiveView === "archived" && (
        <div
          style={{
            margin: "4px 26px 0",
            fontSize: "12.5px",
            color: "var(--text-muted)",
          }}
        >
          {t("archive_ordersSubtitle", { count: archivedOrders.length })}
        </div>
      )}

      <div
        style={{
          margin: "4px 26px 0",
          padding: "14px 16px",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Store size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            {t("storeLink")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12.5px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {storeUrl}
          </div>
        </div>
        <button
          onClick={() => setShowQr(!showQr)}
          style={{
            ...primaryBtnStyle,
            flexShrink: 0,
            padding: "8px 14px",
            fontSize: "12.5px",
            background: showQr ? "var(--primary)" : "var(--surface-alt)",
            color: showQr ? "#fff" : "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          <QrCode size={14} /> {showQr ? t("hideQrCode") : t("showQrCode")}
        </button>
        <button
          onClick={copyLink}
          style={{
            ...primaryBtnStyle,
            flexShrink: 0,
            padding: "8px 14px",
            fontSize: "12.5px",
          }}
        >
          {copied ? <Check size={14} /> : <Download size={14} />}{" "}
          {copied ? t("toast_linkCopied") : t("copyLink")}
        </button>
      </div>

      {showQr && (
        <div
          style={{
            margin: "10px 26px 0",
            padding: "20px",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <img
            src={qrImgUrl(220)}
            alt="QR code"
            width={220}
            height={220}
            style={{
              borderRadius: "var(--radius-sm)",
              background: "#fff",
              padding: "8px",
            }}
          />
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-muted)",
            }}
          >
            {t("scanToOrder")}
          </div>
          <a
            href={qrImgUrl(800)}
            download="online-store-qr.png"
            style={{
              ...primaryBtnStyle,
              textDecoration: "none",
              padding: "8px 16px",
              fontSize: "12.5px",
            }}
          >
            <Download size={14} /> {t("downloadQr")}
          </a>
        </div>
      )}

      <div
        style={{
          padding: "14px 26px 0",
          display: "flex",
          gap: "7px",
          flexWrap: "wrap",
        }}
      >
        <CategoryPill
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
          label={`${t("cat_all")} (${allVisibleOrders.length})`}
        />
        {Array.from(new Set(allVisibleOrders.map((o) => o.status))).map(
          (st) => (
            <CategoryPill
              key={st}
              active={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              label={`${t("status_" + st)} (${
                allVisibleOrders.filter((o) => o.status === st).length
              })`}
            />
          ),
        )}
      </div>

      <div
        style={{
          padding: "16px 26px 26px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "14px",
        }}
      >
        {visibleOrders.length === 0 && (
          <EmptyState
            icon={Receipt}
            title={
              archiveView === "archived"
                ? t("archive_ordersEmpty")
                : t("noOnlineOrders")
            }
          />
        )}
        {visibleOrders.map((o) => (
          <div
            key={o.id}
            className="order-card"
            style={{
              background: "var(--surface)",
              border:
                "1px solid " +
                (o.status === "pending" ? "var(--accent)" : "var(--border)"),
              borderLeft:
                o.status === "pending"
                  ? "4px solid var(--accent)"
                  : "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "9px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "14.5px" }}>
                  {o.customer_name || "—"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {o.customer_phone || ""}
                </div>
                {o.payment_method && (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "4px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "var(--radius-pill)",
                      background:
                        o.payment_method === "khqr"
                          ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                          : "var(--surface-alt)",
                      color:
                        o.payment_method === "khqr"
                          ? "var(--primary)"
                          : "var(--text-muted)",
                    }}
                  >
                    {t("order_paidVia_" + o.payment_method)}
                  </span>
                )}
              </div>
              {statusBadge(o.status)}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              {o.created_at
                ? new Date(o.created_at).toLocaleString(
                    lang === "en" ? "en-US" : "km-KH",
                  )
                : ""}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12.5px",
                marginBottom: "10px",
              }}
            >
              {(o.items || []).map((it, idx) => {
                const prod = (products || []).find((p) => p.id === it.id);
                const thumb = prod && prod.image;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      justifyContent: "space-between",
                      padding: "3px 0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "var(--radius-sm)",
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "var(--surface-alt)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <ImageOff size={12} color="var(--text-muted)" />
                        )}
                      </div>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {it.name} ×{it.qty}
                      </span>
                    </div>
                    <span style={{ flexShrink: 0 }}>
                      {fmt(it.price * it.qty)}
                    </span>
                  </div>
                );
              })}
              {o.note && (
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--text-muted)",
                    marginTop: "5px",
                    fontSize: "12px",
                  }}
                >
                  {o.note}
                </div>
              )}
              {(o.status === "rejected" || o.status === "cancelled") &&
                o.status_reason && (
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      marginTop: "6px",
                      padding: "7px 9px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface-alt)",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ color: "var(--text)", fontWeight: 600 }}>
                      {t("order_reasonLabel")}: {o.status_reason}
                    </div>
                    {o.status_by && (
                      <div
                        style={{
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {t("order_byLabel")}: {o.status_by}
                      </div>
                    )}
                  </div>
                )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px dashed var(--border)",
                paddingTop: "9px",
                marginTop: "auto",
              }}
            >
              <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {fmt(o.subtotal)}
              </span>
              {archiveView === "archived" && (
                <div style={{ display: "flex", gap: "6px" }}>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setDeleteTarget(o)}
                      style={{
                        ...iconBtnStyle,
                        width: "auto",
                        padding: "6px 11px",
                        fontSize: "12px",
                        fontWeight: 700,
                        display: "flex",
                        gap: "5px",
                        color: "var(--danger)",
                      }}
                    >
                      <Trash2 size={13} /> {t("archive_deletePermanent")}
                    </button>
                  )}
                  <button
                    onClick={() => onRestoreOrder(o)}
                    style={{
                      ...iconBtnStyle,
                      width: "auto",
                      padding: "6px 11px",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      gap: "5px",
                      color: "var(--primary)",
                    }}
                  >
                    <History size={13} /> {t("archive_restore")}
                  </button>
                </div>
              )}
              {archiveView === "active" &&
                ["paid", "rejected", "cancelled"].includes(o.status) && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    {o.status === "paid" && (
                      <button
                        onClick={() => setUndoTarget(o)}
                        style={{
                          ...iconBtnStyle,
                          width: "auto",
                          padding: "6px 11px",
                          fontSize: "12px",
                          fontWeight: 700,
                          display: "flex",
                          gap: "5px",
                          color: "var(--danger)",
                        }}
                      >
                        <RotateCcw size={13} /> {t("undoPaid")}
                      </button>
                    )}
                    <button
                      onClick={() => onArchiveOrder(o)}
                      style={{
                        ...iconBtnStyle,
                        width: "auto",
                        padding: "6px 11px",
                        fontSize: "12px",
                        fontWeight: 700,
                        display: "flex",
                        gap: "5px",
                      }}
                    >
                      <History size={13} /> {t("archive_single")}
                    </button>
                  </div>
                )}
              {archiveView === "active" && o.status === "pending" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  <button
                    onClick={() =>
                      setReasonTarget({ order: o, actionType: "reject" })
                    }
                    style={{
                      ...iconBtnStyle,
                      width: "auto",
                      color: "var(--danger)",
                      flex: "1 1 100px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      gap: "5px",
                    }}
                  >
                    <X size={13} style={{ flexShrink: 0 }} /> {t("reject")}
                  </button>
                  <button
                    onClick={() => onAccept(o)}
                    style={{
                      ...primaryBtnStyle,
                      flex: "1 1 100px",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      padding: "6px 8px",
                      fontSize: "12px",
                    }}
                  >
                    <Check size={13} style={{ flexShrink: 0 }} /> {t("accept")}
                  </button>
                </div>
              )}
              {o.status === "accepted" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  <button
                    onClick={() =>
                      setReasonTarget({ order: o, actionType: "cancel" })
                    }
                    style={{
                      ...iconBtnStyle,
                      width: "auto",
                      color: "var(--danger)",
                      flex: "1 1 100px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      gap: "5px",
                    }}
                  >
                    <X size={13} style={{ flexShrink: 0 }} /> {t("cancelOrder")}
                  </button>
                  <button
                    onClick={() => onMarkPaid(o)}
                    style={{
                      ...primaryBtnStyle,
                      flex: "1 1 120px",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      padding: "6px 8px",
                      fontSize: "12px",
                    }}
                  >
                    <Check size={13} style={{ flexShrink: 0 }} />{" "}
                    {t("markPaid")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {undoTarget && (
        <ConfirmDialog
          title={t("undoPaid_confirmTitle")}
          message={t("undoPaid_confirmMsg")}
          confirmLabel={t("undoPaid")}
          danger
          onConfirm={() => {
            onUndoPaid(undoTarget);
            setUndoTarget(null);
          }}
          onCancel={() => setUndoTarget(null)}
        />
      )}
      {reasonTarget && (
        <OrderReasonModal
          order={reasonTarget.order}
          actionType={reasonTarget.actionType}
          onClose={() => setReasonTarget(null)}
          onConfirm={(reason) => {
            if (reasonTarget.actionType === "reject") {
              onReject(reasonTarget.order, reason);
            } else {
              onCancel(reasonTarget.order, reason);
            }
            setReasonTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={t("order_deleteConfirmTitle")}
          message={t("order_deleteConfirmMsg")}
          confirmLabel={t("archive_deletePermanent")}
          danger
          onConfirm={() => {
            onDeleteOrder(deleteTarget);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {deleteAllConfirm && (
        <ConfirmDialog
          title={t("order_deleteAllConfirmTitle", {
            count: archivedOrders.length,
          })}
          message={t("order_deleteAllConfirmMsg")}
          confirmLabel={t("archive_deleteAllPermanent")}
          danger
          onConfirm={() => {
            onDeleteAllArchived();
            setDeleteAllConfirm(false);
          }}
          onCancel={() => setDeleteAllConfirm(false)}
        />
      )}
    </div>
  );
}

// ================= Users (admin only) =================

// Single "⋮ Actions" button that opens a small floating menu (Edit /
// Enable-Disable / Delete) instead of separate icon buttons in the row —
// closes itself on an outside click, same pattern as the date-picker
// dropdown above.
function UserActionMenu({ t, disabled, onEdit, onToggle, onDelete }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  const menuItemStyle = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    background: "none",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
  };
  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={t("userActions")}
        style={{
          ...iconBtnStyle,
          background: open ? "var(--surface-alt)" : "none",
        }}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 55,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 12px 30px rgba(0,0,0,.16)",
            padding: "5px",
            minWidth: "170px",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            style={menuItemStyle}
          >
            <Pencil size={14} /> {t("editUser")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onToggle();
            }}
            style={menuItemStyle}
          >
            {disabled ? <Power size={14} /> : <Ban size={14} />}
            {disabled ? t("enableUser") : t("disableUser")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            style={{ ...menuItemStyle, color: "var(--danger)" }}
          >
            <Trash2 size={14} /> {t("deleteUser")}
          </button>
        </div>
      )}
    </div>
  );
}

function UsersTab({
  users,
  roles,
  currentUser,
  openAdd,
  openEdit,
  deleteUser,
  toggleUserActive,
  openAddRole,
  openEditRole,
  deleteRole,
  saveRolePermissions,
  isSuperAdmin,
}) {
  const { t, lang } = useT();
  const [subTab, setSubTab] = useState("list"); // "list" | "roles"
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [roleDeleteTarget, setRoleDeleteTarget] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const roleById = (id) => roles.find((r) => r.id === id);

  // Draft copy of the permissions matrix. Checkbox clicks only edit this
  // local copy — nothing reaches the app state or the cloud until the
  // admin presses "Save permissions". Re-synced from the real `roles`
  // whenever it changes from outside (a fresh cloud pull, a rename/add/
  // delete via the modal, or right after our own save completes) as long
  // as there's no unsaved edit in progress, so an incoming sync never
  // silently wipes out what the admin is mid-editing.
  const [draftRoles, setDraftRoles] = useState(roles);
  const [rolesDirty, setRolesDirty] = useState(false);
  useEffect(() => {
    if (!rolesDirty) {
      setDraftRoles(roles);
      return;
    }
    // A rename/add/delete came in from elsewhere (the role modal, or a
    // cloud sync) while permission checkboxes are still unsaved — adopt
    // the new role list but keep whatever tabs/shift-permissions are
    // currently checked in the draft for roles that still exist, instead
    // of discarding them.
    setDraftRoles((prevDraft) =>
      roles.map((r) => {
        const draftMatch = prevDraft.find((d) => d.id === r.id);
        return draftMatch
          ? {
              ...r,
              tabs: draftMatch.tabs,
              shiftEdit: draftMatch.shiftEdit,
              shiftDelete: draftMatch.shiftDelete,
            }
          : r;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  const toggleDraftTab = (roleId, tabId) => {
    setDraftRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId || (r.locked && !isSuperAdmin)) return r;
        const has = (r.tabs || []).includes(tabId);
        return {
          ...r,
          tabs: has ? r.tabs.filter((x) => x !== tabId) : [...r.tabs, tabId],
        };
      }),
    );
    setRolesDirty(true);
  };

  // Toggles one of the extra (non-tab) action permissions — `shiftEdit`,
  // `shiftDelete`, `refundSale` — the same way toggleDraftTab does for tab
  // visibility, including the same locked-role guard: only Super Admin can
  // change what the "admin" role itself gets here, but they CAN change it
  // (unlike tabs' "never lock everyone out" reasoning, there's no lockout
  // risk in restricting these). Takes the explicit next value (the
  // opposite of what's currently *displayed*, from the checkbox's own
  // `checked`) rather than flipping the raw stored value — `refundSale`
  // treats `undefined` as allowed (see canRefundSale), so a naive `!r[key]`
  // flip would turn "checked because undefined" into `true` on uncheck
  // instead of the intended `false`.
  const toggleDraftPermission = (roleId, key, nextValue) => {
    setDraftRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId || (r.locked && !isSuperAdmin)) return r;
        return { ...r, [key]: nextValue };
      }),
    );
    setRolesDirty(true);
  };

  const handleSavePermissions = () => {
    saveRolePermissions(draftRoles);
    setRolesDirty(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={subTab === "list" ? t("nav_users") : t("nav_users_sub_roles")}
        subtitle={
          subTab === "list"
            ? t("users_subtitle", { count: users.length })
            : t("roles_subtitle", { count: roles.length })
        }
        action={
          subTab === "list" ? (
            <button onClick={openAdd} style={primaryBtnStyle}>
              <UserPlus size={16} /> {t("addUser")}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {rolesDirty && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--danger)",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <AlertTriangle size={13} /> {t("rolePermissions_unsaved")}
                </span>
              )}
              <button
                onClick={handleSavePermissions}
                disabled={!rolesDirty}
                style={{
                  ...primaryBtnStyle,
                  opacity: rolesDirty ? 1 : 0.5,
                  cursor: rolesDirty ? "pointer" : "not-allowed",
                }}
              >
                <CheckCircle2 size={16} /> {t("saveRolePermissions")}
              </button>
              <button onClick={openAddRole} style={secondaryBtnStyle}>
                <Plus size={16} /> {t("addRole")}
              </button>
            </div>
          )
        }
      />
      <div style={{ padding: "12px 26px 0", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            gap: "20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {[
            { id: "list", label: t("nav_users_sub_list") },
            { id: "roles", label: t("nav_users_sub_roles") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                padding: "0 2px 10px",
                background: "none",
                border: "none",
                borderBottom:
                  subTab === tab.id
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                color:
                  subTab === tab.id ? "var(--primary)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {subTab === "list" ? (
        <div
          style={{
            padding: "16px 26px 26px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {users.map((u) => {
            const disabled = u.active === false;
            const role = roleById(u.role);
            const isExpanded = expandedUserId === u.id;
            const accessTabs = role
              ? NAV.filter((n) => roleTabIds(role).includes(n.id))
              : [];
            return (
              <div
                key={u.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface)",
                  opacity: disabled ? 0.65 : 1,
                  // no overflow:hidden here — the Action menu is an absolutely
                  // positioned dropdown anchored inside this card, and hidden
                  // overflow would clip it (cutting off "Delete") instead of
                  // just rounding the card's corners.
                }}
              >
                <div
                  onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                  className="list-card-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "13px 14px",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      flexShrink: 0,
                      borderRadius: "var(--radius-pill)",
                      background: "var(--surface-alt)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UserIcon size={17} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "7px",
                        fontSize: "14.5px",
                        fontWeight: 700,
                      }}
                    >
                      {lang === "en" ? u.name_en || u.name_km : u.name_km}
                      {u.id === currentUser.id && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--primary)",
                            fontWeight: 700,
                          }}
                        >
                          ({t("loggedInAs")})
                        </span>
                      )}
                      {disabled && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            background: "rgba(220,38,38,.12)",
                            color: "var(--danger)",
                          }}
                        >
                          {t("status_disabled")}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: "3px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12.5px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {u.username}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      flexShrink: 0,
                      background:
                        u.role === "admin"
                          ? "var(--primary)"
                          : "var(--surface-alt)",
                      color: u.role === "admin" ? "#fff" : "var(--text)",
                    }}
                  >
                    {role ? roleLabel(role, lang) : u.role}
                  </span>
                  <UserActionMenu
                    t={t}
                    disabled={disabled}
                    onEdit={() => openEdit(u)}
                    onToggle={() => setToggleTarget(u)}
                    onDelete={() => setDeleteTarget(u)}
                  />
                  <ChevronDown
                    size={15}
                    style={{
                      color: "var(--text-muted)",
                      flexShrink: 0,
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      transition: "transform .15s",
                    }}
                  />
                </div>
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 14px 14px 64px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {u.updatedAt && (
                      <div
                        style={{
                          fontSize: "12.5px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {t("userLastUpdated")}:{" "}
                        {new Date(u.updatedAt).toLocaleString(
                          lang === "en" ? "en-US" : "km-KH",
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {t("userRolePermissions")}:{" "}
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>
                        {accessTabs.length > 0
                          ? accessTabs.map((n) => t(n.key)).join(" · ")
                          : "—"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {users.length === 0 && (
            <EmptyState
              icon={UserCog}
              title={t("noUsersYet")}
              actionLabel={t("addUser")}
              onAction={openAdd}
            />
          )}
        </div>
      ) : (
        <div style={{ padding: "16px 26px 26px", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: `${360 + draftRoles.length * 150}px`,
              borderCollapse: "collapse",
              fontSize: "13.5px",
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  color: "var(--text-muted)",
                  fontSize: "12.5px",
                }}
              >
                <th style={{ ...thStyle, minWidth: "180px" }}>
                  {t("th_permission")}
                </th>
                {draftRoles.map((r) => (
                  <th
                    key={r.id}
                    style={{
                      ...thStyle,
                      textAlign: "center",
                      minWidth: "140px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{ color: "var(--text)", fontWeight: 700 }}
                        title={r.locked ? t("role_admin_locked_note") : ""}
                      >
                        {roleLabel(r, lang)}
                      </span>
                      {r.locked ? (
                        <Lock size={12} color="var(--text-muted)" />
                      ) : (
                        <>
                          <button
                            onClick={() => openEditRole(r)}
                            style={{ ...iconBtnStyle, padding: "3px" }}
                            title={t("editRoleTitle")}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setRoleDeleteTarget(r)}
                            style={{
                              ...iconBtnStyle,
                              padding: "3px",
                              color: "var(--danger)",
                            }}
                            title={t("roleDeleteConfirm")}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NAV.filter((n) => n.id !== "superAdmin").map((navItem) => (
                <tr
                  key={navItem.id}
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td style={tdStyle}>{t(navItem.key)}</td>
                  {draftRoles.map((r) => {
                    const checked = roleTabIds(r).includes(navItem.id);
                    return (
                      <td
                        key={r.id}
                        style={{ ...tdStyle, textAlign: "center" }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={r.locked && !isSuperAdmin}
                          onChange={() => toggleDraftTab(r.id, navItem.id)}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor:
                              r.locked && !isSuperAdmin
                                ? "not-allowed"
                                : "pointer",
                            accentColor: "var(--primary)",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Extra action-level permissions (not tied to tab visibility)
                  — currently editing/deleting closed shift records, and
                  refunding a completed sale from Reports. Only meaningful
                  once a role can see the relevant tab at all, but shown
                  for every role like the rows above, mirroring how a
                  premium-gated tab still shows here even before the
                  feature is turned on. */}
              {[
                {
                  key: "shiftEdit",
                  label: t("shift_editPermission"),
                  isChecked: (r) => !!r.shiftEdit,
                },
                {
                  key: "shiftDelete",
                  label: t("shift_deletePermission"),
                  isChecked: (r) => !!r.shiftDelete,
                },
                {
                  // refundSale predates this matrix row as an unrestricted
                  // feature (see canRefundSale in POSApp) — `undefined`
                  // means "not yet configured, so still allowed" here too,
                  // otherwise a shop upgrading would see this box unchecked
                  // while Refund still actually works, the exact mismatch
                  // already fixed once for the shift rows above.
                  key: "refundSale",
                  label: t("refund_permission"),
                  isChecked: (r) => r.refundSale !== false,
                },
                {
                  // Same reasoning as refundSale — deleting a customer
                  // already worked unrestricted for every role that could
                  // see Customers, so `undefined` still reads as allowed.
                  key: "customerDelete",
                  label: t("customerDelete_permission"),
                  isChecked: (r) => r.customerDelete !== false,
                },
              ].map((perm) => (
                <tr
                  key={perm.key}
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td style={tdStyle}>{perm.label}</td>
                  {draftRoles.map((r) => {
                    // Unlike tab visibility, this is NOT forced on for
                    // "admin" — it's a real, revocable permission like any
                    // other role's, just locked so only Super Admin can
                    // change what "admin" itself gets (same disabled rule
                    // as the tab rows above).
                    const checked = perm.isChecked(r);
                    const disabled = r.locked && !isSuperAdmin;
                    return (
                      <td
                        key={r.id}
                        style={{ ...tdStyle, textAlign: "center" }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() =>
                            toggleDraftPermission(r.id, perm.key, !checked)
                          }
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: disabled ? "not-allowed" : "pointer",
                            accentColor: "var(--primary)",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Lock size={12} /> {t("role_admin_locked_note")}
          </div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={t("user_deleteConfirm")}
          message={`${
            lang === "en"
              ? deleteTarget.name_en || deleteTarget.name_km
              : deleteTarget.name_km || deleteTarget.name_en
          } (${deleteTarget.username}) — ${t("confirmDialog_irreversible")}`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteUser(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
      {toggleTarget && (
        <ConfirmDialog
          title={
            toggleTarget.active === false
              ? t("user_enableConfirm")
              : t("user_disableConfirm")
          }
          message={`${
            lang === "en"
              ? toggleTarget.name_en || toggleTarget.name_km
              : toggleTarget.name_km || toggleTarget.name_en
          } (${toggleTarget.username})`}
          danger={toggleTarget.active !== false}
          confirmLabel={
            toggleTarget.active === false ? t("enableUser") : t("disableUser")
          }
          onCancel={() => setToggleTarget(null)}
          onConfirm={() => {
            toggleUserActive(toggleTarget.id);
            setToggleTarget(null);
          }}
        />
      )}
      {roleDeleteTarget && (
        <ConfirmDialog
          title={t("roleDeleteConfirm")}
          message={roleLabel(roleDeleteTarget, lang)}
          danger
          onCancel={() => setRoleDeleteTarget(null)}
          onConfirm={() => {
            deleteRole(roleDeleteTarget.id);
            setRoleDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function AuditLogTab({ auditLog }) {
  const { t, lang } = useT();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const actionMeta = {
    add: { color: "#16a34a", Icon: Plus },
    edit: { color: "var(--primary)", Icon: Pencil },
    delete: { color: "var(--danger)", Icon: Trash2 },
    refund: { color: "var(--danger)", Icon: RotateCcw },
    enable: { color: "#16a34a", Icon: Check },
    disable: { color: "var(--text-muted)", Icon: Ban },
    cancel: { color: "var(--danger)", Icon: XCircle },
    reject: { color: "var(--danger)", Icon: XCircle },
  };
  const availableActions = Array.from(
    new Set(auditLog.map((e) => e.action)),
  ).filter((a) => actionMeta[a]);

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "km-KH", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = auditLog.filter((entry) => {
    if (actionFilter !== "all" && entry.action !== actionFilter) return false;
    if (!q) return true;
    return (
      (entry.username || "").toLowerCase().includes(q) ||
      (entry.entity_label || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("nav_auditLog")}
        subtitle={t("auditLog_subtitle", { count: auditLog.length })}
      />
      <div style={{ padding: "16px 26px 0", display: "flex", gap: "12px" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("auditLog_searchPlaceholder")}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontSize: "14px",
            }}
          />
        </div>
      </div>
      {availableActions.length > 0 && (
        <div
          style={{
            padding: "12px 26px 0",
            display: "flex",
            gap: "7px",
            flexWrap: "wrap",
          }}
        >
          <CategoryPill
            active={actionFilter === "all"}
            onClick={() => setActionFilter("all")}
            label={t("cat_all")}
          />
          {availableActions.map((a) => (
            <CategoryPill
              key={a}
              active={actionFilter === a}
              onClick={() => setActionFilter(a)}
              label={t("audit_action_" + a)}
            />
          ))}
        </div>
      )}
      <div style={{ padding: "16px 26px 26px", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "560px",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: "var(--text-muted)",
                fontSize: "12.5px",
              }}
            >
              <th style={thStyle}>{t("auditLog_col_time")}</th>
              <th style={thStyle}>{t("auditLog_col_user")}</th>
              <th style={thStyle}>{t("auditLog_col_action")}</th>
              <th style={thStyle}>{t("auditLog_col_item")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const meta = actionMeta[entry.action] || {
                color: "var(--text-muted)",
                Icon: null,
              };
              const ActionIcon = meta.Icon;
              return (
                <tr
                  key={entry.id}
                  className="dash-row"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtTime(entry.created_at)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {entry.username || "—"}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 10px 3px 8px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: "#fff",
                        background: meta.color,
                      }}
                    >
                      {ActionIcon && <ActionIcon size={11} />}
                      {t("audit_action_" + entry.action)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {t("audit_entity_" + entry.entity_type)} —{" "}
                    {entry.entity_label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {auditLog.length > 0 && filtered.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "14px",
              textAlign: "center",
              padding: "34px 0",
            }}
          >
            {t("auditLog_noResults")}
          </div>
        )}
        {auditLog.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-muted)",
              fontSize: "14px",
              textAlign: "center",
              padding: "34px 0",
            }}
          >
            <History size={26} color="var(--border)" />
            {t("auditLog_empty")}
          </div>
        )}
      </div>
    </div>
  );
}

// ================= Settings =================

function SettingsTab({
  khrRate,
  setKhrRate,
  onSaveKhrRate,
  shopName,
  setShopName,
  shopLogo,
  setShopLogo,
  onSaveShopInfo,
  notifySoundOn,
  setNotifySoundOn,
  notifySoundId,
  setNotifySoundId,
  notifySoundCustom,
  setNotifySoundCustom,
  notifySoundCustomName,
  setNotifySoundCustomName,
  notifySoundDuration,
  setNotifySoundDuration,
  payCashEnabled,
  payKhqrEnabled,
  khqrImage,
  khqrDynamicEnabled,
  khqrAccountId,
  khqrMerchantName,
  khqrMerchantCity,
  khqrBankName,
  onSavePaymentSettings,
  receiptWidth,
  setReceiptWidth,
  currentUser,
  onResetSalesData,
  onResetStockQty,
  onDeleteAllProducts,
  features,
  isSuperAdmin,
}) {
  const { t } = useT();
  const khqrFeatureOn = isSuperAdmin || !!(features && features.khqr);
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const isAdmin = currentUser?.role === "admin";
  const SETTINGS_TABS = [
    { id: "general", label: t("settings_tab_general") },
    { id: "payment", label: t("settings_tab_payment") },
    { id: "currency", label: t("settings_tab_currency") },
    { id: "notifications", label: t("settings_tab_notifications") },
    { id: "printing", label: t("settings_tab_printing") },
    ...(isAdmin ? [{ id: "danger", label: t("settings_tab_danger") }] : []),
  ];
  const [draft, setDraft] = useState(String(khrRate));
  const [saved, setSaved] = useState(false);
  const [nameDraft, setNameDraft] = useState(shopName);
  const [logoDraft, setLogoDraft] = useState(shopLogo);
  const [shopSaved, setShopSaved] = useState(false);
  const fileRef = useRef(null);

  const [payCashDraft, setPayCashDraft] = useState(payCashEnabled);
  const [payKhqrDraft, setPayKhqrDraft] = useState(payKhqrEnabled);
  const [khqrImageDraft, setKhqrImageDraft] = useState(khqrImage);
  const [khqrDynamicDraft, setKhqrDynamicDraft] =
    useState(!!khqrDynamicEnabled);
  const [khqrAccountIdDraft, setKhqrAccountIdDraft] = useState(
    khqrAccountId || "",
  );
  const [khqrMerchantNameDraft, setKhqrMerchantNameDraft] = useState(
    khqrMerchantName || "",
  );
  const [khqrMerchantCityDraft, setKhqrMerchantCityDraft] = useState(
    khqrMerchantCity || "",
  );
  const [khqrBankNameDraft, setKhqrBankNameDraft] = useState(
    khqrBankName || "",
  );
  const [khqrError, setKhqrError] = useState("");
  const [paymentSaved, setPaymentSaved] = useState(false);
  const khqrFileRef = useRef(null);

  const [soundIdDraft, setSoundIdDraft] = useState(notifySoundId);
  const [soundOnDraft, setSoundOnDraft] = useState(notifySoundOn);
  const [soundDurationDraft, setSoundDurationDraft] = useState(
    String(notifySoundDuration),
  );
  const [soundCustomDraft, setSoundCustomDraft] = useState(notifySoundCustom);
  const [soundCustomNameDraft, setSoundCustomNameDraft] = useState(
    notifySoundCustomName,
  );
  const [soundSaved, setSoundSaved] = useState(false);
  const [soundUploadError, setSoundUploadError] = useState("");
  const soundFileRef = useRef(null);

  const [printWidthDraft, setPrintWidthDraft] = useState(receiptWidth);
  const [printSaved, setPrintSaved] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetStockConfirmOpen, setResetStockConfirmOpen] = useState(false);
  const [deleteProductsConfirmOpen, setDeleteProductsConfirmOpen] =
    useState(false);
  const savePrintSettings = () => {
    setReceiptWidth(printWidthDraft);
    setPrintSaved(true);
    setTimeout(() => setPrintSaved(false), 1800);
  };

  useEffect(() => {
    setSoundIdDraft(notifySoundId);
    setSoundOnDraft(notifySoundOn);
    setSoundDurationDraft(String(notifySoundDuration));
    setSoundCustomDraft(notifySoundCustom);
    setSoundCustomNameDraft(notifySoundCustomName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSoundFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSoundUploadError("");
    // Keep custom sounds small — they're stored as a data URL in
    // localStorage, which typically caps out around 5MB per origin.
    if (file.size > 1024 * 1024) {
      setSoundUploadError(t("settings_soundTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSoundCustomDraft(reader.result);
      setSoundCustomNameDraft(file.name);
      setSoundIdDraft("custom");
    };
    reader.readAsDataURL(file);
  };

  const removeSoundFile = () => {
    setSoundCustomDraft("");
    setSoundCustomNameDraft("");
    if (soundIdDraft === "custom") setSoundIdDraft(DEFAULT_SOUND_ID);
    if (soundFileRef.current) soundFileRef.current.value = "";
  };

  const testSound = () => {
    playNotifySound({
      soundId: soundIdDraft,
      customUrl: soundCustomDraft,
      durationSec: Math.min(Number(soundDurationDraft) || 0, 5),
    });
  };

  const saveSoundSettings = () => {
    setNotifySoundOn(soundOnDraft);
    setNotifySoundId(soundIdDraft);
    setNotifySoundCustom(soundCustomDraft);
    setNotifySoundCustomName(soundCustomNameDraft);
    setNotifySoundDuration(Math.max(0, Number(soundDurationDraft) || 0));
    setSoundSaved(true);
    setTimeout(() => setSoundSaved(false), 1800);
  };

  useEffect(() => {
    setDraft(String(khrRate));
  }, [khrRate]);

  useEffect(() => {
    setNameDraft(shopName);
    setLogoDraft(shopLogo);
  }, [shopName, shopLogo]);

  const save = () => {
    const n = Number(draft);
    if (!n || n <= 0) return;
    setKhrRate(n);
    onSaveKhrRate(n);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeImage(file, 240, 0.8);
    setLogoDraft(dataUrl);
  };

  const saveShopInfo = () => {
    setShopName(nameDraft);
    setShopLogo(logoDraft);
    if (onSaveShopInfo) onSaveShopInfo(nameDraft, logoDraft);
    setShopSaved(true);
    setTimeout(() => setShopSaved(false), 1800);
  };

  const handleKhqrFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setKhqrError("");
    if (file.size > 1024 * 1024) {
      setKhqrError(t("settings_khqrTooLarge"));
      return;
    }
    const dataUrl = await resizeQrImage(file, 640);
    setKhqrImageDraft(dataUrl);
  };
  const removeKhqrImage = () => {
    setKhqrImageDraft("");
    if (payKhqrDraft && !khqrDynamicDraft) setPayKhqrDraft(false);
    if (khqrFileRef.current) khqrFileRef.current.value = "";
  };
  const khqrDynamicComplete =
    khqrDynamicDraft &&
    khqrAccountIdDraft &&
    khqrMerchantNameDraft &&
    khqrMerchantCityDraft;
  const toggleKhqr = () => {
    if (!khqrFeatureOn) return;
    if (!payKhqrDraft && !khqrImageDraft && !khqrDynamicComplete) {
      setKhqrError(t("settings_khqrNeedsImageWarning"));
      return;
    }
    setKhqrError("");
    setPayKhqrDraft(!payKhqrDraft);
  };
  const savePaymentSettings = () => {
    if (onSavePaymentSettings)
      onSavePaymentSettings(
        payCashDraft,
        payKhqrDraft,
        khqrImageDraft,
        khqrDynamicDraft,
        khqrAccountIdDraft,
        khqrMerchantNameDraft,
        khqrMerchantCityDraft,
        khqrBankNameDraft,
      );
    setPaymentSaved(true);
    setTimeout(() => setPaymentSaved(false), 1800);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar title={t("nav_settings")} subtitle={t("settings_subtitle")} />
      <div style={{ padding: "16px 26px 26px" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 18px",
              borderBottom: "1px solid var(--border)",
              overflowX: "auto",
            }}
          >
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom:
                    activeSettingsTab === tab.id
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                  padding: "14px 6px",
                  margin: "0 8px",
                  fontSize: "13.5px",
                  fontFamily: "var(--font-body)",
                  fontWeight: activeSettingsTab === tab.id ? 700 : 600,
                  color:
                    activeSettingsTab === tab.id
                      ? "var(--primary)"
                      : "var(--text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px" }}>
            {activeSettingsTab === "general" && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                  }}
                >
                  {t("settings_shopTitle")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "14px",
                  }}
                >
                  {t("settings_shopSubtitle")}
                </div>

                <label style={fieldLabel}>{t("settings_shopLogoLabel")}</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                      background: "var(--surface-alt)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {logoDraft ? (
                      <img
                        src={logoDraft}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <ImageOff size={24} color="var(--text-muted)" />
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFile}
                      style={{ display: "none" }}
                    />
                    <button
                      onClick={() => fileRef.current.click()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <ImagePlus size={14} />{" "}
                      {logoDraft ? t("changeLogo") : t("uploadLogo")}
                    </button>
                    {logoDraft && (
                      <button
                        onClick={() => setLogoDraft(null)}
                        style={{
                          fontSize: "12px",
                          color: "var(--danger)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: 0,
                        }}
                      >
                        {t("removeLogo")}
                      </button>
                    )}
                  </div>
                </div>

                <label style={fieldLabel}>{t("settings_shopNameLabel")}</label>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder={t("shopNameDefault")}
                  style={{ ...fieldInput, marginBottom: "6px" }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    onClick={saveShopInfo}
                    style={{
                      ...primaryBtnStyle,
                      padding: "8px 16px",
                      fontSize: "13px",
                    }}
                  >
                    {t("settings_saveBtn")}
                  </button>
                  {shopSaved && (
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "var(--primary)",
                        fontWeight: 600,
                      }}
                    >
                      {t("settings_shopSaved")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === "payment" && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                  }}
                >
                  {t("settings_paymentTitle")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "16px",
                  }}
                >
                  {t("settings_paymentSubtitle")}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
                    {t("settings_payCashLabel")}
                  </span>
                  <ToggleSwitch
                    on={payCashDraft}
                    onClick={() => setPayCashDraft(!payCashDraft)}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {t("settings_payKhqrLabel")}
                    {!khqrFeatureOn && <Lock size={12} />}
                  </span>
                  <ToggleSwitch
                    on={payKhqrDraft}
                    onClick={toggleKhqr}
                    disabled={!khqrFeatureOn}
                  />
                </div>
                {!khqrFeatureOn && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      margin: "6px 0 4px",
                    }}
                  >
                    {t("settings_khqrLocked")}
                  </div>
                )}

                <label
                  style={{
                    ...fieldLabel,
                    marginTop: "6px",
                    opacity: khqrFeatureOn ? 1 : 0.5,
                  }}
                >
                  {t("settings_khqrImageLabel")}
                </label>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "10px",
                  }}
                >
                  {t("settings_khqrImageHint")}
                </div>
                <div
                  style={{ display: "flex", gap: "14px", alignItems: "center" }}
                >
                  <div
                    style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {khqrImageDraft ? (
                      <img
                        src={khqrImageDraft}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <ImageOff size={22} color="var(--text-muted)" />
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <input
                      ref={khqrFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleKhqrFile}
                      style={{ display: "none" }}
                    />
                    <button
                      onClick={() => khqrFileRef.current.click()}
                      disabled={!khqrFeatureOn}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: khqrFeatureOn ? "pointer" : "not-allowed",
                        opacity: khqrFeatureOn ? 1 : 0.5,
                      }}
                    >
                      <ImagePlus size={14} />{" "}
                      {khqrImageDraft
                        ? t("changeKhqrImage")
                        : t("uploadKhqrImage")}
                    </button>
                    {khqrImageDraft && (
                      <button
                        onClick={removeKhqrImage}
                        style={{
                          fontSize: "12px",
                          color: "var(--danger)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: 0,
                        }}
                      >
                        {t("removeKhqrImage")}
                      </button>
                    )}
                  </div>
                </div>
                {khqrError && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--danger)",
                      marginTop: "10px",
                    }}
                  >
                    {khqrError}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "18px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--border)",
                    opacity: khqrFeatureOn ? 1 : 0.5,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
                      {t("settings_khqrDynamicLabel")}
                    </span>
                    <ToggleSwitch
                      on={khqrDynamicDraft}
                      onClick={() =>
                        khqrFeatureOn && setKhqrDynamicDraft(!khqrDynamicDraft)
                      }
                      disabled={!khqrFeatureOn}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginBottom: "12px",
                    }}
                  >
                    {t("settings_khqrDynamicHint")}
                  </div>
                  {khqrDynamicDraft && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={fieldLabel}>
                          {t("settings_khqrAccountIdLabel")}
                        </label>
                        <input
                          type="text"
                          value={khqrAccountIdDraft}
                          onChange={(e) =>
                            setKhqrAccountIdDraft(e.target.value.trim())
                          }
                          placeholder="name@bank"
                          disabled={!khqrFeatureOn}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "13px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={fieldLabel}>
                          {t("settings_khqrMerchantNameLabel")}
                        </label>
                        <input
                          type="text"
                          value={khqrMerchantNameDraft}
                          onChange={(e) =>
                            setKhqrMerchantNameDraft(e.target.value)
                          }
                          disabled={!khqrFeatureOn}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border)",
                            fontSize: "13px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={fieldLabel}>
                          {t("settings_khqrMerchantCityLabel")}
                        </label>
                        <input
                          type="text"
                          value={khqrMerchantCityDraft}
                          onChange={(e) =>
                            setKhqrMerchantCityDraft(e.target.value)
                          }
                          disabled={!khqrFeatureOn}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border)",
                            fontSize: "13px",
                          }}
                        />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={fieldLabel}>
                          {t("settings_khqrBankNameLabel")}{" "}
                          <span style={{ fontWeight: 400, opacity: 0.7 }}>
                            ({t("optional")})
                          </span>
                        </label>
                        <input
                          type="text"
                          value={khqrBankNameDraft}
                          onChange={(e) => setKhqrBankNameDraft(e.target.value)}
                          disabled={!khqrFeatureOn}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border)",
                            fontSize: "13px",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "16px",
                  }}
                >
                  <button
                    onClick={savePaymentSettings}
                    style={{
                      ...primaryBtnStyle,
                      padding: "8px 16px",
                      fontSize: "13px",
                    }}
                  >
                    {t("settings_saveBtn")}
                  </button>
                  {paymentSaved && (
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "var(--primary)",
                        fontWeight: 600,
                      }}
                    >
                      {t("settings_paymentSaved")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === "currency" && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                  }}
                >
                  {t("settings_khrTitle")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "14px",
                  }}
                >
                  {t("settings_khrSubtitle")}
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    1$ =
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    style={{
                      width: "120px",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>៛</span>
                  <button
                    onClick={save}
                    style={{
                      ...primaryBtnStyle,
                      padding: "8px 16px",
                      fontSize: "13px",
                    }}
                  >
                    {t("settings_saveBtn")}
                  </button>
                </div>
                {saved && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "12.5px",
                      color: "var(--primary)",
                      fontWeight: 600,
                    }}
                  >
                    {t("settings_saved")}
                  </div>
                )}
                <div
                  style={{
                    marginTop: "14px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  {t("settings_khrPreview", {
                    amount: fmtKhr(1, Number(draft) || khrRate),
                  })}
                </div>
              </div>
            )}

            {activeSettingsTab === "notifications" && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                  }}
                >
                  {t("settings_soundTitle")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "14px",
                  }}
                >
                  {t("settings_soundSubtitle")}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <label style={{ ...fieldLabel, marginBottom: 0 }}>
                    {t("settings_soundEnableLabel")}
                  </label>
                  <button
                    onClick={() => setSoundOnDraft(!soundOnDraft)}
                    style={{
                      ...iconBtnStyle,
                      color: soundOnDraft
                        ? "var(--primary)"
                        : "var(--text-muted)",
                    }}
                    title={
                      soundOnDraft ? t("notifySound_on") : t("notifySound_off")
                    }
                  >
                    {soundOnDraft ? <Bell size={15} /> : <BellOff size={15} />}
                  </button>
                </div>

                <label style={fieldLabel}>
                  {t("settings_soundPresetLabel")}
                </label>
                <select
                  value={soundIdDraft}
                  onChange={(e) => setSoundIdDraft(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "13.5px",
                    background: "var(--surface-alt)",
                    marginBottom: "12px",
                  }}
                >
                  {SOUND_PRESET_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t("sound_" + key)}
                    </option>
                  ))}
                  <option value="custom" disabled={!soundCustomDraft}>
                    {t("sound_custom")}
                  </option>
                </select>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "4px",
                  }}
                >
                  <input
                    ref={soundFileRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleSoundFile}
                    style={{ display: "none" }}
                  />
                  <button
                    onClick={() => soundFileRef.current.click()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <ImagePlus size={14} />{" "}
                    {soundCustomDraft
                      ? t("settings_soundChange")
                      : t("settings_soundUpload")}
                  </button>
                  {soundCustomDraft && (
                    <button
                      onClick={removeSoundFile}
                      style={{
                        fontSize: "12px",
                        color: "var(--danger)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {t("settings_soundRemove")}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  {soundCustomNameDraft || t("settings_soundNoFile")}
                </div>
                {soundUploadError && (
                  <div
                    style={{
                      color: "var(--danger)",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    {soundUploadError}
                  </div>
                )}

                <label style={{ ...fieldLabel, marginTop: "10px" }}>
                  {t("settings_soundDurationLabel")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={soundDurationDraft}
                  onChange={(e) => setSoundDurationDraft(e.target.value)}
                  style={{ ...fieldInput, width: "140px", marginBottom: "4px" }}
                />
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    marginTop: "-8px",
                    marginBottom: "14px",
                  }}
                >
                  {t("settings_soundDurationHint")}
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <button
                    onClick={saveSoundSettings}
                    style={{
                      ...primaryBtnStyle,
                      padding: "8px 16px",
                      fontSize: "13px",
                    }}
                  >
                    {t("settings_saveBtn")}
                  </button>
                  <button
                    onClick={testSound}
                    style={{
                      ...secondaryBtnStyle,
                      padding: "8px 16px",
                      fontSize: "13px",
                    }}
                  >
                    {t("settings_soundTest")}
                  </button>
                  {soundSaved && (
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "var(--primary)",
                        fontWeight: 600,
                      }}
                    >
                      {t("settings_soundSaved")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === "printing" && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                  }}
                >
                  {t("settings_printTitle")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "16px",
                  }}
                >
                  {t("settings_printSubtitle")}
                </div>

                <div
                  style={{ display: "flex", gap: "10px", marginBottom: "6px" }}
                >
                  {[
                    { id: "58mm", label: t("settings_printWidth58") },
                    { id: "80mm", label: t("settings_printWidth80") },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPrintWidthDraft(opt.id)}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        padding: "14px 10px",
                        borderRadius: "var(--radius-md)",
                        border:
                          printWidthDraft === opt.id
                            ? "2px solid var(--primary)"
                            : "1px solid var(--border)",
                        background:
                          printWidthDraft === opt.id
                            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                            : "var(--surface)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: opt.id === "58mm" ? "34px" : "46px",
                          height: "54px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          background: "var(--surface-alt)",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: "6px",
                            right: "6px",
                            height: "2px",
                            background: "var(--text-muted)",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "14px",
                            left: "6px",
                            right: "6px",
                            height: "2px",
                            background: "var(--text-muted)",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "20px",
                            left: "6px",
                            right: "6px",
                            height: "2px",
                            background: "var(--text-muted)",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 600,
                          color:
                            printWidthDraft === opt.id
                              ? "var(--primary)"
                              : "var(--text)",
                        }}
                      >
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "12px",
                  }}
                >
                  <button
                    onClick={savePrintSettings}
                    style={{
                      ...primaryBtnStyle,
                      padding: "8px 16px",
                      fontSize: "13px",
                    }}
                  >
                    {t("settings_saveBtn")}
                  </button>
                  {printSaved && (
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "var(--primary)",
                        fontWeight: 600,
                      }}
                    >
                      {t("settings_printSaved")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === "danger" && isAdmin && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                    color: "var(--danger)",
                  }}
                >
                  {t("settings_resetSalesData")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "16px",
                    maxWidth: "440px",
                    lineHeight: 1.5,
                  }}
                >
                  {t("settings_resetSalesDataDesc")}
                </div>
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  style={{
                    ...primaryBtnStyle,
                    padding: "8px 16px",
                    fontSize: "13px",
                    background: "var(--danger)",
                  }}
                >
                  <Trash2 size={15} /> {t("settings_resetSalesData")}
                </button>
                {resetConfirmOpen && (
                  <ConfirmDialog
                    title={t("settings_resetSalesData")}
                    message={t("settings_resetSalesDataConfirm")}
                    confirmLabel={t("settings_resetSalesData")}
                    onConfirm={() => {
                      setResetConfirmOpen(false);
                      onResetSalesData && onResetSalesData();
                    }}
                    onCancel={() => setResetConfirmOpen(false)}
                  />
                )}

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    margin: "22px 0 18px",
                  }}
                />

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                    color: "var(--danger)",
                  }}
                >
                  {t("settings_resetStockQty")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "16px",
                    maxWidth: "440px",
                    lineHeight: 1.5,
                  }}
                >
                  {t("settings_resetStockQtyDesc")}
                </div>
                <button
                  onClick={() => setResetStockConfirmOpen(true)}
                  style={{
                    ...primaryBtnStyle,
                    padding: "8px 16px",
                    fontSize: "13px",
                    background: "var(--danger)",
                  }}
                >
                  <Trash2 size={15} /> {t("settings_resetStockQty")}
                </button>
                {resetStockConfirmOpen && (
                  <ConfirmDialog
                    title={t("settings_resetStockQty")}
                    message={t("settings_resetStockQtyConfirm")}
                    confirmLabel={t("settings_resetStockQty")}
                    onConfirm={() => {
                      setResetStockConfirmOpen(false);
                      onResetStockQty && onResetStockQty();
                    }}
                    onCancel={() => setResetStockConfirmOpen(false)}
                  />
                )}

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    margin: "22px 0 18px",
                  }}
                />

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14.5px",
                    marginBottom: "4px",
                    color: "var(--danger)",
                  }}
                >
                  {t("settings_deleteAllProducts")}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    marginBottom: "16px",
                    maxWidth: "440px",
                    lineHeight: 1.5,
                  }}
                >
                  {t("settings_deleteAllProductsDesc")}
                </div>
                <button
                  onClick={() => setDeleteProductsConfirmOpen(true)}
                  style={{
                    ...primaryBtnStyle,
                    padding: "8px 16px",
                    fontSize: "13px",
                    background: "var(--danger)",
                  }}
                >
                  <Trash2 size={15} /> {t("settings_deleteAllProducts")}
                </button>
                {deleteProductsConfirmOpen && (
                  <ConfirmDialog
                    title={t("settings_deleteAllProducts")}
                    message={t("settings_deleteAllProductsConfirm")}
                    confirmLabel={t("settings_deleteAllProducts")}
                    onConfirm={() => {
                      setDeleteProductsConfirmOpen(false);
                      onDeleteAllProducts && onDeleteAllProducts();
                    }}
                    onCancel={() => setDeleteProductsConfirmOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= Modals =================

// Loads the html5-qrcode library from a CDN the first time a camera scan is
// requested, so most installs never pay for it. Cached across calls.
let html5QrcodeLoadPromise = null;
const loadHtml5Qrcode = () => {
  if (window.Html5Qrcode) return Promise.resolve();
  if (html5QrcodeLoadPromise) return html5QrcodeLoadPromise;
  html5QrcodeLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = () => resolve();
    script.onerror = () => {
      html5QrcodeLoadPromise = null;
      reject(new Error("failed to load html5-qrcode"));
    };
    document.head.appendChild(script);
  });
  return html5QrcodeLoadPromise;
};

// Renders a payload string (e.g. a dynamic KHQR string) as a scannable QR
// code, computed entirely in-browser (see makeQrMatrix near buildDynamicKhqr
// above) — no CDN script, no network request, so it can't be blocked by a
// flaky connection or a strict Content-Security-Policy the way a
// script-injected library could be.
function DynamicQrImage({ payload, size = 150 }) {
  const { matrix, error } = useMemo(() => {
    if (!payload) return { matrix: null, error: false };
    try {
      return { matrix: makeQrMatrix(payload), error: false };
    } catch {
      return { matrix: null, error: true };
    }
  }, [payload]);
  if (error || !matrix) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          color: error ? "var(--danger)" : "var(--text-muted)",
          textAlign: "center",
          padding: "8px",
        }}
      >
        {error ? "Couldn't generate QR" : "…"}
      </div>
    );
  }
  const modules = matrix.length;
  const quiet = 2; // quiet-zone modules of white border, per QR spec minimum
  const view = modules + quiet * 2;
  let rects = "";
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1"/>`;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" shape-rendering="crispEdges"><rect width="${view}" height="${view}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#fff",
        borderRadius: "var(--radius-sm)",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Short "beep" on successful scan, synthesized with the Web Audio API so no
// sound file needs to be bundled/loaded. Mirrors the single high-pitched
// beep of a dedicated barcode scanner.
//
// iOS Safari keeps a freshly-created AudioContext in a "suspended" state
// (silent) unless resume() is called directly inside a user tap — creating
// it later, e.g. from the camera's detection callback, is too far removed
// from the tap to count, so the tone silently does nothing. The fix is to
// create one shared context and unlock it right when the user taps the
// camera/scan button, then just reuse that same context to actually play
// the beep once a barcode is found.
let sharedAudioCtx = null;
const unlockBeepAudio = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  } catch {
    /* audio not available — scanning still works fine without the beep */
  }
};
const playBeep = () => {
  try {
    const ctx = sharedAudioCtx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1800;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    /* audio not available — silent fallback, still detects fine */
  }
};

// Camera-based barcode scanner — used both from the POS search bar and the
// product form. Opens the device camera, decodes the first barcode/QR it
// sees, and hands the raw text back via onDetected.
function BarcodeScanModal({ onClose, onDetected }) {
  const { t } = useT();
  const [status, setStatus] = useState("loading"); // loading | scanning | error
  const elementId = "barcode-scan-region";

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let instance = null;
    let stopped = false;
    // html5-qrcode throws synchronously if you call stop() on a scanner
    // that's already stopped/never started — guard against calling it twice
    // (once on successful detection, once on unmount) and against a
    // synchronous throw crashing the whole React tree during cleanup.
    const safeStop = () => {
      if (stopped || !instance) return Promise.resolve();
      stopped = true;
      try {
        return instance.stop().catch(() => {});
      } catch {
        return Promise.resolve();
      }
    };
    loadHtml5Qrcode()
      .then(() => {
        if (cancelled) return Promise.reject(new Error("cancelled"));
        // Restrict to the formats retail barcodes actually use (plus QR, in
        // case a supplier label uses one) — fewer formats to try per frame
        // means faster, more reliable detection than the library's default
        // "try everything" behaviour. useBarCodeDetectorIfSupported taps the
        // browser's native scanner on Chrome/Android when available.
        const F = window.Html5QrcodeSupportedFormats;
        instance = new window.Html5Qrcode(elementId, {
          formatsToSupport: F
            ? [
                F.EAN_13,
                F.EAN_8,
                F.UPC_A,
                F.UPC_E,
                F.CODE_128,
                F.CODE_39,
                F.ITF,
                F.QR_CODE,
              ]
            : undefined,
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        return instance.start(
          // Keep this to exactly what's proven to work on your devices —
          // adding width/height resolution hints here caused getUserMedia
          // to fail outright on iOS Safari (both with and without a
          // fallback retry), so it's not worth the risk for a speed gain.
          { facingMode: "environment" },
          {
            fps: 20,
            // A fixed pixel qrbox (e.g. {width:280,height:140}) can exceed
            // the actual camera frame on some phones — when that happens
            // html5-qrcode silently scans the *entire* frame instead of a
            // tight crop, which is slower and more error-prone. Computing
            // the box from the live viewfinder size keeps it valid on
            // every screen and keeps detection fast.
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const boxWidth = Math.floor(minEdge * 0.8);
              return { width: boxWidth, height: Math.floor(boxWidth * 0.5) };
            },
            // By default the library also decodes a horizontally-flipped
            // copy of every frame, since a *front* (selfie) camera mirrors
            // the image. This scanner only ever uses the back camera
            // (facingMode: "environment"), which is never mirrored, so that
            // second decode pass is pure wasted work on every single frame
            // — turning it off roughly halves the per-frame decode cost.
            disableFlip: true,
          },
          (decodedText) => {
            if (cancelled) return;
            cancelled = true;
            playBeep();
            safeStop().finally(() => onDetected(decodedText));
          },
          () => {
            /* per-frame decode miss — ignore, keep scanning */
          },
        );
      })
      .then(() => {
        if (!cancelled) setStatus("scanning");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      safeStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,30,27,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-xl)",
          width: "380px",
          maxWidth: "100%",
          padding: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "15px" }}>
            {t("scan_modalTitle")}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--text-muted)",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div
          id={elementId}
          style={{
            width: "100%",
            minHeight: "220px",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "#000",
          }}
        />
        <div
          style={{
            marginTop: "10px",
            fontSize: "12.5px",
            color: status === "error" ? "var(--danger)" : "var(--text-muted)",
            textAlign: "center",
          }}
        >
          {status === "loading" && t("scan_loadingLib")}
          {status === "scanning" && t("scan_instructions")}
          {status === "error" && t("scan_cameraError")}
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, children, width = "380px" }) {
  // Esc closes the modal, matching standard dialog behavior.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,30,27,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "16px",
      }}
    >
      <div
        // Stop the click from bubbling to the backdrop above, so clicking
        // inside the modal never closes it.
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-xl)",
          width,
          maxWidth: "100%",
          maxHeight: "88%",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            {title}
          </span>
          <button onClick={onClose} style={{ ...iconBtnStyle, border: "none" }}>
            <X size={17} />
          </button>
        </div>
        <div style={{ padding: "18px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

// A polished replacement for window.confirm() — used before any destructive
// action (delete expense, delete category, etc). Renders on top of any other
// modal (higher z-index) so it can confirm deletions that happen inside a
// ModalShell too.
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  onConfirm,
  onCancel,
}) {
  const { t } = useT();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,30,27,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: "16px",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-xl)",
          width: "360px",
          maxWidth: "100%",
          boxShadow: "0 20px 50px rgba(0,0,0,.3)",
          padding: "24px 22px 18px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            background: danger
              ? "rgba(220,38,38,.12)"
              : "color-mix(in srgb, var(--primary) 15%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <AlertTriangle
            size={22}
            color={danger ? "var(--danger)" : "var(--primary)"}
          />
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "16px",
            marginBottom: "6px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginBottom: "20px",
            lineHeight: 1.5,
          }}
        >
          {message || t("confirmDialog_irreversible")}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{ ...secondaryBtnStyle, flex: 1, justifyContent: "center" }}
          >
            {cancelLabel || t("confirmCancel")}
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...primaryBtnStyle,
              flex: 1,
              justifyContent: "center",
              background: danger ? "var(--danger)" : "var(--primary)",
            }}
          >
            {confirmLabel || t("confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldLabel = {
  fontSize: "12.5px",
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: "5px",
  display: "block",
};
const fieldInput = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  fontSize: "14px",
  marginBottom: "14px",
};

function ProductModal({ data, onClose, onSave }) {
  const { t, catLabel, categories } = useT();
  const editing = data.mode === "edit";
  const p = editing
    ? data.product
    : {
        name_km: "",
        name_en: "",
        category: categories[0] ? categories[0].key : "",
        price: "",
        cost: "",
        stock: "",
        unit_km: "",
        unit_en: "",
        image: null,
        barcode: "",
      };
  const [form, setForm] = useState(p);
  const [scanOpen, setScanOpen] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setForm({ ...form, image: dataUrl });
  };

  return (
    <ModalShell
      title={editing ? t("editProduct") : t("addProductTitle")}
      onClose={onClose}
    >
      <label style={fieldLabel}>{t("fieldPhoto")}</label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--surface-alt)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {form.image ? (
            <img
              src={form.image}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <ImageOff size={24} color="var(--text-muted)" />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileRef.current.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ImagePlus size={14} />{" "}
            {form.image ? t("changePhoto") : t("uploadPhoto")}
          </button>
          {form.image && (
            <button
              onClick={() => setForm({ ...form, image: null })}
              style={{
                fontSize: "12px",
                color: "var(--danger)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
              }}
            >
              {t("removePhoto")}
            </button>
          )}
        </div>
      </div>

      <label style={fieldLabel}>{t("fieldName")} (ខ្មែរ)</label>
      <input
        style={fieldInput}
        value={form.name_km}
        onChange={(e) => setForm({ ...form, name_km: e.target.value })}
        placeholder={t("fieldNamePlaceholder")}
      />
      <label style={fieldLabel}>{t("fieldName")} (English)</label>
      <input
        style={fieldInput}
        value={form.name_en || ""}
        onChange={(e) => setForm({ ...form, name_en: e.target.value })}
        placeholder="e.g. Water 500ml"
      />

      <label style={fieldLabel}>{t("fieldCategory")}</label>
      <select
        style={fieldInput}
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      >
        {categories.map((cat) => (
          <option key={cat.key} value={cat.key}>
            {catLabel(cat.key)}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>{t("fieldPrice")}</label>
          <input
            style={fieldInput}
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>{t("fieldCost")}</label>
          <input
            style={fieldInput}
            type="number"
            min="0"
            step="0.01"
            value={form.cost || ""}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>{t("fieldStock")}</label>
          <input
            style={fieldInput}
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>{t("fieldUnit")} (ខ្មែរ)</label>
          <input
            style={fieldInput}
            value={form.unit_km}
            onChange={(e) => setForm({ ...form, unit_km: e.target.value })}
            placeholder={t("fieldUnitPlaceholder")}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>{t("fieldUnit")} (English)</label>
          <input
            style={fieldInput}
            value={form.unit_en || ""}
            onChange={(e) => setForm({ ...form, unit_en: e.target.value })}
            placeholder="e.g. bottle"
          />
        </div>
      </div>

      <label style={fieldLabel}>{t("fieldBarcode")}</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <input
          style={{ ...fieldInput, marginBottom: 0, flex: 1 }}
          value={form.barcode || ""}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          placeholder={t("fieldBarcodePlaceholder")}
        />
        <button
          type="button"
          onClick={() => {
            unlockBeepAudio();
            setScanOpen(true);
          }}
          title={t("scanBarcode")}
          style={{
            width: "42px",
            height: "42px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            cursor: "pointer",
            color: "var(--text-muted)",
          }}
        >
          <Camera size={16} />
        </button>
      </div>

      <button
        onClick={() => onSave(form)}
        style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center" }}
      >
        {t("save")}
      </button>
      {scanOpen && (
        <BarcodeScanModal
          onClose={() => setScanOpen(false)}
          onDetected={(code) => {
            setScanOpen(false);
            setForm({ ...form, barcode: code });
          }}
        />
      )}
    </ModalShell>
  );
}

function CustomerModal({ data, onClose, onSave }) {
  const { t } = useT();
  const editing = data.mode === "edit";
  const c = editing
    ? data.customer
    : { name: "", phone: "", discount_percent: 0 };
  const [form, setForm] = useState(c);

  return (
    <ModalShell
      title={editing ? t("editCustomer") : t("addCustomerTitle")}
      onClose={onClose}
    >
      <label style={fieldLabel}>{t("fieldCustomerName")}</label>
      <input
        style={fieldInput}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <label style={fieldLabel}>{t("fieldPhone")}</label>
      <input
        style={fieldInput}
        value={form.phone || ""}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        placeholder="0xx xxx xxx"
      />
      <label style={fieldLabel}>{t("fieldDiscountPercent")}</label>
      <input
        type="number"
        min="0"
        max="100"
        style={fieldInput}
        value={form.discount_percent ?? 0}
        onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
        placeholder="0"
      />
      <button
        onClick={() => onSave(form)}
        style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center" }}
      >
        {t("save")}
      </button>
    </ModalShell>
  );
}

// Lightweight themed date picker — replaces the native <input type="date">
// so the calendar popup matches the app's own look instead of the
// browser/OS default one.
function DateField({ value, onChange, style }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() =>
    (value ? new Date(value + "T00:00:00") : new Date()).getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(() =>
    (value ? new Date(value + "T00:00:00") : new Date()).getMonth(),
  );
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const d = value ? new Date(value + "T00:00:00") : new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toISO = (y, m, day) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const displayLabel = value
    ? new Date(value + "T00:00:00").toLocaleDateString(
        lang === "en" ? "en-US" : "km-KH",
        { year: "numeric", month: "short", day: "numeric" },
      )
    : t("datePicker_select");

  const weekdayLabels = WEEKDAY_LABELS[lang] || WEEKDAY_LABELS.en;
  const monthLabels = MONTH_LABELS[lang] || MONTH_LABELS.en;

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = new Date().toISOString().slice(0, 10);

  const goMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...fieldInput,
          marginBottom: 0,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          background: "var(--surface)",
          color: value ? "var(--text)" : "var(--text-muted)",
        }}
      >
        {displayLabel}
        <ChevronDown
          size={14}
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s ease",
            flexShrink: 0,
          }}
        />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 55,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 12px 30px rgba(0,0,0,.16)",
            padding: "14px",
            width: "260px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => goMonth(-1)}
              style={iconBtnStyle}
            >
              <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} />
            </button>
            <span style={{ fontWeight: 700, fontSize: "13.5px" }}>
              {monthLabels[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              style={iconBtnStyle}
            >
              <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
              marginBottom: "4px",
            }}
          >
            {weekdayLabels.map((w, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  fontSize: "10.5px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  padding: "2px 0",
                }}
              >
                {w}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
            }}
          >
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const iso = toISO(viewYear, viewMonth, day);
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    cursor: "pointer",
                    background: isSelected ? "var(--primary)" : "transparent",
                    color: isSelected
                      ? "#fff"
                      : isToday
                        ? "var(--primary)"
                        : "var(--text)",
                    fontWeight: isSelected || isToday ? 700 : 500,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px dashed var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {t("datePicker_clear")}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayISO);
                setOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {t("datePicker_today")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseModal({ data, onClose, onSave }) {
  const { t } = useT();
  const editing = data.mode === "edit";
  const EXP_CATS = [
    "electricity",
    "water",
    "rent",
    "salary",
    "transport",
    "supplies",
    "other",
  ];
  const e = editing
    ? data.expense
    : {
        category: "electricity",
        amount: "",
        note: "",
        date: new Date().toISOString().slice(0, 10),
      };
  const [form, setForm] = useState(e);

  return (
    <ModalShell
      title={editing ? t("exp_editTitle") : t("exp_addTitle")}
      onClose={onClose}
    >
      <label style={fieldLabel}>{t("exp_date")}</label>
      <DateField
        value={form.date}
        onChange={(v) => setForm({ ...form, date: v })}
        style={{ marginBottom: "14px" }}
      />
      <label style={fieldLabel}>{t("exp_category")}</label>
      <select
        style={fieldInput}
        value={form.category}
        onChange={(ev) => setForm({ ...form, category: ev.target.value })}
      >
        {EXP_CATS.map((cat) => (
          <option key={cat} value={cat}>
            {t("exp_cat_" + cat)}
          </option>
        ))}
      </select>
      <label style={fieldLabel}>{t("exp_amount")}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        style={fieldInput}
        value={form.amount}
        onChange={(ev) => setForm({ ...form, amount: ev.target.value })}
        placeholder="0.00"
      />
      <label style={fieldLabel}>{t("exp_note")}</label>
      <input
        style={fieldInput}
        value={form.note || ""}
        onChange={(ev) => setForm({ ...form, note: ev.target.value })}
      />
      <button
        onClick={() => onSave(form)}
        style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center" }}
      >
        {t("save")}
      </button>
    </ModalShell>
  );
}

function CategoryModal({ categories, products, onClose, onAdd, onDelete }) {
  const { t, lang } = useT();
  const [form, setForm] = useState({ label_km: "", label_en: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const countInUse = (key) => products.filter((p) => p.category === key).length;

  const handleAdd = () => {
    onAdd(form);
    setForm({ label_km: "", label_en: "" });
  };

  return (
    <>
      <ModalShell title={t("manageCategories")} onClose={onClose} width="440px">
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginBottom: "14px",
          }}
        >
          {t("manageCategories_subtitle")}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "18px",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {categories.map((c) => {
            const used = countInUse(c.key);
            const label =
              lang === "en"
                ? c.label_en || c.label_km
                : c.label_km || c.label_en;
            return (
              <div
                key={c.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>
                    {label}
                  </div>
                  {used > 0 && (
                    <div
                      style={{ fontSize: "11.5px", color: "var(--text-muted)" }}
                    >
                      {used} {t("nav_inventory")}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setDeleteTarget(c.key)}
                  style={{ ...iconBtnStyle, color: "var(--danger)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "14px",
          }}
        >
          <label style={fieldLabel}>{t("cat_labelKm")}</label>
          <input
            style={fieldInput}
            value={form.label_km}
            onChange={(e) => setForm({ ...form, label_km: e.target.value })}
          />
          <label style={fieldLabel}>{t("cat_labelEn")}</label>
          <input
            style={fieldInput}
            value={form.label_en}
            onChange={(e) => setForm({ ...form, label_en: e.target.value })}
          />
          <button
            onClick={handleAdd}
            style={{
              ...primaryBtnStyle,
              width: "100%",
              justifyContent: "center",
            }}
          >
            <Plus size={16} /> {t("cat_addBtn")}
          </button>
        </div>
      </ModalShell>
      {deleteTarget && (
        <ConfirmDialog
          title={t("cat_deleteConfirm")}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            onDelete(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}

function UserModal({ data, roles, onClose, onSave }) {
  const { t, lang } = useT();
  const editing = data.mode === "edit";
  const defaultRole = roles.find((r) => r.id === "staff") || roles[0];
  const u = editing
    ? data.user
    : {
        name_km: "",
        name_en: "",
        username: "",
        password: "",
        role: defaultRole ? defaultRole.id : "",
      };
  const [form, setForm] = useState(u);
  const [showPw, setShowPw] = useState(false);

  return (
    <ModalShell
      title={editing ? t("editUser") : t("addUserTitle")}
      onClose={onClose}
    >
      <label style={fieldLabel}>{t("fieldFullName")}</label>
      <input
        style={fieldInput}
        value={form.name_km}
        onChange={(e) => setForm({ ...form, name_km: e.target.value })}
      />
      <label style={fieldLabel}>{t("fieldFullNameEn")}</label>
      <input
        style={fieldInput}
        value={form.name_en || ""}
        onChange={(e) => setForm({ ...form, name_en: e.target.value })}
      />
      <label style={fieldLabel}>{t("fieldUsername")}</label>
      <input
        style={fieldInput}
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
        autoCapitalize="none"
      />
      <label style={fieldLabel}>{t("fieldPassword")}</label>
      <div style={{ position: "relative" }}>
        <input
          type={showPw ? "text" : "password"}
          style={{ ...fieldInput, paddingRight: "68px", marginBottom: "6px" }}
          value={form.password || ""}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={editing ? "••••••••" : ""}
          autoCapitalize="none"
        />
        <div
          style={{
            position: "absolute",
            right: "10px",
            top: "9px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setForm({ ...form, password: genPassword() });
              setShowPw(true);
            }}
            title={t("pw_generate")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
            }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
            }}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      {editing && (
        <div
          style={{
            fontSize: "11.5px",
            color: "var(--text-muted)",
            marginBottom: "14px",
            marginTop: "-2px",
          }}
        >
          {t("pw_leaveBlank")}
        </div>
      )}
      {!editing && <div style={{ marginBottom: "14px" }} />}
      <label style={fieldLabel}>{t("fieldRole")}</label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "18px",
        }}
      >
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setForm({ ...form, role: r.id })}
            style={{
              padding: "9px 14px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "13.5px",
              fontWeight: 700,
              border:
                form.role === r.id
                  ? "1.5px solid var(--primary)"
                  : "1px solid var(--border)",
              background:
                form.role === r.id ? "var(--primary)" : "var(--surface-alt)",
              color: form.role === r.id ? "#fff" : "var(--text)",
            }}
          >
            {roleLabel(r, lang)}
          </button>
        ))}
      </div>
      <button
        onClick={() => onSave(editing ? { ...form, id: data.user.id } : form)}
        style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center" }}
      >
        {t("save")}
      </button>
    </ModalShell>
  );
}

// Add/rename a role. Tab permissions themselves are toggled directly from
// the Role Management matrix (see UsersTab) — this modal only handles the
// role's name, both for a brand-new role and for renaming an existing one.
function RoleModal({ data, onClose, onSave }) {
  const { t } = useT();
  const editing = data.mode === "edit";
  const r = editing ? data.role : { name_km: "", name_en: "" };
  const [form, setForm] = useState(r);
  return (
    <ModalShell
      title={editing ? t("editRoleTitle") : t("addRoleTitle")}
      onClose={onClose}
    >
      <label style={fieldLabel}>{t("fieldRoleNameKm")}</label>
      <input
        style={fieldInput}
        value={form.name_km || ""}
        onChange={(e) => setForm({ ...form, name_km: e.target.value })}
      />
      <label style={fieldLabel}>{t("fieldRoleNameEn")}</label>
      <input
        style={fieldInput}
        value={form.name_en || ""}
        onChange={(e) => setForm({ ...form, name_en: e.target.value })}
      />
      <button
        onClick={() => onSave(editing ? { ...form, id: data.role.id } : form)}
        style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center" }}
      >
        {t("save")}
      </button>
    </ModalShell>
  );
}

// Lets the signed-in user change their own password (any role) — separate
// from UserModal, which is the admin-only add/edit-any-user form.
function ChangePasswordModal({ onClose, onChangePassword }) {
  const { t } = useT();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const submit = () => {
    if (newPw !== confirmPw) {
      setFieldError(t("toast_pwMismatch"));
      return;
    }
    const result = onChangePassword(currentPw, newPw);
    if (result === "wrong-current") {
      setFieldError(t("toast_pwWrongCurrent"));
    } else if (result === "too-short") {
      setFieldError(t("toast_pwTooShort"));
    } else if (result === "ok") {
      onClose();
    }
  };

  return (
    <ModalShell title={t("changePassword")} onClose={onClose} width="360px">
      <label style={fieldLabel}>{t("fieldCurrentPassword")}</label>
      <input
        type={showPw ? "text" : "password"}
        style={fieldInput}
        value={currentPw}
        onChange={(e) => {
          setCurrentPw(e.target.value);
          setFieldError("");
        }}
        autoFocus
      />
      <label style={fieldLabel}>{t("fieldNewPassword")}</label>
      <input
        type={showPw ? "text" : "password"}
        style={fieldInput}
        value={newPw}
        onChange={(e) => {
          setNewPw(e.target.value);
          setFieldError("");
        }}
      />
      <label style={fieldLabel}>{t("fieldConfirmPassword")}</label>
      <div style={{ position: "relative" }}>
        <input
          type={showPw ? "text" : "password"}
          style={{ ...fieldInput, paddingRight: "36px" }}
          value={confirmPw}
          onChange={(e) => {
            setConfirmPw(e.target.value);
            setFieldError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          style={{
            position: "absolute",
            right: "10px",
            top: "10px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
          }}
        >
          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {fieldError && (
        <div
          style={{
            color: "var(--danger)",
            fontSize: "12.5px",
            marginTop: "-8px",
            marginBottom: "14px",
          }}
        >
          {fieldError}
        </div>
      )}
      <button
        onClick={submit}
        style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center" }}
      >
        {t("save")}
      </button>
    </ModalShell>
  );
}

function ReceiptModal({
  sale,
  shopName,
  shopLogo,
  khrRate,
  receiptWidth,
  onClose,
}) {
  const { t, lang } = useT();
  const isNarrow = receiptWidth === "58mm";
  const areaWidthPx = isNarrow ? "220px" : "300px";
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,30,27,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "16px",
        "--receipt-print-width": areaWidthPx,
      }}
    >
      <div
        id="receipt-print-area"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          width: areaWidthPx,
          maxWidth: "100%",
          boxShadow: "0 20px 50px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            padding: "22px 22px 16px",
            textAlign: "center",
            borderBottom: "1px dashed var(--border)",
          }}
        >
          {shopLogo ? (
            <img
              src={shopLogo}
              alt=""
              style={{
                width: "44px",
                height: "44px",
                objectFit: "cover",
                borderRadius: "var(--radius-sm)",
                margin: "0 auto 9px",
                display: "block",
              }}
            />
          ) : (
            <CheckCircle2
              size={32}
              color={sale.unpaid ? "var(--text-muted)" : "var(--primary)"}
              style={{ margin: "0 auto 9px" }}
            />
          )}
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "15px",
            }}
          >
            {shopName}
          </div>
          {sale.table && (
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "var(--primary)",
                marginTop: "3px",
              }}
            >
              {sale.table}
            </div>
          )}
          <div
            style={{
              fontSize: "12.5px",
              color: sale.unpaid ? "var(--danger)" : "var(--text-muted)",
              fontWeight: sale.unpaid ? 700 : 400,
              marginTop: "3px",
            }}
          >
            {sale.unpaid ? t("unpaidBillTitle") : t("paymentSuccess")}
          </div>
          <div
            style={{
              fontSize: "11.5px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            {new Date(sale.date).toLocaleString(
              lang === "en" ? "en-US" : "km-KH",
            )}
          </div>
        </div>
        <div
          style={{
            padding: "16px 22px",
            fontFamily: "var(--font-mono)",
            fontSize: "12.5px",
          }}
        >
          {sale.items.map((it, i) => (
            <div key={i} style={{ padding: "3px 0" }}>
              <div
                className="receipt-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.name} ×{it.qty}
                </span>
                <span
                  style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(it.price * it.qty)}
                </span>
              </div>
              {it.discountPercent > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>
                    {t("itemDiscountLine", { percent: it.discountPercent })}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    -{fmt(it.lineDiscount)}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div
            style={{
              borderTop: "1px dashed var(--border)",
              margin: "9px 0",
              paddingTop: "9px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t("subtotal")}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(sale.subtotal)}
              </span>
            </div>
            {sale.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{STRINGS.discountAmount[lang].replace(" ($)", "")}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  -{fmt(sale.discount)}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "14px",
                marginTop: "5px",
              }}
            >
              <span>{t("total")}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(sale.total)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                fontSize: "11.5px",
                color: "var(--text-muted)",
                marginTop: "1px",
              }}
            >
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                ≈ {fmtKhr(sale.total, khrRate)}
              </span>
            </div>
            {!sale.unpaid && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "var(--text-muted)",
                    marginTop: "5px",
                  }}
                >
                  <span>{t("paymentReceived")}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmt(sale.paid)}
                  </span>
                </div>
                {sale.paymentMethod === "khqr" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>{t("checkout_paymentMethod")}</span>
                    <span>{t("pos_payKhqr")}</span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>{t("changeDue")}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmt(sale.change)}
                  </span>
                </div>
                {sale.change > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      fontSize: "11.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      ≈ {fmtKhr(sale.change, khrRate)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div
          id="receipt-print-actions"
          style={{ padding: "0 22px 20px", display: "flex", gap: "10px" }}
        >
          <button
            onClick={() => window.print()}
            style={{
              ...primaryBtnStyle,
              flex: 1,
              justifyContent: "center",
              background: "var(--surface-alt)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            <Printer size={16} /> {t("print")}
          </button>
          <button
            onClick={onClose}
            style={{ ...primaryBtnStyle, flex: 1, justifyContent: "center" }}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Public online storefront (?order=1) =================

function StorefrontApp() {
  const [lang, setLang] = useState("km");
  // Slug from ?shop=slug in the URL — resolved synchronously (no fetch
  // needed) since it's used to scope both the theme and "my active order"
  // localStorage keys per shop. Without this, a browser that's opened
  // storefront links for two different shops (e.g. a merchant testing
  // both) had one shop's theme and in-progress order bleed into the
  // other's, because everything was saved under the same shared keys.
  const shopSlugParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("shop")
      : null;
  const activeOrderStorageKey = shopSlugParam
    ? `storefront-activeOrder-${shopSlugParam}`
    : null;
  const [theme, setTheme] = useState(() => {
    try {
      const key = shopSlugParam ? `shop-theme-${shopSlugParam}` : "shop-theme";
      return localStorage.getItem(key) || "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      const key = shopSlugParam ? `shop-theme-${shopSlugParam}` : "shop-theme";
      localStorage.setItem(key, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const t = (key, vars) => {
    let str = (STRINGS[key] && STRINGS[key][lang]) || key;
    if (vars)
      Object.keys(vars).forEach((k) => {
        str = str.replace(`{${k}}`, vars[k]);
      });
    return str;
  };
  const catLabel = (cat) => {
    const found = categories.find((c) => c.key === cat);
    if (!found) return cat;
    return lang === "en"
      ? found.label_en || found.label_km
      : found.label_km || found.label_en;
  };
  const prodName = (p) =>
    lang === "en" ? p.name_en || p.name_km || "" : p.name_km || p.name_en || "";
  const prodUnit = (p) =>
    lang === "en" ? p.unit_en || "pcs" : p.unit_km || "ដុំ";

  const [status, setStatus] = useState(supabase ? "loading" : "unconfigured"); // loading | ready | error | disabled | unconfigured
  const [shopRowId, setShopRowId] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(
    CATEGORY_KEYS.map((k) => ({
      key: k,
      label_km: STRINGS["cat_" + k].km,
      label_en: STRINGS["cat_" + k].en,
    })),
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [cartExpanded, setCartExpanded] = useState(false);
  const [myOrder, setMyOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const [payCashEnabled, setPayCashEnabled] = useState(true);
  const [payKhqrEnabled, setPayKhqrEnabled] = useState(false);
  const [khqrImage, setKhqrImage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("storefront_orders");
      if (raw) setOrderHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const saveOrderToHistory = (order) => {
    try {
      const entry = {
        id: order.id,
        name: order.customer_name,
        total: order.subtotal,
        date: order.created_at || new Date().toISOString(),
      };
      const next = [
        entry,
        ...orderHistory.filter((o) => o.id !== order.id),
      ].slice(0, 15);
      setOrderHistory(next);
      localStorage.setItem("storefront_orders", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  // Live-track the order currently shown on the confirmation screen: any
  // status change the shop makes (accept / reject / mark paid / cancel)
  // pushes to this page instantly via Supabase realtime.
  useEffect(() => {
    if (!supabase || !myOrder || !myOrder.id) return;
    const channel = supabase
      .channel(`storefront-order-${myOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "online_orders",
          filter: `id=eq.${myOrder.id}`,
        },
        (payload) => {
          setMyOrder((prev) => {
            if (!prev || prev.status === payload.new.status) return prev;
            const toastKey = {
              accepted: "storefront_toast_accepted",
              paid: "storefront_toast_paid",
              rejected: "storefront_toast_rejected",
              cancelled: "storefront_toast_cancelled",
            }[payload.new.status];
            if (toastKey) showToast(t(toastKey));
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted" &&
              document.hidden &&
              toastKey
            ) {
              try {
                new Notification(t(toastKey));
              } catch {
                /* ignore */
              }
            }
            return { ...prev, ...payload.new };
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myOrder && myOrder.id]);

  const trackOrder = async (id) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("online_orders")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setMyOrder(data);
      setSubmitted(true);
      setShowHistory(false);
      if (activeOrderStorageKey) {
        try {
          localStorage.setItem(activeOrderStorageKey, JSON.stringify({ id }));
        } catch {
          /* ignore */
        }
      }
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  // Restore the order-confirmation screen after a page refresh. Without
  // this, refreshing while looking at "Order received!" (or its live
  // status) dropped the customer straight back to the product list with
  // no obvious way back short of digging through order history. Written
  // as its own effect (rather than reusing trackOrder) so a stale pointer
  // — e.g. the shop permanently deleted this order from its archive —
  // fails silently instead of surfacing a "something went wrong" toast
  // on a page the customer hasn't touched yet.
  useEffect(() => {
    if (!supabase || !activeOrderStorageKey) return;
    let saved;
    try {
      const raw = localStorage.getItem(activeOrderStorageKey);
      if (!raw) return;
      saved = JSON.parse(raw);
    } catch {
      return;
    }
    if (!saved || !saved.id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("online_orders")
          .select("*")
          .eq("id", saved.id)
          .single();
        if (error || !data) throw error || new Error("not found");
        setMyOrder(data);
        setSubmitted(true);
      } catch {
        try {
          localStorage.removeItem(activeOrderStorageKey);
        } catch {
          /* ignore */
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        if (!shopSlugParam) {
          // No ?shop=slug in the link — can't tell which shop's catalog to
          // show. Every storefront link should include it, e.g.
          // yoursite.com/?order=1&shop=myshop
          setStatus("error");
          return;
        }
        const { data: shopRow, error: shopError } = await supabase
          .from("shops")
          .select("id")
          .eq("slug", shopSlugParam)
          .maybeSingle();
        if (shopError || !shopRow) throw shopError || new Error("no shop");
        setShopRowId(shopRow.id);

        const { data: settingsData } = await supabase
          .from("shop_settings")
          .select("*")
          .eq("id", shopRow.id)
          .maybeSingle();
        // Online Ordering itself is a premium feature — if this shop's
        // Super Admin hasn't turned it on, stop here rather than showing a
        // catalog customers could try to order from but that the till
        // side isn't paying to support.
        let onlineOrdersOn = false;
        if (settingsData && typeof settingsData.features_json === "string") {
          try {
            const cloudFeatures = JSON.parse(settingsData.features_json);
            onlineOrdersOn = !!(cloudFeatures && cloudFeatures.onlineOrders);
          } catch {
            /* malformed features payload — treat as not enabled */
          }
        }
        if (!onlineOrdersOn) {
          setStatus("disabled");
          return;
        }
        if (settingsData) {
          setPayCashEnabled(
            typeof settingsData.pay_cash_enabled === "boolean"
              ? settingsData.pay_cash_enabled
              : true,
          );
          setPayKhqrEnabled(!!settingsData.pay_khqr_enabled);
          setKhqrImage(settingsData.khqr_image || "");
          if (!settingsData.pay_cash_enabled && settingsData.pay_khqr_enabled) {
            setPaymentMethod("khqr");
          }
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("shop_id", shopRow.id)
          .order("name_km");
        if (error) throw error;
        setProducts(data || []);
        setStatus("ready");

        const { data: catData } = await supabase
          .from("categories")
          .select("*")
          .eq("shop_id", shopRow.id);
        if (catData && catData.length) {
          setCategories(
            catData.map((r) => ({
              key: r.key,
              label_km: r.label_km,
              label_en: r.label_en,
            })),
          );
        }
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  const filtered = products.filter((p) => {
    const m1 = prodName(p).toLowerCase().includes(search.toLowerCase());
    const m2 = categoryFilter === "all" || p.category === categoryFilter;
    return m1 && m2;
  });

  const addToCart = (p) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === p.id);
      if (existing) {
        if (existing.qty >= p.stock) return prev;
        return prev.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      }
      if (p.stock <= 0) return prev;
      return [...prev, { id: p.id, name: prodName(p), price: p.price, qty: 1 }];
    });
  };
  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c,
        )
        .filter((c) => c.qty > 0),
    );
  };
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((c) => c.id !== id));
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const submitOrder = async () => {
    if (!name.trim() || !phone.trim()) {
      setFormError(t("storefront_fieldsRequired"));
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("online_orders")
        .insert({
          shop_id: shopRowId,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          note: note.trim() || null,
          items: cart,
          subtotal,
          status: "pending",
          payment_method: paymentMethod,
        })
        .select()
        .single();
      if (error) throw error;
      setMyOrder(data);
      saveOrderToHistory(data);
      setSubmitted(true);
      if (activeOrderStorageKey) {
        try {
          localStorage.setItem(
            activeOrderStorageKey,
            JSON.stringify({ id: data.id }),
          );
        } catch {
          /* ignore */
        }
      }
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        try {
          Notification.requestPermission();
        } catch {
          /* ignore */
        }
      }
    } catch {
      setFormError(t("toast_supabaseError"));
    }
    setSubmitting(false);
  };

  const resetOrder = () => {
    setCart([]);
    setName("");
    setPhone("");
    setNote("");
    setSubmitted(false);
    setMyOrder(null);
    if (activeOrderStorageKey) {
      try {
        localStorage.removeItem(activeOrderStorageKey);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <LangContext.Provider value={{ lang, t, catLabel, categories }}>
      <div
        style={{
          background: "var(--bg)",
          minHeight: "100vh",
          width: "100%",
          fontFamily: "var(--font-body)",
          color: "var(--text)",
          position: "relative",
        }}
      >
        <FontStyles />
        {toast && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 60,
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <Toast msg={toast.msg} kind={toast.kind} />
            </div>
          </div>
        )}
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "20px 16px 100px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Store size={19} color="#fff" />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "17px",
                }}
              >
                {t("storefront_title")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {orderHistory.length > 0 && (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowHistory((v) => !v)}
                    title={t("storefront_myOrders")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "38px",
                      height: "38px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    <History size={17} />
                  </button>
                  {showHistory && (
                    <div
                      style={{
                        position: "absolute",
                        top: "46px",
                        right: 0,
                        width: "280px",
                        maxHeight: "320px",
                        overflowY: "auto",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "0 12px 30px rgba(0,0,0,.15)",
                        zIndex: 40,
                        padding: "8px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          padding: "6px 8px",
                        }}
                      >
                        {t("storefront_myOrders")}
                      </div>
                      {orderHistory.map((o) => (
                        <div
                          key={o.id}
                          onClick={() => trackOrder(o.id)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--surface-alt)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <div style={{ fontSize: "12.5px" }}>
                            <div style={{ fontWeight: 600 }}>
                              {t("storefront_orderRef")} #
                              {String(o.id).slice(0, 6)}
                            </div>
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "11.5px",
                              }}
                            >
                              {new Date(o.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: "12.5px" }}>
                            ${Number(o.total || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <LangSwitch lang={lang} setLang={setLang} />
              <ThemeSwitch theme={theme} setTheme={setTheme} t={t} />
            </div>
          </div>

          {status === "unconfigured" && (
            <div
              style={{
                padding: "20px",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-alt)",
                border: "1px dashed var(--border)",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "14.5px",
                  marginBottom: "5px",
                }}
              >
                {t("supabaseNotConfigured")}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {t("supabaseNotConfiguredHint")}
              </div>
            </div>
          )}

          {(status === "disabled" || status === "error") && (
            <div
              style={{
                padding: "20px",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-alt)",
                border: "1px dashed var(--border)",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "14.5px" }}>
                {status === "disabled"
                  ? t("storefront_orderingDisabled")
                  : t("storefront_notFound")}
              </div>
            </div>
          )}

          {status === "loading" && (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "14px",
              }}
            >
              {t("storefront_loading")}
            </div>
          )}

          {status === "ready" && submitted && (
            <div
              style={{
                padding: "32px 24px",
                textAlign: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <CheckCircle2
                size={40}
                color="var(--primary)"
                style={{ margin: "0 auto 14px" }}
              />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "17px",
                  marginBottom: "6px",
                }}
              >
                {t("storefront_submitted_title")}
              </div>
              <div
                style={{
                  fontSize: "13.5px",
                  color: "var(--text-muted)",
                  marginBottom: "18px",
                }}
              >
                {t("storefront_submitted_sub")}
              </div>

              {myOrder && (
                <div
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "16px",
                    textAlign: "start",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {t("storefront_trackTitle")}
                    </div>
                    <OrderStatusBadge status={myOrder.status} t={t} />
                  </div>

                  {(myOrder.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        padding: "3px 0",
                      }}
                    >
                      <span>
                        {it.name} ×{it.qty}
                      </span>
                      <span>${(it.price * it.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      fontSize: "14px",
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px dashed var(--border)",
                    }}
                  >
                    <span>{t("total")}</span>
                    <span>${(myOrder.subtotal || 0).toFixed(2)}</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "12px",
                      fontSize: "11.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span className="live-dot" />
                    {t("storefront_liveNote")}
                  </div>
                </div>
              )}

              <button
                onClick={resetOrder}
                style={{ ...primaryBtnStyle, justifyContent: "center" }}
              >
                {t("storefront_newOrder")}
              </button>
            </div>
          )}

          {status === "ready" && !submitted && (
            <div>
              <div style={{ position: "relative", marginBottom: "12px" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "13px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchProducts")}
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 38px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    fontSize: "14px",
                    background: "var(--surface)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  marginBottom: "16px",
                  paddingBottom: "2px",
                }}
              >
                <CategoryPill
                  active={categoryFilter === "all"}
                  onClick={() => setCategoryFilter("all")}
                  label={t("allCategories")}
                />
                {categories.map(({ key: c }) => (
                  <CategoryPill
                    key={c}
                    active={categoryFilter === c}
                    onClick={() => setCategoryFilter(c)}
                    label={catLabel(c)}
                  />
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "12px",
                  marginBottom: "90px",
                }}
              >
                {filtered.map((p) => {
                  const inCartQty = cart.find((c) => c.id === p.id)?.qty || 0;
                  return (
                    <button
                      key={p.id}
                      className="pos-product-card"
                      onClick={() => addToCart(p)}
                      disabled={p.stock <= 0}
                      style={{
                        position: "relative",
                        textAlign: "left",
                        background: "var(--surface)",
                        border:
                          "1px solid " +
                          (inCartQty > 0 ? "var(--primary)" : "var(--border)"),
                        borderRadius: "var(--radius-lg)",
                        padding: "10px",
                        cursor: p.stock > 0 ? "pointer" : "not-allowed",
                        opacity: p.stock > 0 ? 1 : 0.5,
                      }}
                    >
                      {inCartQty > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-7px",
                            right: "-7px",
                            minWidth: "20px",
                            height: "20px",
                            padding: "0 5px",
                            borderRadius: "var(--radius-pill)",
                            background: "var(--primary)",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(0,0,0,.18)",
                            zIndex: 1,
                          }}
                        >
                          {inCartQty}
                        </span>
                      )}
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          marginBottom: "8px",
                          background: "var(--surface-alt)",
                        }}
                      >
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Package size={26} color="var(--text-muted)" />
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "13px",
                          marginBottom: "3px",
                        }}
                      >
                        {prodName(p)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--primary)",
                            fontWeight: 700,
                            fontSize: "13px",
                          }}
                        >
                          {fmt(p.price)}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "var(--radius-pill)",
                            background:
                              p.stock > 0 && p.stock <= 5
                                ? "color-mix(in srgb, var(--danger) 14%, transparent)"
                                : "var(--surface-alt)",
                            color:
                              p.stock > 0 && p.stock <= 5
                                ? "var(--danger)"
                                : "var(--text-muted)",
                          }}
                        >
                          {p.stock > 0
                            ? `${p.stock} ${prodUnit(p)}`
                            : t("storefront_outOfStock")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* floating cart panel — collapsible so it never blocks product browsing */}
              {cart.length > 0 && (
                <div
                  style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "var(--surface)",
                    borderTop: "1px solid var(--border)",
                    boxShadow: "0 -8px 30px rgba(0,0,0,.08)",
                    zIndex: 30,
                  }}
                >
                  <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                    <button
                      onClick={() => setCartExpanded(!cartExpanded)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontWeight: 700,
                          fontSize: "14px",
                        }}
                      >
                        <ShoppingCart size={16} color="var(--primary)" />
                        {t("storefront_cartTitle")}
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#fff",
                            background: "var(--primary)",
                            borderRadius: "var(--radius-pill)",
                            padding: "2px 7px",
                          }}
                        >
                          {cart.reduce((s, c) => s + c.qty, 0)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: "15px",
                          }}
                        >
                          {fmt(subtotal)}
                        </span>
                        <ChevronDown
                          size={17}
                          style={{
                            transform: cartExpanded ? "rotate(180deg)" : "none",
                            transition: "transform .2s ease",
                            color: "var(--text-muted)",
                          }}
                        />
                      </div>
                    </button>

                    {cartExpanded && (
                      <div
                        style={{
                          maxHeight: "60vh",
                          overflowY: "auto",
                          padding: "0 16px 16px",
                        }}
                      >
                        {cart.map((c) => (
                          <div
                            key={c.id}
                            className="cart-line-row"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "7px 6px",
                            }}
                          >
                            <div style={{ flex: 1, fontSize: "13px" }}>
                              {c.name}
                            </div>
                            <div className="cart-line-qty">
                              <button onClick={() => changeQty(c.id, -1)}>
                                <Minus size={12} />
                              </button>
                              <span>{c.qty}</span>
                              <button onClick={() => changeQty(c.id, 1)}>
                                <Plus size={12} />
                              </button>
                            </div>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                                width: "56px",
                                textAlign: "right",
                              }}
                            >
                              {fmt(c.price * c.qty)}
                            </span>
                            <button
                              className="cart-line-remove"
                              onClick={() => removeFromCart(c.id)}
                              style={{
                                ...iconBtnStyle,
                                color: "var(--danger)",
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: 700,
                            fontSize: "15px",
                            borderTop: "1px dashed var(--border)",
                            margin: "8px 0",
                            paddingTop: "8px",
                          }}
                        >
                          <span>{t("total")}</span>
                          <span style={{ fontFamily: "var(--font-mono)" }}>
                            {fmt(subtotal)}
                          </span>
                        </div>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t("storefront_yourName")}
                          style={{ ...fieldInput, marginBottom: "8px" }}
                        />
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t("storefront_yourPhone")}
                          style={{ ...fieldInput, marginBottom: "8px" }}
                        />
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder={t("storefront_note")}
                          style={{ ...fieldInput, marginBottom: "4px" }}
                        />
                        {(payCashEnabled || payKhqrEnabled) && (
                          <div style={{ marginBottom: "12px" }}>
                            <label
                              style={{ ...fieldLabel, marginBottom: "6px" }}
                            >
                              {t("checkout_paymentMethod")}
                            </label>
                            <div style={{ display: "flex", gap: "8px" }}>
                              {payCashEnabled && (
                                <button
                                  onClick={() => setPaymentMethod("cash")}
                                  style={{
                                    flex: 1,
                                    padding: "9px 10px",
                                    borderRadius: "var(--radius-md)",
                                    border:
                                      paymentMethod === "cash"
                                        ? "2px solid var(--primary)"
                                        : "1px solid var(--border)",
                                    background:
                                      paymentMethod === "cash"
                                        ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                                        : "var(--surface)",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  {t("checkout_payCash")}
                                </button>
                              )}
                              {payKhqrEnabled && khqrImage && (
                                <button
                                  onClick={() => setPaymentMethod("khqr")}
                                  style={{
                                    flex: 1,
                                    padding: "9px 10px",
                                    borderRadius: "var(--radius-md)",
                                    border:
                                      paymentMethod === "khqr"
                                        ? "2px solid var(--primary)"
                                        : "1px solid var(--border)",
                                    background:
                                      paymentMethod === "khqr"
                                        ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                                        : "var(--surface)",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  {t("checkout_payKhqr")}
                                </button>
                              )}
                            </div>
                            {paymentMethod === "khqr" &&
                              payKhqrEnabled &&
                              khqrImage && (
                                <div
                                  style={{
                                    marginTop: "12px",
                                    padding: "14px",
                                    borderRadius: "var(--radius-lg)",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-alt)",
                                    textAlign: "center",
                                  }}
                                >
                                  <img
                                    src={khqrImage}
                                    alt="KHQR"
                                    style={{
                                      width: "180px",
                                      height: "180px",
                                      objectFit: "contain",
                                      margin: "0 auto 10px",
                                      background: "#fff",
                                      borderRadius: "var(--radius-sm)",
                                      padding: "8px",
                                    }}
                                  />
                                  <div
                                    style={{
                                      fontSize: "12.5px",
                                      color: "var(--text-muted)",
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {t("checkout_khqrInstructions", {
                                      amount: fmt(subtotal),
                                    })}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                        {formError && (
                          <div
                            style={{
                              color: "var(--danger)",
                              fontSize: "12.5px",
                              fontWeight: 600,
                              marginBottom: "8px",
                            }}
                          >
                            {formError}
                          </div>
                        )}
                        <button
                          onClick={submitOrder}
                          disabled={submitting}
                          style={{
                            ...primaryBtnStyle,
                            width: "100%",
                            justifyContent: "center",
                            opacity: submitting ? 0.6 : 1,
                          }}
                        >
                          {t("storefront_submit")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </LangContext.Provider>
  );
}

// ================= Root =================

// Root-level safety net: if anything below throws during render (a rare
// library bug, a bad state, etc), show a recoverable screen instead of a
// blank white page that looks like the app vanished.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("App crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            padding: "24px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: "17px", fontWeight: 700 }}>
            មានបញ្ហាបច្ចេកទេសកើតឡើង — Something went wrong
          </div>
          <div style={{ fontSize: "13.5px", color: "#666", maxWidth: "320px" }}>
            សូមចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទុកឡើងវិញ — Tap the button below to
            reload the app. Your saved data is not affected.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 22px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "#0f6e56",
              color: "#fff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Reload / ផ្ទុកឡើងវិញ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const isStorefront =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("order") === "1";
  return (
    <ErrorBoundary>
      {isStorefront ? <StorefrontApp /> : <POSApp />}
    </ErrorBoundary>
  );
}
