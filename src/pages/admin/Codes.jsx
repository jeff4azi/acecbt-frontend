import { useState } from "react";
import { Copy, Check, Plus, X } from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_QUIZZES = [
  { id: "1", title: "WAEC Mathematics 2024" },
  { id: "2", title: "JAMB English Language" },
  { id: "3", title: "NECO Physics" },
  { id: "4", title: "WAEC Biology 2024" },
];

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "ACE-";
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function seedCodes(quizId) {
  return [
    {
      id: `c1-${quizId}`,
      code: randomCode(),
      status: "used",
      used_by: "Chukwuemeka Obi",
      used_at: "2024-08-10",
    },
    {
      id: `c2-${quizId}`,
      code: randomCode(),
      status: "unused",
      used_by: null,
      used_at: null,
    },
    {
      id: `c3-${quizId}`,
      code: randomCode(),
      status: "unused",
      used_by: null,
      used_at: null,
    },
    {
      id: `c4-${quizId}`,
      code: randomCode(),
      status: "revoked",
      used_by: null,
      used_at: null,
    },
    {
      id: `c5-${quizId}`,
      code: randomCode(),
      status: "unused",
      used_by: null,
      used_at: null,
    },
  ];
}

// Pre-seed codes for quiz 1
const INITIAL_CODES = {
  1: seedCodes("1"),
  2: seedCodes("2"),
  3: seedCodes("3"),
  4: seedCodes("4"),
};

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="text-gray-400 hover:text-primary transition shrink-0"
      title="Copy code"
    >
      {copied ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    unused: "bg-green-100 text-green-700",
    used: "bg-gray-100 text-gray-500",
    revoked: "bg-red-100 text-red-600",
  };
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${map[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Codes() {
  const [selectedQuizId, setSelectedQuizId] = useState("1");
  const [codesMap, setCodesMap] = useState(INITIAL_CODES);
  const [showGenForm, setShowGenForm] = useState(false);
  const [genQty, setGenQty] = useState(20);

  const codes = codesMap[selectedQuizId] ?? [];

  function generateCodes() {
    const newCodes = Array.from({ length: genQty }, () => ({
      id: Math.random().toString(36).slice(2),
      code: randomCode(),
      status: "unused",
      used_by: null,
      used_at: null,
    }));
    setCodesMap((prev) => ({
      ...prev,
      [selectedQuizId]: [...(prev[selectedQuizId] ?? []), ...newCodes],
    }));
    setShowGenForm(false);
    setGenQty(20);
  }

  function revokeCode(id) {
    setCodesMap((prev) => ({
      ...prev,
      [selectedQuizId]: prev[selectedQuizId].map((c) =>
        c.id === id ? { ...c, status: "revoked" } : c,
      ),
    }));
  }

  const unusedCount = codes.filter((c) => c.status === "unused").length;

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">Access Codes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage unlock codes for each quiz
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-accent-light bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm text-gray-700 appearance-none"
          >
            {MOCK_QUIZZES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowGenForm((v) => !v)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm shrink-0"
          >
            <Plus size={16} /> Generate Codes
          </button>
        </div>

        {/* Generate form */}
        {showGenForm && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-accent-light/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Generate New Codes</h2>
              <button
                onClick={() => setShowGenForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={genQty}
                  onChange={(e) =>
                    setGenQty(Math.max(1, Number(e.target.value)))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
              </div>
              <button
                onClick={generateCodes}
                className="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
              >
                Generate
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex gap-3 mb-5">
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm text-sm">
            <span className="text-gray-400">Total: </span>
            <span className="font-bold text-gray-800">{codes.length}</span>
          </div>
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm text-sm">
            <span className="text-gray-400">Unused: </span>
            <span className="font-bold text-green-600">{unusedCount}</span>
          </div>
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm text-sm">
            <span className="text-gray-400">Used: </span>
            <span className="font-bold text-gray-500">
              {codes.filter((c) => c.status === "used").length}
            </span>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Code
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Used By
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Date Used
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold text-primary-dark tracking-widest">
                        {c.code}
                      </code>
                      <CopyButton text={c.code} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {c.used_by ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {c.used_at ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {c.status === "unused" ? (
                      <button
                        onClick={() => revokeCode(c.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-gray-400"
                  >
                    No codes yet — generate some above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {codes.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-bold text-primary-dark tracking-widest">
                    {c.code}
                  </code>
                  <CopyButton text={c.code} />
                </div>
                <StatusBadge status={c.status} />
              </div>
              {c.used_by && (
                <p className="text-xs text-gray-500 mb-1">
                  Used by: <span className="font-medium">{c.used_by}</span>
                </p>
              )}
              {c.used_at && (
                <p className="text-xs text-gray-400 mb-2">{c.used_at}</p>
              )}
              {c.status === "unused" && (
                <button
                  onClick={() => revokeCode(c.id)}
                  className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
          {codes.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">
              No codes yet — generate some above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
