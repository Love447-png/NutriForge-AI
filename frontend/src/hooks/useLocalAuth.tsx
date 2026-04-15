import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { refreshToken, signin, signout, signup } from "../lib/api";

export type SessionUser = {
  id?: string;
  name: string;
  email: string;
  role: "parent" | "asha_worker" | "ngo_staff";
  ashaWorkerId?: string | null;
  state?: string | null;
  languagePreference?: "en" | "hi";
};

type LoginPayload = SessionUser & {
  password?: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  isGuest: boolean;
  needsOnboarding: boolean;
  login: (user: LoginPayload) => Promise<void>;
  signup: (user: LoginPayload) => Promise<void>;
  continueAsGuest: () => void;
  completeOnboarding: (payload: { state: string; languagePreference: "en" | "hi" }) => void;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "nutriforge-session";
const ACCESS_TOKEN_KEY = "nutriforge-access-token";
const REFRESH_TOKEN_KEY = "nutriforge-refresh-token";
const GUEST_KEY = "nutriforge-guest";
const ONBOARDING_KEY = "nutriforge-onboarding";
const AuthContext = createContext<AuthContextValue | null>(null);

function persistUser(user: SessionUser | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function LocalAuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const guest = localStorage.getItem(GUEST_KEY) === "true";
      const savedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      setIsGuest(guest);
      if (saved) {
        setUser(JSON.parse(saved) as SessionUser);
        setNeedsOnboarding(localStorage.getItem(ONBOARDING_KEY) !== "done");
      }
      if (savedRefresh) {
        void refreshToken(savedRefresh)
          .then((session) => {
            localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
            localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
            const mapped: SessionUser = {
              id: session.user.id,
              name: session.user.full_name,
              email: session.user.email,
              role: session.user.role,
              ashaWorkerId: session.user.asha_worker_id,
              state: session.user.state,
              languagePreference: session.user.language_preference,
            };
            setUser(mapped);
            persistUser(mapped);
          })
          .catch(() => {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
          });
      }
    } catch {
      setUser(null);
      setIsGuest(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest,
      needsOnboarding,
      login: async (nextUser) => {
        const session = await signin({ email: nextUser.email, password: nextUser.password ?? "" });
        localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
        const mapped: SessionUser = {
          id: session.user.id,
          name: session.user.full_name,
          email: session.user.email,
          role: session.user.role,
          ashaWorkerId: session.user.asha_worker_id,
          state: session.user.state,
          languagePreference: session.user.language_preference,
        };
        setUser(mapped);
        persistUser(mapped);
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
        setNeedsOnboarding(localStorage.getItem(ONBOARDING_KEY) !== "done");
      },
      signup: async (nextUser) => {
        const session = await signup({
          full_name: nextUser.name,
          email: nextUser.email,
          password: nextUser.password ?? "",
          role: nextUser.role,
          asha_worker_id: nextUser.ashaWorkerId,
        });
        localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
        const mapped: SessionUser = {
          id: session.user.id,
          name: session.user.full_name,
          email: session.user.email,
          role: session.user.role,
          ashaWorkerId: session.user.asha_worker_id,
          state: session.user.state,
          languagePreference: session.user.language_preference,
        };
        setUser(mapped);
        persistUser(mapped);
        setIsGuest(false);
        setNeedsOnboarding(true);
        localStorage.setItem(ONBOARDING_KEY, "pending");
      },
      continueAsGuest: () => {
        setUser(null);
        setIsGuest(true);
        localStorage.setItem(GUEST_KEY, "true");
      },
      completeOnboarding: ({ state, languagePreference }) => {
        setUser((current) => {
          if (!current) return current;
          const next = { ...current, state, languagePreference };
          persistUser(next);
          return next;
        });
        setNeedsOnboarding(false);
        localStorage.setItem(ONBOARDING_KEY, "done");
      },
      logout: async () => {
        const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refresh) {
          await signout(refresh);
        }
        setUser(null);
        setIsGuest(false);
        setNeedsOnboarding(false);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(GUEST_KEY);
      },
    }),
    [isGuest, needsOnboarding, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useLocalAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useLocalAuth must be used inside LocalAuthProvider");
  }
  return context;
}

