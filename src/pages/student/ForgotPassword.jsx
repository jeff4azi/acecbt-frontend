import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import logo from "../../assets/AceCbtLogo.png";

const RESEND_COOLDOWN = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  // Start / clear the countdown timer
  function startCountdown() {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
    startCountdown();
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    startCountdown();
  }

  return (
    <div className="min-h-screen bg-tint flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Ace Edu CBT" className="h-12 w-auto" />
        </div>

        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-primary-dark mb-1">
              Forgot your password?
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Enter the email address linked to your account and we'll send you
              a reset link.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-gray-800 placeholder-gray-400 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        ) : (
          /* ── Success state ─────────────────────────────── */
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-primary-dark mb-1">
                Check your inbox
              </h1>
              <p className="text-gray-500 text-sm">
                We sent a password reset link to{" "}
                <span className="font-medium text-gray-700">{email}</span>. It
                may take a minute to arrive.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Resend section */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-600">
              <p className="mb-2">Didn't receive the email?</p>

              {countdown > 0 ? (
                <div className="flex items-center justify-center gap-2">
                  {/* Circular progress */}
                  <span className="relative inline-flex items-center justify-center w-8 h-8">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 12}`}
                        strokeDashoffset={`${2 * Math.PI * 12 * (1 - countdown / RESEND_COOLDOWN)}`}
                        className="text-primary transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-primary">
                      {countdown}
                    </span>
                  </span>
                  <span className="text-gray-500">
                    Resend available in{" "}
                    <span className="font-semibold text-primary">
                      {countdown}s
                    </span>
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-primary font-semibold hover:underline disabled:opacity-60 transition"
                >
                  {loading ? "Sending…" : "Resend email"}
                </button>
              )}
            </div>

            <p className="mt-4 text-xs text-gray-400 text-center">
              Check your spam folder if you don't see it in your inbox.
            </p>
          </>
        )}

        {/* Back to login */}
        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-primary transition"
        >
          <ArrowLeft size={15} />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
