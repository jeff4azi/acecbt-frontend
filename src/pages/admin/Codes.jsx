import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, Plus, X, ShieldAlert } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

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

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
            Sign in with your admin account to manage access codes.
          </p>
        </div>
        <Link
          to="/login"
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

export default function Codes() {
  const { authLoading, user, isAdmin } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [codes, setCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);
  const [genQty, setGenQty] = useState(20);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) return;
    let cancelled = false;
    api
      .get("/quizzes/admin")
      .then((res) => {
        if (cancelled) return;
        setQuizzes(res.data);
        if (res.data.length) setSelectedQuizId(res.data[0].id);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // interceptor handles
        } else {
          console.error("Codes: quiz list error:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, isAdmin]);

  useEffect(() => {
    if (!selectedQuizId || !user || !isAdmin) return;
    let cancelled = false;
    setLoadingCodes(true);
    api
      .get(`/quizzes/${selectedQuizId}/codes`)
      .then((res) => {
        if (!cancelled) setCodes(res.data);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // interceptor handles
        } else {
          console.error("Codes load error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCodes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedQuizId, user, isAdmin]);

  async function generateCodes() {
    setGenerating(true);
    try {
      const res = await api.post(`/quizzes/${selectedQuizId}/codes/generate`, {
        quantity: genQty,
      });
      setCodes((prev) => [...res.data.codes, ...prev]);
      setShowGenForm(false);
      setGenQty(20);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        console.error("Generate codes error:", err);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function revokeCode(id) {
    try {
      const res = await api.patch(`/codes/${id}/revoke`);
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: res.data.status } : c)),
      );
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        console.error("Revoke error:", err);
      }
    }
  }

  if (authLoading || (loadingCodes && isAdmin)) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminGateCTA />;
  }

  const unusedCount = codes.filter((c) => c.status === "unused").length;

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
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
            {quizzes.map((q) => (
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
                  max={1000}
                  value={genQty}
                  onChange={(e) =>
                    setGenQty(Math.max(1, Number(e.target.value)))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
              </div>
              <button
                onClick={generateCodes}
                disabled={generating}
                className="bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2"
              >
                {generating && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Generate
              </button>
            </div>
          </div>
        )}

        {/* Summary chips */}
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

        {loadingCodes ? (
          <div className="flex justify-center py-16">
            <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
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
                        {c.used_by?.full_name ?? c.used_by?.email ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">
                        {formatDate(c.used_at)}
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
                        No codes yet.
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
                      Used by:{" "}
                      <span className="font-medium">
                        {c.used_by.full_name ?? c.used_by.email}
                      </span>
                    </p>
                  )}
                  {c.used_at && (
                    <p className="text-xs text-gray-400 mb-2">
                      {formatDate(c.used_at)}
                    </p>
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
                  No codes yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
