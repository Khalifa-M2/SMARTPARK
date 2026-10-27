import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate
} from "react-router-dom";
import api, { errorMessage } from "./api";

const AuthContext = createContext(null);
const today = () => new Date().toLocaleDateString("en-CA");
const money = (value) => new Intl.NumberFormat("en-RW", {
  style: "currency", currency: "RWF", maximumFractionDigits: 0
}).format(Number(value || 0));
const shortDate = (value) => value
  ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })
      .format(new Date(`${value}T00:00:00Z`))
  : "—";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch((error) => {
        if (error.response?.status !== 401) setAuthError(errorMessage(error));
      })
      .finally(() => setLoading(false));
  }, []);

  const auth = useMemo(() => ({
    user,
    setUser,
    signOut: async () => {
      await api.post("/auth/logout");
      setUser(null);
    }
  }), [user]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading SmartPark…</div>;
  }

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login error={authError} />} />
        <Route path="/*" element={user
          ? <ProtectedPages />
          : <Navigate to="/login" replace state={{ from: window.location.pathname }} />} />
      </Routes>
    </AuthContext.Provider>
  );
}

function ProtectedPages() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="spare-parts" element={<SpareParts />} />
        <Route path="stock-in" element={<StockIn />} />
        <Route path="stock-out" element={<StockOut />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Login({ error: startupError }) {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(startupError);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { username, password });
      setUser(data.user);
      navigate(location.state?.from || "/", { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-blue-700 to-indigo-950 p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-xl font-black">S</div>
            <span className="font-bold tracking-wide">SMARTPARK</span>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[.22em] text-blue-200">Inventory control</p>
            <h1 className="max-w-sm text-4xl font-bold leading-tight">Know what’s in stock. Keep work moving.</h1>
            <p className="mt-5 max-w-sm leading-7 text-blue-100">Manage spare parts, stock movements and daily reports from one place.</p>
          </div>
          <p className="text-sm text-blue-200">Rubavu, Rwanda · Stock Inventory Management System</p>
        </section>
        <section className="p-7 sm:p-11">
          <div className="mb-9 md:hidden">
            <p className="font-extrabold tracking-wider text-blue-700">SMARTPARK</p>
          </div>
          <p className="text-sm font-semibold text-blue-600">Welcome back</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Sign in to SIMS</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use your inventory manager account to continue.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="label">Username
              <input autoComplete="username" required value={username}
                onChange={(event) => setUsername(event.target.value)} className="field" />
            </label>
            <label className="label">Password
              <input type="password" autoComplete="current-password" required value={password}
                onChange={(event) => setPassword(event.target.value)} className="field" />
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <button disabled={busy} className="button-primary w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-xs leading-5 text-slate-400">Account setup is managed by the system administrator.</p>
        </section>
      </div>
    </main>
  );
}

const navigation = [
  { to: "/", label: "Overview", end: true },
  { to: "/spare-parts", label: "Spare parts" },
  { to: "/stock-in", label: "Stock in" },
  { to: "/stock-out", label: "Stock out" },
  { to: "/reports", label: "Reports" }
];

function Layout() {
  const { user, signOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  const titles = {
    "/": ["Overview", "Your inventory at a glance."],
    "/spare-parts": ["Spare parts", "Register and review the parts tracked by SmartPark."],
    "/stock-in": ["Stock in", "Record received stock and purchase value."],
    "/stock-out": ["Stock out", "Track, update or remove stock issues."],
    "/reports": ["Reports", "Review stock position and daily issues."]
  };
  const [title, subtitle] = titles[location.pathname] || titles["/"];

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-ink text-white md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <Link to="/" className="flex items-center gap-3 px-5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 font-black">S</span>
          <span><span className="block text-sm font-extrabold tracking-widest">SMARTPARK</span><span className="text-xs text-slate-400">Inventory system</span></span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3 md:py-5">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition md:flex md:items-center md:gap-3 ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
              <span className="hidden h-1.5 w-1.5 rounded-full bg-current md:inline-block" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden flex-1 md:block" />
        <div className="hidden border-t border-white/10 p-4 md:block">
          <div className="mb-3 truncate text-sm font-semibold">{user.username}</div>
          <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Log out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur sm:px-8">
          <div>
            <h1 className="text-lg font-bold text-ink">{title}</h1>
            <p className="hidden text-xs text-slate-500 sm:block">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.username}</span>
            <button onClick={logout} className="button-muted md:hidden">Logout</button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-8">
          {error && <Notice tone="error">{error}</Notice>}
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="spare-parts" element={<SpareParts />} />
            <Route path="stock-in" element={<StockIn />} />
            <Route path="stock-out" element={<StockOut />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">{eyebrow}</p><h2 className="mt-1 text-2xl font-bold text-ink">{title}</h2></div>
      {action}
    </div>
  );
}

function Notice({ tone = "info", children }) {
  const style = tone === "error" ? "border-red-200 bg-red-50 text-red-700"
    : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-blue-100 bg-blue-50 text-blue-800";
  return <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${style}`}>{children}</div>;
}

function DataTable({ columns, rows, empty = "No records to display." }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
          {columns.map((column) => <th key={column.label} className="px-3 py-3 font-semibold">{column.label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!rows.length && <tr><td colSpan={columns.length} className="px-3 py-9 text-center text-slate-400">{empty}</td></tr>}
          {rows.map((row, index) => <tr key={row.id ?? index} className="transition hover:bg-slate-50/80">
            {columns.map((column) => <td key={column.label} className="px-3 py-3.5 text-slate-700">{column.render ? column.render(row) : row[column.key]}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = true, min, step, children }) {
  return <label className="label">{label}
    {children || <input className="field" type={type} required={required} min={min} step={step} value={value}
      onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

function PartOptions({ parts, value, onChange }) {
  return (
    <select className="field" required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose spare part</option>
      {parts.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.availableQuantity} available</option>)}
    </select>
  );
}

function Dashboard() {
  const [data, setData] = useState({ parts: [], stockIns: [], stockOuts: [] });
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.get("/parts"), api.get("/stock-ins"), api.get("/stock-outs")])
      .then(([parts, stockIns, stockOuts]) => setData({
        parts: parts.data, stockIns: stockIns.data, stockOuts: stockOuts.data
      }))
      .catch((requestError) => setError(errorMessage(requestError)));
  }, []);
  const totalUnits = data.parts.reduce((sum, part) => sum + Number(part.availableQuantity), 0);
  const recent = [...data.stockOuts].slice(0, 5);
  return (
    <>
      <PageIntro eyebrow="SmartPark / Rubavu" title="Good day. Here’s your stock summary." action={<Link className="button-primary" to="/reports">Open daily report</Link>} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Spare part types" value={data.parts.length} detail="Registered items" color="blue" />
        <Metric label="Units available" value={totalUnits.toLocaleString()} detail="Across all spare parts" color="green" />
        <Metric label="Stock-in records" value={data.stockIns.length} detail="Receipts recorded" color="violet" />
        <Metric label="Stock-out records" value={data.stockOuts.length} detail="Issues recorded" color="amber" />
      </div>
      <section className="panel mt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div><h3 className="font-bold text-ink">Recent stock-outs</h3><p className="mt-1 text-sm text-slate-500">Latest parts issued from inventory</p></div>
          <Link to="/stock-out" className="text-sm font-semibold text-blue-600 hover:text-blue-800">View all →</Link>
        </div>
        <DataTable columns={[
          { label: "Spare part", key: "partName" },
          { label: "Quantity", key: "quantity" },
          { label: "Date", render: (row) => shortDate(row.date) },
          { label: "Value", render: (row) => money(row.totalPrice) }
        ]} rows={recent} />
      </section>
    </>
  );
}

function Metric({ label, value, detail, color }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700"
  };
  return <article className="panel">
    <div className={`mb-5 grid h-10 w-10 place-items-center rounded-xl text-lg font-bold ${tones[color]}`}>↗</div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{value}</p>
    <p className="mt-1 text-xs text-slate-400">{detail}</p>
  </article>;
}

function useNotice() {
  const [notice, setNotice] = useState(null);
  return { notice, setNotice };
}

function SpareParts() {
  const [parts, setParts] = useState([]);
  const { notice, setNotice } = useNotice();
  const [form, setForm] = useState({ name: "", category: "", quantity: "0", unitPrice: "" });
  const [busy, setBusy] = useState(false);
  async function load() {
    try { setParts((await api.get("/parts")).data); }
    catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
  }
  useEffect(() => { load(); }, []);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api.post("/parts", { ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) });
      setForm({ name: "", category: "", quantity: "0", unitPrice: "" });
      setNotice({ tone: "success", text: "Spare part registered." });
      await load();
    } catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  return <>
    <PageIntro eyebrow="Inventory setup" title="Spare parts" />
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    <section className="panel mb-6">
      <h3 className="mb-4 font-bold text-ink">Register a spare part</h3>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Part name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Category" value={form.category} onChange={(category) => setForm({ ...form, category })} />
        <Field label="Opening quantity" type="number" min="0" step="1" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} />
        <Field label="Unit price (RWF)" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(unitPrice) => setForm({ ...form, unitPrice })} />
        <div className="flex items-end"><button className="button-primary w-full" disabled={busy}>{busy ? "Saving…" : "Add spare part"}</button></div>
      </form>
    </section>
    <section className="panel">
      <div className="mb-3"><h3 className="font-bold text-ink">Registered parts</h3><p className="mt-1 text-sm text-slate-500">Available stock includes opening quantity and receipts, less stock-outs.</p></div>
      <DataTable columns={[
        { label: "Part", key: "name" }, { label: "Category", key: "category" },
        { label: "Opening qty", key: "quantity" },
        { label: "Unit price", render: (row) => money(row.unitPrice) },
        { label: "Total price", render: (row) => money(row.totalPrice) },
        { label: "Available", render: (row) => <span className="font-bold text-ink">{row.availableQuantity}</span> }
      ]} rows={parts} />
    </section>
  </>;
}

function StockIn() {
  const [parts, setParts] = useState([]);
  const [records, setRecords] = useState([]);
  const { notice, setNotice } = useNotice();
  const [form, setForm] = useState({ partId: "", quantity: "", unitPrice: "", date: today() });
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [partResponse, recordResponse] = await Promise.all([api.get("/parts"), api.get("/stock-ins")]);
      setParts(partResponse.data);
      setRecords(recordResponse.data);
    } catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
  }
  useEffect(() => { load(); }, []);
  function choosePart(id) {
    const part = parts.find((item) => String(item.id) === id);
    setForm({ ...form, partId: id, unitPrice: part ? String(part.unitPrice) : "" });
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api.post("/stock-ins", { ...form, partId: form.partId, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) });
      setForm({ partId: "", quantity: "", unitPrice: "", date: today() });
      setNotice({ tone: "success", text: "Stock-in movement recorded." });
      await load();
    } catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  return <>
    <PageIntro eyebrow="Receive inventory" title="Stock in" />
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    <section className="panel mb-6">
      <h3 className="mb-4 font-bold text-ink">Record received parts</h3>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="label">Spare part
          <PartOptions parts={parts} value={form.partId} onChange={choosePart} />
        </label>
        <Field label="Quantity received" type="number" min="1" step="1" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} />
        <Field label="Unit price (RWF)" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(unitPrice) => setForm({ ...form, unitPrice })} />
        <Field label="Date" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
        <div className="flex items-end"><button className="button-primary w-full" disabled={busy || !parts.length}>{busy ? "Saving…" : "Record stock-in"}</button></div>
      </form>
    </section>
    <section className="panel"><h3 className="mb-3 font-bold text-ink">Stock-in history</h3>
      <DataTable columns={[
        { label: "Date", render: (row) => shortDate(row.date) }, { label: "Spare part", key: "partName" },
        { label: "Quantity", key: "quantity" }, { label: "Unit price", render: (row) => money(row.unitPrice) },
        { label: "Total", render: (row) => money(row.totalPrice) }
      ]} rows={records} />
    </section>
  </>;
}

function StockOut() {
  const [parts, setParts] = useState([]);
  const [records, setRecords] = useState([]);
  const [editing, setEditing] = useState(null);
  const { notice, setNotice } = useNotice();
  const emptyForm = () => ({ partId: "", quantity: "", unitPrice: "", date: today() });
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [partResponse, recordResponse] = await Promise.all([api.get("/parts"), api.get("/stock-outs")]);
      setParts(partResponse.data);
      setRecords(recordResponse.data);
    } catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
  }
  useEffect(() => { load(); }, []);
  function editRecord(row) {
    setEditing(row.id);
    setForm({ partId: String(row.partId), quantity: String(row.quantity), unitPrice: String(row.unitPrice), date: row.date });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function choosePart(id) {
    const part = parts.find((item) => String(item.id) === id);
    setForm({ ...form, partId: id, unitPrice: part ? String(part.unitPrice) : "" });
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const payload = { ...form, partId:form.partId, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) };
      if (editing) await api.put(`/stock-outs/${editing}`, payload);
      else await api.post("/stock-outs", payload);
      setForm(emptyForm());
      setEditing(null);
      setNotice({ tone: "success", text: editing ? "Stock-out updated." : "Stock-out recorded." });
      await load();
    } catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete the stock-out for ${row.partName} (${row.quantity})?`)) return;
    setNotice(null);
    try {
      await api.delete(`/stock-outs/${row.id}`);
      setNotice({ tone: "success", text: "Stock-out deleted." });
      await load();
    } catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
  }
  return <>
    <PageIntro eyebrow="Issue inventory" title="Stock out" />
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    <section className="panel mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h3 className="font-bold text-ink">{editing ? "Update stock-out" : "Record issued parts"}</h3>
          <p className="mt-1 text-sm text-slate-500">The system prevents issues greater than the available stock.</p></div>
        {editing && <button className="button-muted" onClick={() => { setEditing(null); setForm(emptyForm()); }}>Cancel edit</button>}
      </div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="label">Spare part
          <PartOptions parts={parts} value={form.partId} onChange={choosePart} />
        </label>
        <Field label="Quantity issued" type="number" min="1" step="1" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} />
        <Field label="Unit price (RWF)" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(unitPrice) => setForm({ ...form, unitPrice })} />
        <Field label="Date" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
        <div className="flex items-end"><button className="button-primary w-full" disabled={busy || !parts.length}>{busy ? "Saving…" : editing ? "Save changes" : "Record stock-out"}</button></div>
      </form>
    </section>
    <section className="panel"><h3 className="mb-3 font-bold text-ink">Stock-out records</h3>
      <DataTable columns={[
        { label: "Date", render: (row) => shortDate(row.date) }, { label: "Spare part", key: "partName" },
        { label: "Quantity", key: "quantity" }, { label: "Unit price", render: (row) => money(row.unitPrice) },
        { label: "Total", render: (row) => money(row.totalPrice) },
        { label: "Actions", render: (row) => <div className="flex gap-2">
          <button onClick={() => editRecord(row)} className="font-semibold text-blue-600 hover:text-blue-800">Edit</button>
          <button onClick={() => remove(row)} className="font-semibold text-red-600 hover:text-red-800">Delete</button>
        </div> }
      ]} rows={records} />
    </section>
  </>;
}

