"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AuthModal } from "@/components/auth/auth-modal";
import { normalizeAuthReturnTo } from "@/lib/auth-return";

type AuthModalContextValue = {
  requestSignIn: (returnTo?: string) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

type AuthModalProviderProps = {
  locale: string;
  children: React.ReactNode;
};

export function AuthModalProvider({ locale, children }: AuthModalProviderProps) {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<string | undefined>();

  const requestSignIn = useCallback((nextReturnTo?: string) => {
    setReturnTo(normalizeAuthReturnTo(locale, nextReturnTo));
    setOpen(true);
  }, [locale]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("signIn") === "1") {
      const timer = window.setTimeout(() => {
        requestSignIn(params.get("returnTo") ?? undefined);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [requestSignIn]);

  const value = useMemo(() => ({ requestSignIn }), [requestSignIn]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal locale={locale} onClose={() => setOpen(false)} open={open} returnTo={returnTo} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);

  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }

  return context;
}
