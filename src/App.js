import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { SAMPLE_PRODUCTS, OFFERS, FREE_DELIVERY_ABOVE, DELIVERY_FEE } from "./data";
import Header from "./components/Header";
import Home from "./components/Home";
import Catalog from "./components/Catalog";
import Best from "./components/Best";
import CartPage from "./components/CartPage";
import Checkout from "./components/Checkout";
import AuthModal from "./components/AuthModal";
import Offers from "./components/Offers";
import Contact from "./components/Contact";
import Seller from "./components/Seller";
import Account from "./components/Account";

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export default function App() {
  const [page, setPage] = useState("home");
  const [category, setCategory] = useState("All");
  const [products, setProducts] = useState(() => load("mc_products", SAMPLE_PRODUCTS));
  const [cart, setCart] = useState(() => load("mc_cart", {}));
  const [users, setUsers] = useState(() => load("mc_users", []));
  const [user, setUser] = useState(() => load("mc_user", null));
  const [orders, setOrders] = useState(() => load("mc_orders", []));
  const [coupon, setCoupon] = useState(null);
  const [auth, setAuth] = useState({ open: false, message: "", next: null });
  const [promptShown, setPromptShown] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => save("mc_products", products), [products]);
  useEffect(() => save("mc_cart", cart), [cart]);
  useEffect(() => save("mc_users", users), [users]);
  useEffect(() => save("mc_user", user), [user]);
  useEffect(() => save("mc_orders", orders), [orders]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const go = (p) => {
    setPage(p);
    window.scrollTo({ top: 0 });
  };

  const openCategory = (cat) => {
    setCategory(cat);
    go("catalog");
  };

  /* ---------- cart ---------- */
  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
        .filter((i) => i.product),
    [cart, products]
  );
  const cartCount = cartItems.reduce((n, i) => n + i.qty, 0);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
    let discount = 0;
    if (coupon && subtotal >= coupon.min) {
      discount = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
    }
    const after = subtotal - discount;
    const delivery = subtotal === 0 || after >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    return { subtotal, discount, delivery, total: after + delivery };
  }, [cartItems, coupon]);

  const addToCart = (p) => {
    if (p.stock <= 0) return showToast("This item is out of stock");
    const current = cart[p.id] || 0;
    if (current >= p.stock) return showToast(`Only ${p.stock} in stock`);
    setCart({ ...cart, [p.id]: current + 1 });
    showToast("Added to cart");
    if (!user && !promptShown) {
      setPromptShown(true);
      setAuth({
        open: true,
        message: "Create an account to save your cart, track orders and get member-only offers.",
        next: null,
      });
    }
  };

  const changeQty = (id, delta) => {
    const p = products.find((x) => x.id === id);
    const next = (cart[id] || 0) + delta;
    const copy = { ...cart };
    if (next <= 0) delete copy[id];
    else if (p && next > p.stock) return showToast(`Only ${p.stock} in stock`);
    else copy[id] = next;
    setCart(copy);
  };

  const applyCoupon = (code) => {
    const found = OFFERS.find((o) => o.code === code.trim().toUpperCase());
    if (!found) return showToast("Coupon code not found");
    if (totals.subtotal < found.min) return showToast(`Add items worth ₹${found.min} to use ${found.code}`);
    setCoupon(found);
    showToast(`${found.code} applied`);
  };

  /* ---------- auth ---------- */
  const handleAuth = (mode, form) => {
    const email = form.email.trim().toLowerCase();
    if (mode === "signup") {
      if (users.some((u) => u.email === email)) return "An account with this email already exists. Sign in instead.";
      const newUser = { name: form.name.trim(), email, password: form.password, role: form.role };
      setUsers([...users, newUser]);
      setUser(newUser);
    } else {
      const found = users.find((u) => u.email === email && u.password === form.password);
      if (!found) return "Email or password is incorrect.";
      setUser(found);
    }
    const next = auth.next;
    setAuth({ open: false, message: "", next: null });
    if (next) go(next);
    return null;
  };

  const logout = () => {
    setUser(null);
    go("home");
  };

  const openAuth = (message = "", next = null) => setAuth({ open: true, message, next });

  const goCheckout = () => {
    if (cartItems.length === 0) return showToast("Your cart is empty");
    if (!user) return openAuth("Sign in to continue to checkout.", "checkout");
    go("checkout");
  };

  /* ---------- orders and seller ---------- */
  const placeOrder = (details) => {
    const order = {
      id: "MC" + Date.now().toString().slice(-8),
      date: new Date().toLocaleString("en-IN"),
      email: user?.email,
      items: cartItems.map((i) => ({ id: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty })),
      totals,
      coupon: coupon?.code || null,
      ...details,
    };
    setOrders([order, ...orders]);
    // reduce stock
    setProducts(products.map((p) => (cart[p.id] ? { ...p, stock: Math.max(0, p.stock - cart[p.id]), sold: p.sold + cart[p.id] } : p)));
    setCart({});
    setCoupon(null);
    return order;
  };

  const addProducts = (list) => setProducts([...list, ...products]);
  const updateProduct = (id, patch) => setProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const deleteProduct = (id) => setProducts(products.filter((p) => p.id !== id));

  const isSeller = user?.role === "seller";

  return (
    <div className="app">
      <Header page={page} go={go} cartCount={cartCount} user={user} onSignIn={() => openAuth()} onLogout={logout} />

      <main className="main">
        {page === "home" && <Home products={products} go={go} onCategory={openCategory} onAdd={addToCart} />}
        {page === "catalog" && <Catalog products={products} category={category} setCategory={setCategory} onAdd={addToCart} />}
        {page === "best" && <Best products={products} onAdd={addToCart} />}
        {page === "offers" && <Offers onApply={(c) => { applyCoupon(c); go("cart"); }} showToast={showToast} />}
        {page === "contact" && <Contact />}
        {page === "cart" && (
          <CartPage items={cartItems} totals={totals} coupon={coupon} onQty={changeQty} onApply={applyCoupon} onCheckout={goCheckout} go={go} />
        )}
        {page === "checkout" && <Checkout user={user} totals={totals} items={cartItems} onPlace={placeOrder} go={go} />}
        {page === "account" && user && <Account user={user} orders={orders.filter((o) => o.email === user.email)} />}
        {page === "seller" && isSeller && (
          <Seller products={products} orders={orders} onAdd={addProducts} onUpdate={updateProduct} onDelete={deleteProduct} showToast={showToast} />
        )}
        {page === "seller" && !isSeller && <p className="notice">Sign in with a seller account to manage products.</p>}
      </main>

      <footer className="footer">
        <div>
          <strong>MotherCare</strong>
          <p>Baby products and daily essentials, delivered with care.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => go("offers")}>Offers</button>
          <button onClick={() => go("contact")}>Contact us</button>
        </div>
      </footer>

      {auth.open && (
        <AuthModal message={auth.message} onSubmit={handleAuth} onClose={() => setAuth({ open: false, message: "", next: null })} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
