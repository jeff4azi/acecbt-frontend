import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home,
  ListChecks,
  History,
  User,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import logo from "../assets/AceCbtLogo.png";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/browse", label: "Browse", icon: ListChecks },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

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
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function StudentLayout() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name ?? user?.user_metadata?.full_name ?? null;
  const displayEmail = profile?.email ?? user?.email ?? "";

  async function handleSignOut() {
    sessionStorage.removeItem("admin_viewing_site");
    await signOut();
    navigate("/login", { replace: true });
  }

  function handleGoToAdmin() {
    sessionStorage.removeItem("admin_viewing_site");
    navigate("/admin");
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
          {user ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {getInitials(displayName)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {displayName && (
                    <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
                      {displayName}
                    </p>
                  )}
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

              {/* Admin panel button — only visible to admins */}
              {isAdmin && (
                <button
                  onClick={handleGoToAdmin}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors mt-1"
                >
                  <LayoutDashboard size={17} />
                  Admin Panel
                </button>
              )}
            </>
          ) : (
            <NavLink
              to="/login"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={bottomNavClass}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
          {/* Admin Panel shortcut — only for admins */}
          {isAdmin && (
            <button
              onClick={handleGoToAdmin}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs text-indigo-600 font-medium"
            >
              <LayoutDashboard size={20} />
              Admin
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
