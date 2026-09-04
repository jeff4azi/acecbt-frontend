import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileQuestion,
  KeyRound,
  Megaphone,
  Settings,
  LogOut,
  Users,
  Globe,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";
import logo from "../assets/AceCbtLogo.png";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/quizzes", label: "Quizzes", icon: FileQuestion },
  { to: "/admin/codes", label: "Codes", icon: KeyRound },
  { to: "/admin/ads", label: "Ads", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

// First 4 always visible in mobile bar; the rest live in the "More" sheet
const mobileNavPrimary = navItems.slice(0, 4);
const mobileNavSecondary = navItems.slice(4);

function navClass({ isActive }) {
  return `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
  }`;
}

function bottomNavClass({ isActive }) {
  return `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs ${
    isActive ? "text-primary font-medium" : "text-gray-500"
  }`;
}

function getInitials(name) {
  if (!name) return "A";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const displayName =
    profile?.full_name ?? user?.user_metadata?.full_name ?? "Admin";
  const displayEmail = profile?.email ?? user?.email ?? "";

  async function handleSignOut() {
    sessionStorage.removeItem("admin_viewing_site");
    setMoreOpen(false);
    await signOut();
    navigate("/login", { replace: true });
  }

  function handleViewSite() {
    sessionStorage.setItem("admin_viewing_site", "true");
    setMoreOpen(false);
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Desktop sidebar — fixed height, no scroll */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 h-screen sticky top-0 border-r border-gray-200 bg-white overflow-hidden">
        {/* Logo */}
        <div className="px-6 py-5 shrink-0">
          <img src={logo} alt="Ace Edu CBT" className="h-9 w-auto" />
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-3 flex-1 overflow-hidden">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout — pinned to bottom */}
        <div className="shrink-0 px-3 pb-4 pt-3 border-t border-gray-100">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {getInitials(displayName)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-gray-400 truncate leading-tight">
                {displayEmail}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>

          {/* View site button */}
          <button
            onClick={handleViewSite}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors mt-1"
          >
            <Globe size={17} />
            View Site
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
          {mobileNavPrimary.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={bottomNavClass}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs text-gray-500"
          >
            <MoreHorizontal size={20} />
            More
          </button>
        </nav>

        {/* ── "More" bottom sheet ── */}
        {moreOpen && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black/40 z-20"
              onClick={() => setMoreOpen(false)}
            />
            {/* Sheet */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-30 pb-6 shadow-xl">
              {/* Handle + header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-400">{displayEmail}</p>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-4 pt-3 flex flex-col gap-1">
                {/* Overflow nav items */}
                {mobileNavSecondary.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-gray-700 hover:bg-gray-100"
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}

                <div className="my-2 border-t border-gray-100" />

                {/* View Site */}
                <button
                  onClick={handleViewSite}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Globe size={18} />
                  View Site
                </button>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
