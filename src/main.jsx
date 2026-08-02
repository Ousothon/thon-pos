import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import {
  useState,
  useEffect,
  useMemo,
  useContext,
  createContext,
  useRef,
} from "react";
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
} from "lucide-react";

const STORAGE_KEY = "shop-data";
const CATEGORY_KEYS = ["beverage", "food", "household", "snack", "other"];

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
  },
  {
    id: "u2",
    username: "staff",
    password: "staff123",
    name_km: "បុគ្គលិកលក់",
    name_en: "Sales Staff",
    role: "staff",
  },
];

// which tabs each role may see
const ROLE_PERMS = {
  admin: ["pos", "dashboard", "inventory", "reports", "customers", "users"],
  staff: ["pos", "customers"],
};

const SESSION_KEY = "shop-session";

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n) => "$" + (Number(n) || 0).toFixed(2);

// ---------------- i18n ----------------
const STRINGS = {
  shopNameDefault: { km: "ហាង POS", en: "My Shop" },
  tagline: { km: "ប្រព័ន្ធគ្រប់គ្រងលក់", en: "Sales management system" },
  todaySales: { km: "ថ្ងៃនេះលក់បាន", en: "Today's sales" },
  loading: { km: "កំពុងផ្ទុកទិន្នន័យ...", en: "Loading data..." },

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

  searchProducts: { km: "ស្វែងរកទំនិញ...", en: "Search products..." },
  noProductsFound: { km: "រកមិនឃើញទំនិញ", en: "No products found" },
  outOfStock: { km: "អស់ស្តុក", en: "Out of stock" },

  invoice: { km: "វិក្កយបត្រ", en: "Invoice" },
  walkInCustomer: { km: "អតិថិជនធម្មតា (មិនកំណត់)", en: "Walk-in customer" },
  emptyCart: { km: "មិនទាន់មានទំនិញនៅឡើយ", en: "No items added yet" },
  subtotal: { km: "សរុបរង", en: "Subtotal" },
  discountAmount: { km: "បញ្ចុះតម្លៃ ($)", en: "Discount ($)" },
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
  th_stock: { km: "ស្តុក", en: "Stock" },
  noProducts: { km: "មិនមានទំនិញ", en: "No products" },

  editProduct: { km: "កែប្រែទំនិញ", en: "Edit product" },
  addProductTitle: { km: "បន្ថែមទំនិញថ្មី", en: "Add new product" },
  fieldName: { km: "ឈ្មោះទំនិញ", en: "Product name" },
  fieldNamePlaceholder: { km: "ឧ. ទឹកសុទ្ធ 500ml", en: "e.g. Water 500ml" },
  fieldCategory: { km: "ប្រភេទ", en: "Category" },
  fieldPrice: { km: "តម្លៃ ($)", en: "Price ($)" },
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
  topProducts: { km: "ទំនិញលក់ដាច់បំផុត", en: "Best-selling products" },
  noData: { km: "មិនមានទិន្នន័យ", en: "No data yet" },
  transactions: { km: "ប្រតិបត្តិការ ({count})", en: "Transactions ({count})" },
  noTransactions: { km: "មិនមានប្រតិបត្តិការ", en: "No transactions" },
  exportCsv: { km: "នាំចេញ CSV", en: "Export CSV" },

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
  loginBtn: { km: "ចូលប្រើប្រព័ន្ធ", en: "Sign in" },
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
  users_subtitle: { km: "{count} គណនី", en: "{count} accounts" },
  addUser: { km: "បន្ថែមអ្នកប្រើប្រាស់", en: "Add user" },
  editUser: { km: "កែប្រែអ្នកប្រើប្រាស់", en: "Edit user" },
  addUserTitle: { km: "បន្ថែមអ្នកប្រើប្រាស់ថ្មី", en: "Add new user" },
  fieldFullName: { km: "ឈ្មោះពេញ (ខ្មែរ)", en: "Full name (Khmer)" },
  fieldFullNameEn: { km: "ឈ្មោះពេញ (English)", en: "Full name (English)" },
  fieldRole: { km: "តួនាទី", en: "Role" },
  role_admin: { km: "អ្នកគ្រប់គ្រង (Admin)", en: "Admin" },
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
  permDenied: {
    km: "អ្នកគ្មានសិទ្ធិចូលមើលទំព័រនេះទេ",
    en: "You don't have permission to view this page",
  },
};

const LangContext = createContext({ lang: "km", t: (k) => k });
function useT() {
  return useContext(LangContext);
}

// ---------------- image helper ----------------
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

