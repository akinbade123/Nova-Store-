import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '../services/authService';
import { SESSION_EXPIRED_EVENT } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

const SESSION_KEY = 'nova:session';
const TOKEN_KEY = 'nova:token';

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)) ?? null;
  } catch {
    return null;
  }
}

/** "Remember me" keeps the session in localStorage; otherwise it ends when the browser closes. */
function persistSession(session, remember) {
  [localStorage, sessionStorage].forEach((store) => {
    store.removeItem(SESSION_KEY);
    store.removeItem(TOKEN_KEY);
  });
  if (!session) return;
  const store = remember ? localStorage : sessionStorage;
  store.setItem(SESSION_KEY, JSON.stringify({ user: session.user }));
  store.setItem(TOKEN_KEY, session.token);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession()?.user ?? null);
  // Where protected pages should send someone who just signed out on purpose (instead of the sign-in page).
  const [exitTo, setExitTo] = useState(null);
  const { toast } = useToast();
  const userRef = useRef(user);
  userRef.current = user;

  // The API rejected the stored token: end the session locally so the UI stops acting signed in.
  // exitTo stays null, so protected pages send the shopper to sign in and back again.
  useEffect(() => {
    const handleExpired = () => {
      if (!userRef.current) return; // several requests can fail at once; react to the first
      userRef.current = null;
      persistSession(null);
      setExitTo(null);
      setUser(null);
      toast({ variant: 'info', title: 'Your session has ended', description: 'Please sign in again to continue.' });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [toast]);

  const signIn = useCallback(async ({ email, password, remember = true }) => {
    const session = await authService.signIn({ email, password });
    persistSession(session, remember);
    setExitTo(null);
    setUser(session.user);
    return session.user;
  }, []);

  const register = useCallback(async (details) => {
    const session = await authService.register(details);
    persistSession(session, true);
    setExitTo(null);
    setUser(session.user);
    return session.user;
  }, []);

  /** Saves profile changes and refreshes the stored session in place. */
  const updateProfile = useCallback(
    async (patch) => {
      const updated = await authService.updateProfile(user.id, patch);
      const store = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
      store.setItem(SESSION_KEY, JSON.stringify({ user: updated }));
      setUser(updated);
      return updated;
    },
    [user],
  );

  const changePassword = useCallback(
    (currentPassword, newPassword) => authService.changePassword(user.id, currentPassword, newPassword),
    [user],
  );

  /** Deletes the account on the server. Follow with signOut({ to: '/' }). */
  const deleteAccount = useCallback(() => authService.deleteAccount(user.id), [user]);

  /** `to`: where protected pages should go after this sign-out (defaults to the home page). */
  const signOut = useCallback(async ({ to = '/' } = {}) => {
    await authService.signOut();
    persistSession(null);
    setExitTo(to);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      exitTo,
      signIn,
      register,
      signOut,
      updateProfile,
      changePassword,
      deleteAccount,
      requestPasswordReset: authService.requestPasswordReset,
      resetPassword: authService.resetPassword,
    }),
    [user, exitTo, signIn, register, signOut, updateProfile, changePassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
