import { useState } from "react";
import { Check } from "lucide-react";

// ─── Mock initial values ──────────────────────────────────────────────────────

const INITIAL_SETTINGS = {
  whatsapp_number: "2348012345678",
  bank_name: "First Bank Nigeria",
  account_number: "3012345678",
  account_name: "Ace Edu CBT Ltd",
  contact_email: "support@aceeducbt.com",
  contact_phone: "08012345678",
};

// ─── Reusable field ───────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [form, setForm] = useState(INITIAL_SETTINGS);
  const [saved, setSaved] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSave(e) {
    e.preventDefault();
    // TODO: wire to real backend settings endpoint
    console.log("Settings saved:", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-12 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform-wide payment and contact details
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Payment Details */}
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

          {/* Contact Info */}
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
              type="email"
              value={form.contact_email}
              onChange={handleChange}
              placeholder="support@yourapp.com"
            />
            <Field
              label="Contact Phone"
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              placeholder="e.g. 08012345678"
            />
          </section>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-3 rounded-xl text-sm transition shadow-sm"
            >
              Save Changes
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium animate-pulse">
                <Check size={16} /> Saved!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
