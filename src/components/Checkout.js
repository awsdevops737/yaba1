import { useState } from "react";
import { formatPrice } from "../data";
import { Summary } from "./CartPage";

export default function Checkout({ user, totals, items, onPlace, go }) {
  const [form, setForm] = useState({ name: user?.name || "", phone: "", address: "", pincode: "" });
  const [method, setMethod] = useState("upi");
  const [upi, setUpi] = useState("");
  const [status, setStatus] = useState("form"); // form | processing | success
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pay = async (e) => {
    e.preventDefault();
    if (!form.name || !/^\d{10}$/.test(form.phone) || !form.address || !/^\d{6}$/.test(form.pincode))
      return setError("Fill in your name, a 10-digit phone number, address and a 6-digit pincode.");
    if (method === "upi" && !/^[\w.-]+@[\w]+$/.test(upi)) return setError("Enter a valid UPI ID, for example name@bank.");
    setError("");
    setStatus("processing");

    // ---------------------------------------------------------------
    // PAYMENT GATEWAY PLACEHOLDER
    // Replace this delay with your gateway (Razorpay, Cashfree, Stripe...):
    //   1. Call your backend to create a payment order.
    //   2. Open the gateway checkout with the order id.
    //   3. Verify the payment signature on your backend, then place the order.
    // ---------------------------------------------------------------
    await new Promise((r) => setTimeout(r, 1800));

    const placed = onPlace({ shipping: form, paymentMethod: method, status: method === "cod" ? "Pay on delivery" : "Paid" });
    setOrder(placed);
    setStatus("success");
  };

  if (status === "success" && order) {
    return (
      <section className="center-box">
        <div className="success-mark" aria-hidden="true">✓</div>
        <h1>Order placed</h1>
        <p>Your order <strong>{order.id}</strong> is confirmed. Total {formatPrice(order.totals.total)}.</p>
        <div className="row center-row">
          <button className="btn primary" onClick={() => go("account")}>View my orders</button>
          <button className="btn ghost" onClick={() => go("catalog")}>Keep shopping</button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>Checkout</h1>
      <form className="two-col" onSubmit={pay}>
        <div className="panel">
          <h3>Delivery address</h3>
          <label>Full name<input value={form.name} onChange={set("name")} /></label>
          <label>Phone<input inputMode="numeric" maxLength={10} value={form.phone} onChange={set("phone")} /></label>
          <label>Address<textarea rows={3} value={form.address} onChange={set("address")} /></label>
          <label>Pincode<input inputMode="numeric" maxLength={6} value={form.pincode} onChange={set("pincode")} /></label>

          <h3>Payment method</h3>
          {[["upi", "UPI"], ["card", "Credit or debit card"], ["netbanking", "Net banking"], ["cod", "Cash on delivery"]].map(([k, label]) => (
            <label key={k} className="radio">
              <input type="radio" name="pay" checked={method === k} onChange={() => setMethod(k)} /> {label}
            </label>
          ))}
          {method === "upi" && <label>UPI ID<input placeholder="name@bank" value={upi} onChange={(e) => setUpi(e.target.value)} /></label>}
          {(method === "card" || method === "netbanking") && (
            <p className="muted small">You will enter your {method === "card" ? "card" : "bank"} details securely on the payment gateway page.</p>
          )}
        </div>
        <aside>
          <Summary totals={totals} coupon={null} />
          <p className="muted small">{items.length} item type(s) in this order</p>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary block" disabled={status === "processing"}>
            {status === "processing" ? "Processing payment…" : method === "cod" ? "Place order" : `Pay ${formatPrice(totals.total)}`}
          </button>
        </aside>
      </form>
    </section>
  );
}
