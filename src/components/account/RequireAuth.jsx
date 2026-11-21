import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Sends signed-out visitors to sign in, then back to where they were heading. */
export function RequireAuth({ children }) {
  const { isAuthenticated, exitTo } = useAuth();
  const { pathname, search } = useLocation();
  if (!isAuthenticated) {
    // Just signed out on purpose: leave quietly rather than asking them to sign in again.
    if (exitTo) return <Navigate to={exitTo} replace />;
    return <Navigate to={`/login?redirect=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return children;
}
