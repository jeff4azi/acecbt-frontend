import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, AlertCircle, ShieldAlert } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function Field({ label, name, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm text-gray-800 placeholder-gray-400 transition"
      />
    </div>
  );
}

function AdminGateCTA() {
  return (
    <div className="min-h-screen bg-tint flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary-dark mb-1">
            Admin Access Required
          </h1>
          <p className="text-sm text-gray-500">
            Sign in with your admin account to manage settings.
          </p>
        </div>
        <Link
          to="/admin/login"
          className="block w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl text-sm transition"
        >
          Sign In as Admin
        </Link>
        <Link
          to="/"
          className="block w-full border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-2xl text-sm transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function Settings() {
  const { authLoading, user } = useAuth();
  const [form, setForm] = useState({
    whatsapp_number: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    contact_email: "",
    contact_phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get("/settings")
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setForm({
          whatsapp_number: d.whatsapp_number ?? "",
          bank_name: d.bank_name ?? "",
          account_number: d.account_number ?? "",
          account_name: d.account_name ?? "",
          contact_email: d.contact_email ?? "",
          contact_phone: d.contact_phone ?? "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // interceptor handles session teardown + redirect
        } else {
          setError(
            "Failed to load settings: " +
              (err.response?.data?.error ?? err.message),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/settings", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        setError(err.response?.data?.error ?? "Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AdminGateCTA />;
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-12 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform-wide payment and contact details
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-800">Payment Details</h2>
            <Field
              label="Bank Name"
              name="bank_name"
              value={form.bank_name}
              onChange={handleChange}
              placeholder="e.g. First Bank Nigeria"
            />
            <Field
              label="Account Number"
              name="account_number"
              value={form.account_number}
              onChange={handleChange}
              placeholder="10-digit account number"
            />
            <Field
              label="Account Name"
              name="account_name"
              value={form.account_name}
              onChange={handleChange}
              placeholder="Name on the bank account"
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-800">Contact Info</h2>
            <Field
              label="WhatsApp Number (with country code, no +)"
              name="whatsapp_number"
              value={form.whatsapp_number}
              onChange={handleChange}
              placeholder="e.g. 2348012345678"
            />
            <Field
              label="Contact Email"
              name="contact_email"
              value={form.contact_email}
              onChange={handleChange}
              placeholder="support@yourapp.com"
              type="email"
            />
            <Field
              label="Contact Phone"
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              placeholder="e.g. 08012345678"
            />
          </section>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl text-sm transition shadow-sm flex items-center gap-2"
            >
              {saving && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Check size={16} /> Saved!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
