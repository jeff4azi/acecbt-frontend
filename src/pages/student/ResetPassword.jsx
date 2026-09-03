import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import logo from "../../assets/AceCbtLogo.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Supabase puts the recovery token in the URL hash; exchanging it gives us a
  // temporary session so we can call updateUser().
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
      setCheckingSession(false);
    });

    // Kick off the check immediately in case the event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      setCheckingSession(false);
    });
  }, []);

  // Password strength helpers
  const hasMin = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordStrong = hasMin && hasUpper && hasNumber;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!passwordStrong) {
      setError("Please meet all password requirements before submitting.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    // Auto-redirect after 3 s
    setTimeout(() => navigate("/login", { replace: true }), 3000);
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Ace Edu CBT" className="h-12 w-auto" />
        </div>

        {/* Invalid / expired link */}
        {!validSession && !done && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-primary-dark mb-2">
              Link expired or invalid
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              This password reset link has expired or has already been used.
              Request a new one below.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Request a new link
            </Link>
          </div>
        )}

        {/* Success state */}
        {done && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={36} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-primary-dark mb-1">
              Password updated!
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              Your password has been changed successfully. Redirecting you to
              sign in…
            </p>
            <Link
              to="/login"
              className="text-primary font-medium hover:underline text-sm"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {/* Reset form */}
        {validSession && !done && (
          <>
            <h1 className="text-2xl font-bold text-primary-dark mb-1">
              Set a new password
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Choose a strong password for your account.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-gray-800 placeholder-gray-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength checklist */}
                {password.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {[
                      { label: "At least 8 characters", ok: hasMin },
                      { label: "One uppercase letter", ok: hasUpper },
                      { label: "One number", ok: hasNumber },
                    ].map(({ label, ok }) => (
                      <li
                        key={label}
                        className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-gray-400"}`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                        >
                          {ok ? "✓" : "·"}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-gray-800 placeholder-gray-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="mt-1.5 text-xs text-red-500">
                    Passwords don't match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordStrong || password !== confirm}
                className="mt-2 w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
