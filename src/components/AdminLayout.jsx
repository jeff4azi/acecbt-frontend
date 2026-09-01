import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FileQuestion,
  KeyRound,
  Megaphone,
  Settings,
} from "lucide-react";
import logo from "../assets/AceCbtLogo.png";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/quizzes", label: "Quizzes", icon: FileQuestion },
  { to: "/admin/codes", label: "Codes", icon: KeyRound },
  { to: "/admin/ads", label: "Ads", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
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

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r border-gray-200 bg-white p-4">
        <div className="mb-6 px-2">
          <img src={logo} alt="Ace Edu CBT" className="h-9 w-auto" />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={bottomNavClass}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
