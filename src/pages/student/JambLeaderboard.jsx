import { useState, useEffect } from "react";
import { Medal, RefreshCw, Clock, Trophy } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  if (h > 0) return `${h}:${m}:${s}`;
  return `${m}:${s}`;
}

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmtDate(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function MedalIcon({ rank }) {
  if (rank === 1) return <Medal size={18} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={18} className="text-gray-400" />;
  if (rank === 3) return <Medal size={18} className="text-amber-600" />;
  return (
    <span className="text-sm font-bold text-gray-400 w-5 text-center">
      {rank}
    </span>
  );
}

function useCountdown(targetIso) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!targetIso) return;
    function tick() {
      const diff = new Date(targetIso) - Date.now();
      if (diff <= 0) {
        setLabel("resetting now…");
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hrs = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      const secs = Math.floor((diff % 60_000) / 1_000);
      if (days > 0) setLabel(`${days}d ${hrs}h ${mins}m`);
      else if (hrs > 0) setLabel(`${hrs}h ${mins}m ${secs}s`);
      else setLabel(`${mins}m ${secs}s`);
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetIso]);

  return label;
}

function EntriesList({ entries, user }) {
  if (entries.length === 0) return null;

  return (
    <>
      {entries.length >= 3 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 flex items-end justify-center gap-3">
          {/* 2nd */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 mb-1">
              {initials(entries[1]?.profiles?.full_name)}
            </div>
            <p className="text-xs font-semibold text-gray-700 text-center line-clamp-1">
              {entries[1]?.profiles?.full_name}
            </p>
            <p className="text-xs text-gray-500">
              {entries[1]?.total_score}/400
            </p>
            <div className="mt-1 bg-gray-400 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
              2
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center flex-1 -mb-2">
            <Medal size={22} className="text-yellow-400 mb-1" />
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary mb-1 ring-2 ring-primary">
              {initials(entries[0]?.profiles?.full_name)}
            </div>
            <p className="text-xs font-bold text-gray-800 text-center line-clamp-1">
              {entries[0]?.profiles?.full_name}
            </p>
            <p className="text-xs text-primary font-semibold">
              {entries[0]?.total_score}/400
            </p>
            <div className="mt-1 bg-primary text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
              1
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 mb-1">
              {initials(entries[2]?.profiles?.full_name)}
            </div>
            <p className="text-xs font-semibold text-gray-700 text-center line-clamp-1">
              {entries[2]?.profiles?.full_name}
            </p>
            <p className="text-xs text-gray-500">
              {entries[2]?.total_score}/400
            </p>
            <div className="mt-1 bg-amber-600 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
              3
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isMe = user && entry.user_id === user.id;
          const name = entry.profiles?.full_name ?? "Unknown";
          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                isMe
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-white shadow-sm border border-transparent"
              }`}
            >
              <div className="w-6 flex justify-center shrink-0">
                <MedalIcon rank={rank} />
              </div>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isMe ? "bg-primary text-white" : "bg-tint text-primary-dark"
                }`}
              >
                {initials(name)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold truncate ${
                    isMe ? "text-primary-dark" : "text-gray-800"
                  }`}
                >
                  {name}
                  {isMe && (
                    <span className="ml-2 text-xs font-medium bg-primary text-white px-1.5 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  Time: {formatTime(entry.time_taken_seconds)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`text-sm font-bold ${
                    entry.total_score >= 280
                      ? "text-green-600"
                      : entry.total_score >= 200
                        ? "text-primary"
                        : "text-red-500"
                  }`}
                >
                  {entry.total_score}/400
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function JambLeaderboard() {
  const { user, loading: authLoading } = useAuth();

  const [tab, setTab] = useState("weekly");

  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const [alltimeEntries, setAlltimeEntries] = useState([]);
  const [alltimeLoaded, setAlltimeLoaded] = useState(false);
  const [alltimeLoading, setAlltimeLoading] = useState(false);

  const countdown = useCountdown(weekEnd);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get("/jamb/leaderboard?scope=weekly");
        if (cancelled) return;
        setWeeklyEntries(res.data.entries ?? []);
        setWeekStart(res.data.weekStart ?? null);
        setWeekEnd(res.data.weekEnd ?? null);
      } catch (err) {
        if (err?.response?.status !== 401 && err?.response?.status !== 403)
          console.error("JAMB leaderboard error:", err);
      } finally {
        if (!cancelled) setWeeklyLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  useEffect(() => {
    if (tab !== "alltime" || alltimeLoaded || authLoading) return;
    let cancelled = false;

    async function load() {
      setAlltimeLoading(true);
      try {
        const res = await api.get("/jamb/leaderboard?scope=alltime");
        if (cancelled) return;
        setAlltimeEntries(res.data.entries ?? []);
        setAlltimeLoaded(true);
      } catch (err) {
        if (err?.response?.status !== 401 && err?.response?.status !== 403)
          console.error("JAMB all-time leaderboard error:", err);
      } finally {
        if (!cancelled) setAlltimeLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab, alltimeLoaded, authLoading]);

  if (authLoading || weeklyLoading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const weekStartDate = weekStart ? new Date(weekStart) : null;
  const weekEndDisplay = weekEnd
    ? new Date(new Date(weekEnd).getTime() - 1)
    : null;

  const activeEntries = tab === "weekly" ? weeklyEntries : alltimeEntries;

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-primary-dark">
            JAMB Leaderboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Top scores from JAMB practice exams
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white rounded-2xl border border-accent-light/60 p-1 gap-1 mb-4 shadow-sm">
          <button
            onClick={() => setTab("weekly")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === "weekly"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <RefreshCw size={14} />
            This Week
          </button>
          <button
            onClick={() => setTab("alltime")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === "alltime"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Trophy size={14} />
            All Time
          </button>
        </div>

        {/* Weekly info bar */}
        {tab === "weekly" && (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-3.5 mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">
                Showing best scores from{" "}
                {weekStartDate && weekEndDisplay ? (
                  <span className="font-semibold text-gray-700">
                    {fmtDate(weekStartDate)} – {fmtDate(weekEndDisplay)}
                  </span>
                ) : (
                  "this week"
                )}
                . Resets every Monday.
              </p>
            </div>
            {countdown && (
              <div className="flex items-center gap-1.5 shrink-0 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5">
                <Clock size={13} className="text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {countdown}
                </span>
                <span className="text-xs text-gray-400">until reset</span>
              </div>
            )}
          </div>
        )}

        {/* All-time info bar */}
        {tab === "alltime" && (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-3.5 mb-5">
            <p className="text-xs text-gray-500">
              Each student's single best JAMB practice score, of all time.
            </p>
          </div>
        )}

        {/* Content */}
        {tab === "alltime" && alltimeLoading ? (
          <div className="flex justify-center py-16">
            <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeEntries.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-20">
            {tab === "weekly"
              ? "No attempts this week — be the first!"
              : "No attempts yet — be the first!"}
          </p>
        ) : (
          <EntriesList entries={activeEntries} user={user} />
        )}
      </div>
    </div>
  );
}
