import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps student routes. If the user is an admin and hasn't explicitly
 * chosen to browse the student side (tracked in sessionStorage), redirect
 * them to /admin automatically.
 */
export default function AdminRedirect({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // While auth is loading don't redirect yet
  if (loading) return null;

  // Not logged in or not admin — render normally
  if (!user || !isAdmin) return children;

  // Admin has clicked "View Site" — they're intentionally on the student side
  const browsingAsStu = sessionStorage.getItem("admin_viewing_site") === "true";
  if (browsingAsStu) return children;

  // Admin arrived here without explicitly choosing to — send them to /admin
  return <Navigate to="/admin" replace state={{ from: location }} />;
}
