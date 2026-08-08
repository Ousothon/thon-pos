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
const SUPABASE_URL = "https://zkstajqlucnvpqxwpuxo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jucFEQ_c8EVFcwPkfhWMoQ_K-sSNyzm";
const supabase =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT")
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const STORAGE_KEY = "shop-data";
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
  },
  {
    id: "staff",
    name_km: "បុគ្គលិក",
    name_en: "Staff",
    builtin: true,
    tabs: ["pos", "customers", "onlineOrders"],
  },
];

const SESSION_KEY = "shop-session";

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
  outOfStock: { km: "អស់ស្តុក", en: "Out of stock" },

  invoice: { km: "វិក្កយបត្រ", en: "Invoice" },
  walkInCustomer: { km: "អតិថិជនធម្មតា (មិនកំណត់)", en: "Walk-in customer" },
  emptyCart: { km: "មិនទាន់មានទំនិញនៅឡើយ", en: "No items added yet" },
  subtotal: { km: "សរុបរង", en: "Subtotal" },
  discountAmount: { km: "បញ្ចុះតម្លៃ ($)", en: "Discount ($)" },
  discountLabel: { km: "បញ្ចុះតម្លៃ", en: "Discount" },
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
  changeDue: { km: "ប្រាក់អាប់", en: "Change due" },
  completeSale: { km: "បញ្ចប់ការលក់", en: "Complete sale" },

  toast_saleSuccess: {
    km: "លក់ទំនិញបានជោគជ័យ",
    en: "Sale completed successfully",
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

  nav_users: { km: "អ្នកប្រើប្រាស់", en: "Users" },
  nav_auditLog: { km: "កំណត់ត្រាសកម្មភាព", en: "Audit Log" },
  nav_settings: { km: "ការកំណត់", en: "Settings" },
  nav_expenses: { km: "ចំណាយ", en: "Expenses" },

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
  settings_subtitle: {
    km: "កំណត់ការកំណត់ទូទៅរបស់ហាង",
    en: "Configure general shop settings",
  },
  settings_tab_general: { km: "ទូទៅ", en: "General" },
  settings_tab_payment: { km: "ការទូទាត់ប្រាក់", en: "Payments" },
  settings_tab_currency: { km: "អត្រាប្តូរប្រាក់", en: "Currency" },
  settings_tab_notifications: { km: "ការជូនដំណឹង", en: "Notifications" },
  settings_tab_printing: { km: "បោះពុម្ព", en: "Printing" },
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
  settings_khqrNeedsImageWarning: {
    km: "សូមផ្ទុករូបភាព QR សិន មុននឹងបើកមុខងារនេះ",
    en: "Please upload a QR image before enabling this",
  },

  checkout_paymentMethod: { km: "វិធីទូទាត់ប្រាក់", en: "Payment method" },
  checkout_payCash: { km: "សាច់ប្រាក់ពេលទទួល", en: "Cash on pickup" },
  checkout_payKhqr: { km: "ស្កេន KHQR ទូទាត់ភ្លាមៗ", en: "Scan KHQR now" },
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
  audit_action_add: { km: "បន្ថែម", en: "Added" },
  audit_action_edit: { km: "កែប្រែ", en: "Updated" },
  audit_action_delete: { km: "លុប", en: "Deleted" },
  audit_action_enable: { km: "បើកគណនី", en: "Enabled" },
  audit_action_disable: { km: "បិទគណនី", en: "Disabled" },
  audit_action_refund: { km: "សងវិញ", en: "Refunded" },
  audit_entity_product: { km: "ទំនិញ", en: "Product" },
  audit_entity_customer: { km: "អតិថិជន", en: "Customer" },
  audit_entity_user: { km: "អ្នកប្រើប្រាស់", en: "User" },
  audit_entity_sale: { km: "ការលក់", en: "Sale" },
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
  { id: "users", key: "nav_users", icon: UserCog },
  { id: "auditLog", key: "nav_auditLog", icon: History },
  { id: "settings", key: "nav_settings", icon: SettingsIcon },
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
const roleTabIds = (role) =>
  role && role.locked ? NAV.map((n) => n.id) : (role && role.tabs) || [];

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
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState(null);
  const [khrRate, setKhrRate] = useState(KHR_PER_USD_DEFAULT);
  const [payCashEnabled, setPayCashEnabled] = useState(true);
  const [payKhqrEnabled, setPayKhqrEnabled] = useState(false);
  const [khqrImage, setKhqrImage] = useState("");
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
  const [toast, setToast] = useState(null);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [userModal, setUserModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState("amount"); // 'amount' ($) or 'percent' (%)
  const [redeemPoints, setRedeemPoints] = useState("");
  const [payment, setPayment] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [receipt, setReceipt] = useState(null);

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
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("shop-theme", theme);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProducts(parsed.products || []);
        setSales(parsed.sales || []);
        setCustomers(parsed.customers || []);
        setExpenses(parsed.expenses || []);
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
        setLang(parsed.lang || "km");
        setUsers(
          parsed.users && parsed.users.length ? parsed.users : seedUsers,
        );
        setRoles(
          parsed.roles && parsed.roles.length ? parsed.roles : seedRoles,
        );
      } else {
        setProducts(seedProducts);
        setUsers(seedUsers);
        setRoles(seedRoles);
      }
      const sess = localStorage.getItem(SESSION_KEY);
      if (sess) setSessionUserId(sess);
    } catch {
      setProducts(seedProducts);
      setUsers(seedUsers);
      setRoles(seedRoles);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            products,
            sales,
            customers,
            expenses,
            categories,
            shopName,
            shopLogo,
            khrRate,
            payCashEnabled,
            payKhqrEnabled,
            khqrImage,
            lang,
            users,
            roles,
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
    categories,
    shopName,
    shopLogo,
    khrRate,
    payCashEnabled,
    payKhqrEnabled,
    khqrImage,
    lang,
    users,
    roles,
    loading,
  ]);

  useEffect(() => {
    try {
      if (sessionUserId) localStorage.setItem(SESSION_KEY, sessionUserId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [sessionUserId]);

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2400);
  };

  // ---------- Auth ----------
  const currentUser = users.find((u) => u.id === sessionUserId) || null;
  const currentUserRole = currentUser
    ? roles.find((r) => r.id === currentUser.role)
    : null;
  const allowedTabs = roleTabIds(currentUserRole);
  const visibleNav = NAV.filter((n) => allowedTabs.includes(n.id));

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
    const perms = roles.find((r) => r.id === match.role);
    const permTabs = roleTabIds(perms);
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
      return original && original.locked ? original : r;
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

  const addToCart = (product) => {
    const inCart = cart.find((c) => c.id === product.id);
    const currentQty = inCart ? inCart.qty : 0;
    if (currentQty + 1 > product.stock) {
      showToast(
        `${t("toast_insufficientStock")}: ${prodName(product)}`,
        "error",
      );
      return;
    }
    if (inCart) {
      setCart(
        cart.map((c) => (c.id === product.id ? { ...c, qty: c.qty + 1 } : c)),
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: prodName(product),
          price: product.price,
          cost: product.cost || 0,
          unit: prodUnit(product),
          qty: 1,
          image: product.image,
        },
      ]);
    }
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

  const changeQty = (id, delta) => {
    const product = products.find((p) => p.id === id);
    setCart(
      cart
        .map((c) => {
          if (c.id !== id) return c;
          const newQty = c.qty + delta;
          if (product && newQty > product.stock) {
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

  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt =
    discountMode === "percent"
      ? Math.min((subtotal * (Number(discount) || 0)) / 100, subtotal)
      : Math.min(Number(discount) || 0, subtotal);

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || null;
  const customerDiscountPercent = selectedCustomer
    ? Number(selectedCustomer.discount_percent) || 0
    : 0;
  const availablePoints = selectedCustomer
    ? Math.floor(selectedCustomer.points || 0)
    : 0;
  const afterDiscount = Math.max(subtotal - discountAmt, 0);
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
    setSelectedCustomerId("");
  };

  const completeSale = () => {
    if (cart.length === 0) {
      showToast(t("toast_selectProduct"), "error");
      return;
    }
    if (paymentNum < total) {
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
      })),
      subtotal,
      discount: discountAmt,
      total,
      paid: paymentNum,
      change,
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : null,
      archived: false,
      refunded: false,
      refundedAt: null,
      updatedAt: Date.now(),
    };
    setSales([sale, ...sales]);
    const updatedProducts = products.map((p) => {
      const item = cart.find((c) => c.id === p.id);
      return item
        ? { ...p, stock: p.stock - item.qty, updatedAt: Date.now() }
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
    if (!supabase) return;
    try {
      await supabase.from("products").upsert(
        {
          id: p.id,
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
    } catch {
      /* offline — local copy still safe, will retry on next change */
    }
  };
  const deleteProductRow = async (id) => {
    if (!supabase) return;
    try {
      await supabase.from("products").delete().eq("id", id);
    } catch {
      /* offline */
    }
  };
  const pushUserRow = async (u) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("users").upsert(
        {
          id: u.id,
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
      await supabase.from("users").delete().eq("id", id);
    } catch {
      /* offline */
    }
  };
  const pushCustomerRow = async (c) => {
    if (!supabase) return;
    try {
      await supabase.from("customers").upsert(
        {
          id: c.id,
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
    } catch {
      /* offline */
    }
  };
  const deleteCustomerRow = async (id) => {
    if (!supabase) return;
    try {
      await supabase.from("customers").delete().eq("id", id);
    } catch {
      /* offline */
    }
  };
  const pushExpenseRow = async (e) => {
    if (!supabase) return;
    try {
      await supabase.from("expenses").upsert(
        {
          id: e.id,
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
    } catch {
      /* offline */
    }
  };
  const deleteExpenseRow = async (id) => {
    if (!supabase) return;
    try {
      await supabase.from("expenses").delete().eq("id", id);
    } catch {
      /* offline */
    }
  };
  const pushCategoryRow = async (c) => {
    if (!supabase) return;
    try {
      await supabase.from("categories").upsert(
        {
          key: c.key,
          label_km: c.label_km || "",
          label_en: c.label_en || "",
          updated_at: c.updatedAt || Date.now(),
        },
        { onConflict: "key" },
      );
    } catch {
      /* offline */
    }
  };
  const deleteCategoryRow = async (key) => {
    if (!supabase) return;
    try {
      await supabase.from("categories").delete().eq("key", key);
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
    if (loading || !supabase || !sales.length) return;
    const timer = setTimeout(async () => {
      try {
        await supabase.from("sales").upsert(
          sales.map((s) => ({
            id: s.id,
            date: s.date,
            items: s.items,
            subtotal: s.subtotal,
            discount: s.discount,
            total: s.total,
            paid: s.paid,
            change: s.change,
            customer_name: s.customerName || null,
            archived: !!s.archived,
            refunded: !!s.refunded,
            refunded_at: s.refundedAt || null,
            updated_at: s.updatedAt || Date.now(),
          })),
          { onConflict: "id" },
        );
      } catch {
        /* offline — local copy still safe, will retry on next change */
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [sales, loading]);

  // ---- Pull sales/customers from Supabase so this device picks up what other devices recorded ----
  const fetchCloudSales = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from("sales").select("*");
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
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from("customers").select("*");
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

  const fetchCloudExpenses = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from("expenses").select("*");
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
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from("categories").select("*");
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

  // ---- Pull products/users from Supabase so every device shares the same catalog + accounts ----
  const fetchCloudProducts = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from("products").select("*");
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
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from("users").select("*");
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
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("id", "default")
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
    } catch {
      /* ignore, local cache still works */
    }
  };

  const pushPaymentSettings = async (cashEnabled, khqrEnabled, khqrImg) => {
    if (!supabase) return;
    try {
      await supabase.from("shop_settings").upsert(
        {
          id: "default",
          pay_cash_enabled: cashEnabled,
          pay_khqr_enabled: khqrEnabled,
          khqr_image: khqrImg || null,
          updated_at: Date.now(),
        },
        { onConflict: "id" },
      );
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const pushKhrRate = async (rate) => {
    if (!supabase) return;
    try {
      await supabase
        .from("shop_settings")
        .upsert(
          { id: "default", khr_rate: rate, updated_at: Date.now() },
          { onConflict: "id" },
        );
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const pushShopInfo = async (name, logo) => {
    if (!supabase) return;
    try {
      await supabase.from("shop_settings").upsert(
        {
          id: "default",
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
    if (!supabase) return true;
    try {
      const { error } = await supabase.from("shop_settings").upsert(
        {
          id: "default",
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

  useEffect(() => {
    if (!supabase || loading) return;
    fetchCloudSales();
    fetchCloudCustomers();
    fetchCloudProducts();
    fetchCloudUsers();
    fetchCloudSettings();
    fetchCloudExpenses();
    fetchCloudCategories();
    const poll = setInterval(() => {
      fetchCloudSales();
      fetchCloudCustomers();
      fetchCloudProducts();
      fetchCloudUsers();
      fetchCloudSettings();
      fetchCloudExpenses();
      fetchCloudCategories();
    }, 15000);
    let channel;
    try {
      channel = supabase
        .channel("pos_data_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sales" },
          fetchCloudSales,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "customers" },
          fetchCloudCustomers,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          fetchCloudProducts,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users" },
          fetchCloudUsers,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shop_settings" },
          fetchCloudSettings,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "expenses" },
          fetchCloudExpenses,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "categories" },
          fetchCloudCategories,
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
  }, [loading]);

  const fetchOnlineOrders = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("online_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOnlineOrders(data || []);
      setSupabaseStatus("live");
    } catch {
      setSupabaseStatus("error");
    }
  };

  useEffect(() => {
    if (!supabase || loading) return;
    fetchOnlineOrders();
    const poll = setInterval(fetchOnlineOrders, 15000); // fallback in case realtime isn't enabled
    let channel;
    try {
      channel = supabase
        .channel("online_orders_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "online_orders" },
          fetchOnlineOrders,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "online_orders" },
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
  }, [loading]);

  // ---------- Audit log (who added/edited/deleted what) ----------
  const [auditLog, setAuditLog] = useState([]);
  const fetchAuditLog = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      setAuditLog(data || []);
    } catch {
      /* table may not exist yet — ignore */
    }
  };

  useEffect(() => {
    if (!supabase || loading || !allowedTabs.includes("auditLog")) return;
    fetchAuditLog();
    const poll = setInterval(fetchAuditLog, 15000);
    let channel;
    try {
      channel = supabase
        .channel("audit_log_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "audit_log" },
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
  }, [loading, currentUser && currentUser.id]);

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
    if (!supabase) return;
    try {
      await supabase.from("audit_log").insert(entry);
    } catch {
      /* offline or table missing — local list above still shows it this session */
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

  const cancelAcceptedOrder = async (order) => {
    try {
      // customer never paid / no-show — restore the reserved stock
      const items = order.items || [];
      setProducts((prev) =>
        prev.map((p) => {
          const line = items.find((i) => i.id === p.id);
          return line ? { ...p, stock: p.stock + line.qty } : p;
        }),
      );
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ status: "cancelled" })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: "cancelled" } : o,
        ),
      );
      showToast(t("toast_orderCancelled"));
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  const rejectOnlineOrder = async (order) => {
    try {
      if (supabase)
        await supabase
          .from("online_orders")
          .update({ status: "rejected" })
          .eq("id", order.id);
      setOnlineOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "rejected" } : o)),
      );
      showToast(t("toast_orderRejected"));
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
                    borderRadius: "9px",
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
                    borderRadius: "9px",
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
                        borderRadius: "999px",
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
                        borderRadius: "999px",
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
                  borderRadius: "999px",
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
              subtotal={subtotal}
              discount={discount}
              setDiscount={setDiscount}
              total={total}
              payment={payment}
              setPayment={setPayment}
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
            />
          )}
          {activeTab === "customers" && (
            <CustomersTab
              customers={customers}
              openAdd={() => setCustomerModal({ mode: "add" })}
              openEdit={(c) => setCustomerModal({ mode: "edit", customer: c })}
              deleteCustomer={deleteCustomer}
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
          {activeTab === "onlineOrders" &&
            allowedTabs.includes("onlineOrders") && (
              <OnlineOrdersTab
                orders={activeOnlineOrders}
                archivedOrders={archivedOnlineOrders}
                products={products}
                supabaseStatus={supabaseStatus}
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
              onSavePaymentSettings={(cash, khqr, img) => {
                setPayCashEnabled(cash);
                setPayKhqrEnabled(khqr);
                setKhqrImage(img);
                pushPaymentSettings(cash, khqr, img);
              }}
              receiptWidth={receiptWidth}
              setReceiptWidth={setReceiptWidth}
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
        --bg: #F5F4EF; --surface: #FFFFFF; --surface-alt: #EEEBE2; --border: #E1DDD0;
        --text: #20302B; --text-muted: #74807A; --primary: #0F6B5C; --primary-dark: #0A4F44;
        --accent: #E1A13D; --danger: #C1443C;
        --font-display: 'Kantumruy Pro', 'Noto Sans Khmer', 'Inter', sans-serif;
        --font-body: 'Noto Sans Khmer', 'Inter', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
      }
      [data-theme="dark"] {
        --bg: #14201C; --surface: #1B2723; --surface-alt: #24322D; --border: #35443D;
        --text: #EDF1EE; --text-muted: #93A29A; --primary: #35B695; --primary-dark: #2A9179;
        --accent: #E9B45C; --danger: #E06B62;
      }
      [data-theme="dark"] img { filter: brightness(.92); }
      body { background: var(--bg); transition: background .2s ease, color .2s ease; }
      * { transition: background-color .18s ease, border-color .18s ease, color .18s ease; }
      * { box-sizing: border-box; }
      input, select { font-family: var(--font-body); outline: none; }
      input:focus, select:focus { border-color: var(--primary) !important; }
      ::-webkit-scrollbar { width: 9px; height: 9px; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 5px; }
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
      .theme-toggle-btn {
        display: flex; align-items: center; justify-content: center;
        width: 38px; height: 38px; border-radius: 8px;
        border: 1px solid var(--border); background: var(--surface-alt);
        color: var(--text); cursor: pointer; flex-shrink: 0;
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
        border-radius: 9px;
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
        borderRadius: "999px",
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
            borderRadius: "999px",
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
        borderRadius: "999px",
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
          borderRadius: "18px",
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
              borderRadius: "14px",
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
        borderRadius: "999px",
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
        position: "absolute",
        top: "18px",
        right: "18px",
        zIndex: 60,
        background: kind === "error" ? "var(--danger)" : "var(--primary)",
        color: "#fff",
        padding: "12px 18px",
        borderRadius: "9px",
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 6px 16px rgba(0,0,0,.18)",
        display: "flex",
        alignItems: "center",
        gap: "9px",
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
  borderRadius: "6px",
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
  borderRadius: "9px",
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
  borderRadius: "9px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
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
        borderRadius: "12px",
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
        borderRadius: "999px",
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

function ProductThumb({ image, size = 40 }) {
  if (image)
    return (
      <img
        src={image}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "8px",
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
        borderRadius: "8px",
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
    subtotal,
    discount,
    setDiscount,
    total,
    payment,
    setPayment,
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
                borderRadius: "9px",
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
                borderRadius: "6px",
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
            <div
              style={{
                gridColumn: "1/-1",
                color: "var(--text-muted)",
                fontSize: "14px",
                padding: "36px 0",
                textAlign: "center",
              }}
            >
              {t("noProductsFound")}
            </div>
          )}
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock === 0}
              style={{
                textAlign: "left",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background:
                  p.stock === 0 ? "var(--surface-alt)" : "var(--surface)",
                cursor: p.stock === 0 ? "not-allowed" : "pointer",
                opacity: p.stock === 0 ? 0.5 : 1,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/10",
                  borderRadius: "8px",
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
                    fontSize: "11.5px",
                    color: p.stock <= 5 ? "var(--danger)" : "var(--text-muted)",
                  }}
                >
                  {p.stock === 0
                    ? t("outOfStock")
                    : `${p.stock} ${prodUnit(p)}`}
                </span>
              </div>
            </button>
          ))}
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
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            style={{
              marginTop: "12px",
              width: "100%",
              padding: "9px 10px",
              borderRadius: "8px",
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
                color: "var(--text-muted)",
                fontSize: "13.5px",
                textAlign: "center",
                padding: "44px 0",
              }}
            >
              {t("emptyCart")}
            </div>
          )}
          {cart.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
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
                  {fmt(c.price)} × {c.qty}
                </div>
              </div>
              <button onClick={() => changeQty(c.id, -1)} style={iconBtnStyle}>
                <Minus size={13} />
              </button>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  fontWeight: 700,
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {c.qty}
              </span>
              <button onClick={() => changeQty(c.id, 1)} style={iconBtnStyle}>
                <Plus size={13} />
              </button>
              <button
                onClick={() => removeFromCart(c.id)}
                style={{ ...iconBtnStyle, color: "var(--danger)" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px dashed var(--border)",
            background: "var(--surface-alt)",
          }}
        >
          <Row label={t("subtotal")} value={fmt(subtotal)} />
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
                  borderRadius: "6px",
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
                borderRadius: "7px",
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
                borderRadius: "7px",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                fontWeight: 700,
              }}
            />
          </div>
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
              borderRadius: "10px",
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
        />
        <StatCard label={t("stat_todayTx")} value={todayCount} icon={Receipt} />
        <StatCard
          label={t("stat_totalRevenue")}
          value={fmt(totalRevenue)}
          icon={BarChart3}
        />
        <StatCard
          label={t("stat_stockValue")}
          value={fmt(totalStockValue)}
          icon={Package}
        />
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
            borderRadius: "14px",
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13.5px",
                    padding: "6px 0",
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
            }}
          >
            {t("manageStock")}
          </button>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
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
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13.5px",
                    padding: "6px 0",
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
            }}
          >
            {t("viewReports")}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
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
        <Icon size={17} color="var(--primary)" />
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 800,
          fontSize: "21px",
          marginTop: "8px",
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
    borderRadius: "7px",
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
            borderRadius: "10px",
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
              borderRadius: "9px",
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
            borderRadius: "9px",
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
                borderRadius: "14px",
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
                  borderRadius: "13px",
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
                    borderRadius: "999px",
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
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "14px",
              textAlign: "center",
              padding: "34px 0",
            }}
          >
            {t("noProducts")}
          </div>
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
              borderRadius: "14px",
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
            borderRadius: "14px",
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
            borderRadius: "14px",
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
                    borderRadius: "6px",
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
            borderRadius: "14px",
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
                      borderRadius: "6px",
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
                {!s.refunded && (
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

function CustomersTab({ customers, openAdd, openEdit, deleteCustomer }) {
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
          <div
            style={{
              gridColumn: "1/-1",
              color: "var(--text-muted)",
              fontSize: "14px",
              textAlign: "center",
              padding: "34px 0",
            }}
          >
            {t("noCustomersYet")}
          </div>
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
                borderRadius: "14px",
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
                      borderRadius: "999px",
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
                            borderRadius: "999px",
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
                            borderRadius: "999px",
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
                  <button
                    onClick={() => setDeleteTarget(c)}
                    style={{ ...iconBtnStyle, color: "var(--danger)" }}
                  >
                    <Trash2 size={13} />
                  </button>
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
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "14px",
              textAlign: "center",
              padding: "34px 0",
            }}
          >
            {t("exp_empty")}
          </div>
        )}
        {sorted.length > 0 && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
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

// ================= Online Orders =================

function OnlineOrdersTab({
  orders,
  archivedOrders,
  products,
  supabaseStatus,
  onAccept,
  onReject,
  onMarkPaid,
  onUndoPaid,
  onCancel,
  onArchiveOrder,
  onArchiveFinished,
  onRestoreOrder,
  onRestoreAllOrders,
  notifySoundOn,
  setNotifySoundOn,
}) {
  const { t, lang } = useT();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [archiveView, setArchiveView] = useState("active"); // 'active' | 'archived'
  const [undoTarget, setUndoTarget] = useState(null);
  const visibleOrders = archiveView === "archived" ? archivedOrders : orders;

  const storeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?order=1`
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
            borderRadius: "12px",
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
          borderRadius: "999px",
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
          borderRadius: "12px",
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
            borderRadius: "12px",
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
            style={{ borderRadius: "8px", background: "#fff", padding: "8px" }}
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
          padding: "16px 26px 26px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "14px",
        }}
      >
        {visibleOrders.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            {archiveView === "archived"
              ? t("archive_ordersEmpty")
              : t("noOnlineOrders")}
          </div>
        )}
        {visibleOrders.map((o) => (
          <div
            key={o.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
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
                      borderRadius: "999px",
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
                          borderRadius: "6px",
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
                    onClick={() => onReject(o)}
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
                    onClick={() => onCancel(o)}
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
    borderRadius: "7px",
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
            borderRadius: "10px",
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
    // the new role list but keep whatever tabs are currently checked in
    // the draft for roles that still exist, instead of discarding them.
    setDraftRoles((prevDraft) =>
      roles.map((r) => {
        const draftMatch = prevDraft.find((d) => d.id === r.id);
        return draftMatch ? { ...r, tabs: draftMatch.tabs } : r;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  const toggleDraftTab = (roleId, tabId) => {
    setDraftRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId || r.locked) return r;
        const has = (r.tabs || []).includes(tabId);
        return {
          ...r,
          tabs: has ? r.tabs.filter((x) => x !== tabId) : [...r.tabs, tabId],
        };
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
                  borderRadius: "14px",
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
                    borderRadius: "13px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      flexShrink: 0,
                      borderRadius: "999px",
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
                            borderRadius: "999px",
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
                      borderRadius: "999px",
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
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "14px",
                textAlign: "center",
                padding: "34px 0",
              }}
            >
              {t("noUsersYet")}
            </div>
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
              {NAV.map((navItem) => (
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
                          disabled={r.locked}
                          onChange={() => toggleDraftTab(r.id, navItem.id)}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: r.locked ? "not-allowed" : "pointer",
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
  const actionColor = {
    add: "var(--success, #16a34a)",
    edit: "var(--primary)",
    delete: "var(--danger)",
    refund: "var(--danger)",
  };
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
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("nav_auditLog")}
        subtitle={t("auditLog_subtitle", { count: auditLog.length })}
      />
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
            {auditLog.map((entry) => (
              <tr
                key={entry.id}
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
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "#fff",
                      background:
                        actionColor[entry.action] || "var(--surface-alt)",
                    }}
                  >
                    {t("audit_action_" + entry.action)}
                  </span>
                </td>
                <td style={tdStyle}>
                  {t("audit_entity_" + entry.entity_type)} —{" "}
                  {entry.entity_label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditLog.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "14px",
              textAlign: "center",
              padding: "34px 0",
            }}
          >
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
  onSavePaymentSettings,
  receiptWidth,
  setReceiptWidth,
}) {
  const { t } = useT();
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const SETTINGS_TABS = [
    { id: "general", label: t("settings_tab_general") },
    { id: "payment", label: t("settings_tab_payment") },
    { id: "currency", label: t("settings_tab_currency") },
    { id: "notifications", label: t("settings_tab_notifications") },
    { id: "printing", label: t("settings_tab_printing") },
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
    if (payKhqrDraft) setPayKhqrDraft(false);
    if (khqrFileRef.current) khqrFileRef.current.value = "";
  };
  const toggleKhqr = () => {
    if (!payKhqrDraft && !khqrImageDraft) {
      setKhqrError(t("settings_khqrNeedsImageWarning"));
      return;
    }
    setKhqrError("");
    setPayKhqrDraft(!payKhqrDraft);
  };
  const savePaymentSettings = () => {
    if (onSavePaymentSettings)
      onSavePaymentSettings(payCashDraft, payKhqrDraft, khqrImageDraft);
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
            borderRadius: "14px",
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
                      borderRadius: "12px",
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
                        borderRadius: "7px",
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
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
                    {t("settings_payKhqrLabel")}
                  </span>
                  <ToggleSwitch on={payKhqrDraft} onClick={toggleKhqr} />
                </div>

                <label style={{ ...fieldLabel, marginTop: "6px" }}>
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
                      borderRadius: "10px",
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
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 12px",
                        borderRadius: "7px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
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
                      borderRadius: "8px",
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
                    borderRadius: "8px",
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
                      borderRadius: "7px",
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
                        borderRadius: "10px",
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
                          borderRadius: "3px",
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
          borderRadius: "16px",
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
            borderRadius: "10px",
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
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,30,27,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "16px",
          width,
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
          borderRadius: "16px",
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
  borderRadius: "9px",
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
            borderRadius: "10px",
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
              borderRadius: "7px",
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
            borderRadius: "9px",
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
            borderRadius: "12px",
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
                    borderRadius: "7px",
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
                  borderRadius: "9px",
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
              borderRadius: "9px",
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
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,30,27,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        "--receipt-print-width": areaWidthPx,
      }}
    >
      <div
        id="receipt-print-area"
        style={{
          background: "var(--surface)",
          borderRadius: "12px",
          width: areaWidthPx,
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
                borderRadius: "8px",
                margin: "0 auto 9px",
                display: "block",
              }}
            />
          ) : (
            <CheckCircle2
              size={32}
              color="var(--primary)"
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
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              marginTop: "3px",
            }}
          >
            {t("paymentSuccess")}
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
            <div
              key={i}
              className="receipt-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                padding: "3px 0",
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
  const [theme, setTheme] = useState(
    () => localStorage.getItem("shop-theme") || "light",
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("shop-theme", theme);
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

  const [status, setStatus] = useState(supabase ? "loading" : "unconfigured"); // loading | ready | error | unconfigured
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
    } catch {
      showToast(t("toast_supabaseError"), "error");
    }
  };

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name_km");
        if (error) throw error;
        setProducts(data || []);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
    (async () => {
      try {
        const { data } = await supabase.from("categories").select("*");
        if (data && data.length) {
          setCategories(
            data.map((r) => ({
              key: r.key,
              label_km: r.label_km,
              label_en: r.label_en,
            })),
          );
        }
      } catch {
        /* keep default categories */
      }
    })();
    (async () => {
      try {
        const { data } = await supabase
          .from("shop_settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle();
        if (data) {
          setPayCashEnabled(
            typeof data.pay_cash_enabled === "boolean"
              ? data.pay_cash_enabled
              : true,
          );
          setPayKhqrEnabled(!!data.pay_khqr_enabled);
          setKhqrImage(data.khqr_image || "");
          if (!data.pay_cash_enabled && data.pay_khqr_enabled) {
            setPaymentMethod("khqr");
          }
        }
      } catch {
        /* keep default (cash only) */
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
                  borderRadius: "10px",
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
                      borderRadius: "10px",
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
                        borderRadius: "12px",
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
                            borderRadius: "8px",
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
                borderRadius: "12px",
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
                borderRadius: "16px",
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
                    borderRadius: "13px",
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
                    borderRadius: "10px",
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
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    style={{
                      textAlign: "left",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "10px",
                      cursor: p.stock > 0 ? "pointer" : "not-allowed",
                      opacity: p.stock > 0 ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: "9px",
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
                          fontSize: "10.5px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {p.stock > 0
                          ? `${p.stock} ${prodUnit(p)}`
                          : t("storefront_outOfStock")}
                      </span>
                    </div>
                  </button>
                ))}
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
                        {t("storefront_cartTitle")}{" "}
                        {`(${cart.reduce((s, c) => s + c.qty, 0)})`}
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
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "6px 0",
                            }}
                          >
                            <div style={{ flex: 1, fontSize: "13px" }}>
                              {c.name}
                            </div>
                            <button
                              onClick={() => changeQty(c.id, -1)}
                              style={iconBtnStyle}
                            >
                              <Minus size={12} />
                            </button>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                                minWidth: "18px",
                                textAlign: "center",
                              }}
                            >
                              {c.qty}
                            </span>
                            <button
                              onClick={() => changeQty(c.id, 1)}
                              style={iconBtnStyle}
                            >
                              <Plus size={12} />
                            </button>
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
                                    borderRadius: "9px",
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
                                    borderRadius: "9px",
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
                                    borderRadius: "12px",
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
                                      borderRadius: "8px",
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
              borderRadius: "9px",
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
