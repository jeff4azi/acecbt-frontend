import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Clock,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Trophy,
  Play,
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_QUIZ = {
  id: "1",
  title: "WAEC Mathematics 2024",
  description:
    "Comprehensive past questions covering algebra, geometry, statistics, and more. Ideal for WAEC candidates looking to revise core topics with detailed answer explanations.",
  price: 500,
  question_count: 60,
  duration_minutes: 90,
  pass_mark: 50,
};

const MOCK_SETTINGS = {
  whatsapp_number: "2348012345678",
  bank_name: "First Bank",
  account_number: "3012345678",
  account_name: "Ace Edu CBT Ltd",
};

// ─── Utility ─────────────────────────────────────────────────────────────────

function useCopyToClipboard(text, timeout = 2000) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }

  return { copied, copy };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuizDetail() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  // DEV ONLY: toggle to preview both states — remove once real unlock-status fetching is wired in
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [accessCode, setAccessCode] = useState("");
  const { copied, copy } = useCopyToClipboard(MOCK_SETTINGS.account_number);

  const quiz = MOCK_QUIZ; // in future: fetch by quizId

  function buildWhatsAppLink() {
    const msg = `Hello, I have made payment for the "${quiz.title}" quiz (₦${quiz.price.toLocaleString()}). I will attach my receipt. Please unlock my access.`;
    return `https://wa.me/${MOCK_SETTINGS.whatsapp_number}?text=${encodeURIComponent(msg)}`;
  }

  function handleRedeem(e) {
    e.preventDefault();
    // TODO: wire to real /api/codes/redeem endpoint
    console.log("Redeem code submitted:", accessCode);
  }

  return (
    <div className="min-h-screen bg-tint">
      {/* DEV ONLY toggle — remove when real data is wired */}
      <div className="fixed top-2 right-2 z-50 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2 shadow">
        <span>Dev: Preview</span>
        <button
          onClick={() => setIsUnlocked((v) => !v)}
          className={`w-9 h-5 rounded-full transition-colors relative ${isUnlocked ? "bg-primary" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isUnlocked ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </button>
        <span>{isUnlocked ? "Unlocked" : "Locked"}</span>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-8 pb-10 space-y-5">
        {/* Quiz header info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-primary-dark mb-2">
            {quiz.title}
          </h1>
          <p className="text-sm text-gray-500 mb-4">{quiz.description}</p>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1.5 bg-tint px-3 py-1.5 rounded-lg">
              <BookOpen size={14} className="text-accent" />
              {quiz.question_count} Questions
            </span>
            <span className="flex items-center gap-1.5 bg-tint px-3 py-1.5 rounded-lg">
              <Clock size={14} className="text-accent" />
              {quiz.duration_minutes} min
            </span>
            {!isUnlocked && (
              <span className="ml-auto text-lg font-bold text-primary">
                ₦{quiz.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {isUnlocked ? (
          /* ── STATE B: Unlocked ── */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-7 h-7 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 11V7a4 4 0 018 0v4M5 11h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-green-800 text-sm">
                You have access to this quiz
              </p>
            </div>

            <button
              onClick={() => navigate(`/quiz/${quizId}/take`)}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition shadow-md"
            >
              <Play size={18} />
              Start Quiz
            </button>

            <button
              onClick={() => navigate(`/quiz/${quizId}/leaderboard`)}
              className="w-full bg-white hover:bg-tint text-primary border-2 border-primary font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
            >
              <Trophy size={16} />
              View Leaderboard
            </button>
          </div>
        ) : (
          /* ── STATE A: Locked ── */
          <div className="space-y-4">
            {/* Payment info card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800">Payment Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank</span>
                  <span className="font-medium text-gray-800">
                    {MOCK_SETTINGS.bank_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Account Number</span>
                  <span className="flex items-center gap-2 font-medium text-gray-800">
                    {MOCK_SETTINGS.account_number}
                    <button
                      onClick={copy}
                      className="text-primary hover:text-primary-dark transition"
                      title="Copy account number"
                    >
                      {copied ? (
                        <Check size={15} className="text-green-500" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name</span>
                  <span className="font-medium text-gray-800">
                    {MOCK_SETTINGS.account_name}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-primary text-base">
                    ₦{quiz.price.toLocaleString()}
                  </span>
                </div>
              </div>

              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                <ExternalLink size={15} />
                I've Paid — Send Proof on WhatsApp
              </a>
            </div>

            {/* Code entry */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-1">
                Have an access code?
              </h2>
              <p className="text-xs text-gray-400 mb-3">Format: ACE-XXXXXX</p>
              <form onSubmit={handleRedeem} className="flex gap-2">
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="ACE-XXXXXX"
                  maxLength={10}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-mono tracking-widest uppercase"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                >
                  Unlock
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