function Reports() {
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const { notice, setNotice } = useNotice();
  const [busy, setBusy] = useState(false);
  async function load(event) {
    event?.preventDefault();
    setBusy(true);
    setNotice(null);
    try { setReport((await api.get("/reports/daily", { params: { date } })).data); }
    catch (error) { setNotice({ tone: "error", text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);
  return <>
    <PageIntro eyebrow="Inventory analytics" title="Daily reports" />
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    <section className="panel mb-6">
      <form onSubmit={load} className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs"><Field label="Report date" type="date" value={date} onChange={setDate} /></div>
        <button className="button-primary" disabled={busy}>{busy ? "Loading…" : "Generate report"}</button>
      </form>
      <p className="mt-3 text-xs text-slate-500">Stock status is calculated through the selected date, including the opening quantity and all movements to that day.</p>
    </section>
    {report && <>
      <section className="panel mb-6">
        <div className="mb-3"><h3 className="font-bold text-ink">Daily stock status</h3><p className="mt-1 text-sm text-slate-500">As of {shortDate(report.date)}</p></div>
        <DataTable columns={[
          { label: "Spare name", key: "partName" },
          { label: "Stored quantity", key: "storedQuantity" },
          { label: "Stock-out quantity", key: "stockOutQuantity" },
          { label: "Remaining quantity", render: (row) => <span className="font-bold text-ink">{row.remainingQuantity}</span> }
        ]} rows={report.stockStatus} />
      </section>
      <section className="panel">
        <div className="mb-3"><h3 className="font-bold text-ink">Daily stock-out report</h3><p className="mt-1 text-sm text-slate-500">Issued on {shortDate(report.date)}</p></div>
        <DataTable columns={[
          { label: "Spare name", key: "partName" }, { label: "Quantity", key: "quantity" },
          { label: "Unit price", render: (row) => money(row.unitPrice) },
          { label: "Total price", render: (row) => money(row.totalPrice) },
          { label: "Recorded by", key: "username" }
        ]} rows={report.stockOuts} />
        <p className="mt-4 text-right text-sm font-bold text-ink">
          Daily total: {money(report.stockOuts.reduce((sum, row) => sum + Number(row.totalPrice), 0))}
        </p>
      </section>
    </>}
  </>;
}

export default App;