const NAV = [
  { id: "pos", key: "nav_pos", icon: ShoppingCart },
  { id: "dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { id: "inventory", key: "nav_inventory", icon: Package },
  { id: "reports", key: "nav_reports", icon: BarChart3 },
  { id: "customers", key: "nav_customers", icon: Users },
  { id: "users", key: "nav_users", icon: UserCog },
];

export default function POSApp() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shopName, setShopName] = useState("");
  const [lang, setLang] = useState("km");
  const [activeTab, setActiveTab] = useState("pos");
  const [toast, setToast] = useState(null);

  const [users, setUsers] = useState([]);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [userModal, setUserModal] = useState(null);
  const [loginError, setLoginError] = useState("");

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [receipt, setReceipt] = useState(null);

  const [invSearch, setInvSearch] = useState("");
  const [invCategory, setInvCategory] = useState("all");
  const [productModal, setProductModal] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);

  const [reportRange, setReportRange] = useState("today");
  const [expandedSale, setExpandedSale] = useState(null);
  const [editingShopName, setEditingShopName] = useState(false);

  const t = (key, vars) => {
    const entry = STRINGS[key];
    let str = entry ? entry[lang] || entry.km : key;
    if (vars)
      Object.keys(vars).forEach((k) => {
        str = str.replace(`{${k}}`, vars[k]);
      });
    return str;
  };
  const catLabel = (cat) => t("cat_" + cat);
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
        setShopName(parsed.shopName || "");
        setLang(parsed.lang || "km");
        setUsers(
          parsed.users && parsed.users.length ? parsed.users : seedUsers,
        );
      } else {
        setProducts(seedProducts);
        setUsers(seedUsers);
      }
      const sess = localStorage.getItem(SESSION_KEY);
      if (sess) setSessionUserId(sess);
    } catch {
      setProducts(seedProducts);
      setUsers(seedUsers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ products, sales, customers, shopName, lang, users }),
        );
      } catch {
        showToast(t("toast_saveFailed"), "error");
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, sales, customers, shopName, lang, users, loading]);

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
  const allowedTabs = currentUser ? ROLE_PERMS[currentUser.role] || [] : [];
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
    setLoginError("");
    setSessionUserId(match.id);
    const perms = ROLE_PERMS[match.role] || [];
    setActiveTab(perms.includes("pos") ? "pos" : perms[0] || "pos");
  };
  const logout = () => {
    setSessionUserId(null);
  };

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
      setUsers(
        users.map((u) =>
          u.id === form.id
            ? {
                ...u,
                ...form,
                password: form.password ? form.password : u.password,
              }
            : u,
        ),
      );
      showToast(t("toast_userUpdated"));
    } else {
      setUsers([...users, { ...form, id: genId() }]);
      showToast(t("toast_userAdded"));
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
  };

  // ---------- POS ----------
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = prodName(p)
        .toLowerCase()
        .includes(search.toLowerCase());
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
          unit: prodUnit(product),
          qty: 1,
          image: product.image,
        },
      ]);
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
  const discountAmt = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - discountAmt;
  const paymentNum = Number(payment) || 0;
  const change = paymentNum - total;

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || null;
  const customerDiscountPercent = selectedCustomer
    ? Number(selectedCustomer.discount_percent) || 0
    : 0;

  // auto-fill the discount amount whenever the selected member customer changes
  useEffect(() => {
    if (selectedCustomer && customerDiscountPercent > 0) {
      setDiscount(((subtotal * customerDiscountPercent) / 100).toFixed(2));
    } else if (!selectedCustomerId) {
      setDiscount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  const reapplyCustomerDiscount = () => {
    if (selectedCustomer && customerDiscountPercent > 0) {
      setDiscount(((subtotal * customerDiscountPercent) / 100).toFixed(2));
    }
  };

  const clearSale = () => {
    setCart([]);
    setDiscount("");
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
    };
    setSales([sale, ...sales]);
    setProducts(
      products.map((p) => {
        const item = cart.find((c) => c.id === p.id);
        return item ? { ...p, stock: p.stock - item.qty } : p;
      }),
    );
    if (customer) {
      setCustomers(
        customers.map((c) =>
          c.id === customer.id
            ? {
                ...c,
                totalSpent: (c.totalSpent || 0) + total,
                visits: (c.visits || 0) + 1,
                points: (c.points || 0) + Math.floor(total),
              }
            : c,
        ),
      );
    }
    setReceipt(sale);
    clearSale();
    showToast(t("toast_saleSuccess"), "ok");
  };

  // ---------- Inventory ----------
  const invFiltered = useMemo(() => {
    return products.filter((p) => {
      const m1 = prodName(p).toLowerCase().includes(invSearch.toLowerCase());
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
      setProducts(
        products.map((p) =>
          p.id === form.id
            ? {
                ...p,
                ...form,
                price: Number(form.price),
                stock: Number(form.stock) || 0,
              }
            : p,
        ),
      );
      showToast(t("toast_productUpdated"));
    } else {
      setProducts([
        ...products,
        {
          ...form,
          id: genId(),
          price: Number(form.price),
          stock: Number(form.stock) || 0,
        },
      ]);
      showToast(t("toast_productAdded"));
    }
    setProductModal(null);
  };

  const deleteProduct = (id) => {
    setProducts(products.filter((p) => p.id !== id));
    showToast(t("toast_productDeleted"));
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
      setCustomers(
        customers.map((c) => (c.id === clean.id ? { ...c, ...clean } : c)),
      );
      showToast(t("toast_customerUpdated"));
    } else {
      setCustomers([
        ...customers,
        { ...clean, id: genId(), totalSpent: 0, visits: 0, points: 0 },
      ]);
      showToast(t("toast_customerAdded"));
    }
    setCustomerModal(null);
  };
  const deleteCustomer = (id) => {
    setCustomers(customers.filter((c) => c.id !== id));
    showToast(t("toast_customerDeleted"));
  };

  // ---------- Reports ----------
  const rangedSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
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

  const reportSummary = useMemo(() => {
    const revenue = rangedSales.reduce((s, sale) => s + sale.total, 0);
    const itemsSold = rangedSales.reduce(
      (s, sale) => s + sale.items.reduce((a, i) => a + i.qty, 0),
      0,
    );
    const txCount = rangedSales.length;
    const avg = txCount ? revenue / txCount : 0;
    const productMap = {};
    rangedSales.forEach((sale) =>
      sale.items.forEach((i) => {
        productMap[i.name] = (productMap[i.name] || 0) + i.qty;
      }),
    );
    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { revenue, itemsSold, txCount, avg, topProducts };
  }, [rangedSales]);

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
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
        (s) => new Date(s.date).toDateString() === new Date().toDateString(),
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
      <LangContext.Provider value={{ lang, t, catLabel }}>
        <LoginScreen
          shopName={shopName || t("shopNameDefault")}
          lang={lang}
          setLang={setLang}
          onLogin={login}
          error={loginError}
          clearError={() => setLoginError("")}
        />
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, t, catLabel }}>
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

        <div
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
            {editingShopName ? (
              <input
                autoFocus
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                onBlur={() => {
                  setEditingShopName(false);
                  showToast(t("toast_shopNameSaved"));
                }}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "var(--primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "2px 6px",
                  width: "100%",
                }}
              />
            ) : (
              <div
                onClick={() => setEditingShopName(true)}
                title={
                  lang === "en" ? "Click to rename" : "ចុចដើម្បីប្តូរឈ្មោះ"
                }
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "var(--primary)",
                  lineHeight: 1.3,
                  cursor: "pointer",
                }}
              >
                {shopName || t("shopNameDefault")}
              </div>
            )}
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
                  onClick={() => setActiveTab(n.id)}
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
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto" }}>
            <div style={{ padding: "10px 14px" }}>
              <button
                onClick={() => setLang(lang === "km" ? "en" : "km")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  padding: "9px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                <Globe size={15} /> {lang === "km" ? "English" : "ភាសាខ្មែរ"}
              </button>
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
                  {currentUser.role === "admin"
                    ? t("role_admin")
                    : t("role_staff")}
                </div>
              </div>
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
              reapplyCustomerDiscount={reapplyCustomerDiscount}
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
            />
          )}
          {activeTab === "reports" && (
            <ReportsTab
              reportRange={reportRange}
              setReportRange={setReportRange}
              summary={reportSummary}
              sales={rangedSales}
              expandedSale={expandedSale}
              setExpandedSale={setExpandedSale}
              exportCsv={exportCsv}
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
          {activeTab === "users" && allowedTabs.includes("users") && (
            <UsersTab
              users={users}
              currentUser={currentUser}
              openAdd={() => setUserModal({ mode: "add" })}
              openEdit={(u) => setUserModal({ mode: "edit", user: u })}
              deleteUser={deleteUser}
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
        {userModal && (
          <UserModal
            data={userModal}
            onClose={() => setUserModal(null)}
            onSave={saveUser}
          />
        )}
        {receipt && (
          <ReceiptModal
            sale={receipt}
            shopName={shopName || t("shopNameDefault")}
            onClose={() => setReceipt(null)}
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
      * { box-sizing: border-box; }
      input, select { font-family: var(--font-body); outline: none; }
      input:focus, select:focus { border-color: var(--primary) !important; }
      ::-webkit-scrollbar { width: 9px; height: 9px; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 5px; }
      button { font-family: var(--font-body); }
    `}</style>
  );
}

function LoginScreen({ shopName, lang, setLang, onLogin, error, clearError }) {
  const { t } = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    onLogin(username, password);
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
      <button
        onClick={() => setLang(lang === "km" ? "en" : "km")}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          cursor: "pointer",
          fontSize: "12.5px",
          fontWeight: 700,
          color: "var(--text)",
        }}
      >
        <Globe size={14} /> {lang === "km" ? "English" : "ភាសាខ្មែរ"}
      </button>
      <form
        onSubmit={submit}
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
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <ShieldCheck size={26} color="#fff" />
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
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              clearError();
            }}
            style={{ ...fieldInput, marginBottom: 0, paddingLeft: "36px" }}
            placeholder="admin"
          />
        </div>

        <label style={fieldLabel}>{t("fieldPassword")}</label>
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
            }}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
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
          style={{
            ...primaryBtnStyle,
            width: "100%",
            justifyContent: "center",
            marginTop: "10px",
          }}
        >
          {t("loginBtn")}
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
const thStyle = { padding: "8px 12px", fontWeight: 600 };
const tdStyle = { padding: "11px 12px" };

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
  const { t } = useT();
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
    reapplyCustomerDiscount,
  } = props;

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <div
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
              placeholder={t("searchProducts")}
              style={{
                width: "100%",
                padding: "11px 14px 11px 38px",
                borderRadius: "9px",
                border: "1px solid var(--border)",
                fontSize: "14px",
                background: "var(--surface-alt)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
            <CategoryPill
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
              label={t("cat_all")}
            />
            {CATEGORY_KEYS.map((c) => (
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
            gridTemplateColumns: "repeat(3, 1fr)",
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
              <button
                onClick={reapplyCustomerDiscount}
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
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {t("discountAmount")}
            </span>
            <input
              type="number"
              min="0"
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
          <Row label={t("total")} value={fmt(total)} bold big />
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
          <Row label={t("changeDue")} value={fmt(Math.max(change, 0))} accent />
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

function Row({ label, value, bold, big, accent }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
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
  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar title={t("dash_title")} subtitle={t("dash_subtitle")} />
      <div
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
}) {
  const { t } = useT();
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
          {CATEGORY_KEYS.map((c) => (
            <option key={c} value={c}>
              {catLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ padding: "16px 26px 26px" }}>
        <table
          style={{
            width: "100%",
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
              <th style={thStyle}></th>
              <th style={thStyle}>{t("th_product")}</th>
              <th style={thStyle}>{t("th_category")}</th>
              <th style={thStyle}>{t("th_price")}</th>
              <th style={thStyle}>{t("th_stock")}</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ ...tdStyle, width: "50px" }}>
                  <ProductThumb image={p.image} size={38} />
                </td>
                <td style={tdStyle}>{prodName(p)}</td>
                <td style={{ ...tdStyle, color: "var(--text-muted)" }}>
                  {catLabel(p.category)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                  }}
                >
                  {fmt(p.price)}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      color: p.stock <= 5 ? "var(--danger)" : "var(--text)",
                      fontWeight: p.stock <= 5 ? 700 : 500,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {p.stock} {prodUnit(p)}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button
                    onClick={() => openEdit(p)}
                    style={{ ...iconBtnStyle, marginRight: "7px" }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    style={{ ...iconBtnStyle, color: "var(--danger)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function ReportsTab({
  reportRange,
  setReportRange,
  summary,
  sales,
  expandedSale,
  setExpandedSale,
  exportCsv,
}) {
  const { t, lang } = useT();
  const ranges = [
    { id: "today", key: "range_today" },
    { id: "week", key: "range_week" },
    { id: "month", key: "range_month" },
    { id: "all", key: "range_all" },
  ];
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
          </div>
        }
      />
      <div
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
      </div>

      <div
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
            {t("transactions", { count: sales.length })}
          </div>
          {sales.length === 0 && (
            <div style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
              {t("noTransactions")}
            </div>
          )}
          {sales.map((s) => (
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
                  }}
                >
                  {fmt(s.total)}
                </span>
              </button>
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
    </div>
  );
}

// ================= Customers =================

function CustomersTab({ customers, openAdd, openEdit, deleteCustomer }) {
  const { t } = useT();
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
      <div
        style={{
          padding: "18px 26px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
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
        {customers.map((c) => (
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
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "7px" }}
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
              <div style={{ display: "flex", gap: "5px" }}>
                <button onClick={() => openEdit(c)} style={iconBtnStyle}>
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteCustomer(c.id)}
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
        ))}
      </div>
    </div>
  );
}

// ================= Users (admin only) =================

function UsersTab({ users, currentUser, openAdd, openEdit, deleteUser }) {
  const { t, lang } = useT();
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar
        title={t("nav_users")}
        subtitle={t("users_subtitle", { count: users.length })}
        action={
          <button onClick={openAdd} style={primaryBtnStyle}>
            <UserPlus size={16} /> {t("addUser")}
          </button>
        }
      />
      <div style={{ padding: "16px 26px 26px" }}>
        <table
          style={{
            width: "100%",
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
              <th style={thStyle}></th>
              <th style={thStyle}>{t("th_name")}</th>
              <th style={thStyle}>{t("th_username")}</th>
              <th style={thStyle}>{t("th_role")}</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ ...tdStyle, width: "46px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "999px",
                      background: "var(--surface-alt)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UserIcon size={15} color="var(--primary)" />
                  </div>
                </td>
                <td style={tdStyle}>
                  {lang === "en" ? u.name_en || u.name_km : u.name_km}
                  {u.id === currentUser.id && (
                    <span
                      style={{
                        marginLeft: "7px",
                        fontSize: "11px",
                        color: "var(--primary)",
                        fontWeight: 700,
                      }}
                    >
                      ({t("loggedInAs")})
                    </span>
                  )}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  {u.username}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      background:
                        u.role === "admin"
                          ? "var(--primary)"
                          : "var(--surface-alt)",
                      color: u.role === "admin" ? "#fff" : "var(--text)",
                    }}
                  >
                    {u.role === "admin" ? t("role_admin") : t("role_staff")}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button
                    onClick={() => openEdit(u)}
                    style={{ ...iconBtnStyle, marginRight: "7px" }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    style={{ ...iconBtnStyle, color: "var(--danger)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
}

// ================= Modals =================

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
  const { t, catLabel } = useT();
  const editing = data.mode === "edit";
  const p = editing
    ? data.product
    : {
        name_km: "",
        name_en: "",
        category: CATEGORY_KEYS[0],
        price: "",
        stock: "",
        unit_km: "",
        unit_en: "",
        image: null,
      };
  const [form, setForm] = useState(p);
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
        {CATEGORY_KEYS.map((c) => (
          <option key={c} value={c}>
            {catLabel(c)}
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

      <button
        onClick={() => onSave(form)}
        style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center" }}
      >
        {t("save")}
      </button>
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

function UserModal({ data, onClose, onSave }) {
  const { t } = useT();
  const editing = data.mode === "edit";
  const u = editing
    ? data.user
    : { name_km: "", name_en: "", username: "", password: "", role: "staff" };
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
          style={{ ...fieldInput, paddingRight: "36px" }}
          value={form.password || ""}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={editing ? "••••••••" : ""}
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
      <label style={fieldLabel}>{t("fieldRole")}</label>
      <div style={{ display: "flex", gap: "9px", marginBottom: "18px" }}>
        {["admin", "staff"].map((r) => (
          <button
            key={r}
            onClick={() => setForm({ ...form, role: r })}
            style={{
              flex: 1,
              padding: "9px 10px",
              borderRadius: "9px",
              cursor: "pointer",
              fontSize: "13.5px",
              fontWeight: 700,
              border:
                form.role === r
                  ? "1.5px solid var(--primary)"
                  : "1px solid var(--border)",
              background:
                form.role === r ? "var(--primary)" : "var(--surface-alt)",
              color: form.role === r ? "#fff" : "var(--text)",
            }}
          >
            {r === "admin" ? t("role_admin") : t("role_staff")}
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

function ReceiptModal({ sale, shopName, onClose }) {
  const { t, lang } = useT();
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
        id="receipt-print-area"
        style={{
          background: "var(--surface)",
          borderRadius: "12px",
          width: "300px",
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
          <CheckCircle2
            size={32}
            color="var(--primary)"
            style={{ margin: "0 auto 9px" }}
          />
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
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 0",
              }}
            >
              <span>
                {it.name} ×{it.qty}
              </span>
              <span>{fmt(it.price * it.qty)}</span>
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
              <span>{fmt(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{STRINGS.discountAmount[lang].replace(" ($)", "")}</span>
                <span>-{fmt(sale.discount)}</span>
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
              <span>{fmt(sale.total)}</span>
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
              <span>{fmt(sale.paid)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-muted)",
              }}
            >
              <span>{t("changeDue")}</span>
              <span>{fmt(sale.change)}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 22px 20px", display: "flex", gap: "10px" }}>
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
