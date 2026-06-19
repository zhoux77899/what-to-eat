"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useTranslations } from "next-intl";

import { AuthModal } from "@/components/auth/auth-modal";
import { useAuthRuntime } from "@/components/auth/auth-runtime-provider";
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
  const { clerkEnabled } = useAuthRuntime();
  const handledSignInSearchRef = useRef<string | null>(null);

  const requestSignIn = useCallback((nextReturnTo?: string) => {
    setReturnTo(normalizeAuthReturnTo(locale, nextReturnTo));
    setOpen(true);
  }, [locale]);

  const requestSignInFromLocation = useCallback(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("signIn") !== "1") {
      return;
    }

    const returnToParam = params.get("returnTo") ?? undefined;
    const searchKey = `${window.location.pathname}?${params.toString()}`;

    if (handledSignInSearchRef.current === searchKey) {
      return;
    }

    handledSignInSearchRef.current = searchKey;
    requestSignIn(returnToParam);
  }, [requestSignIn]);

  useEffect(() => {
    const scheduleRequestSignIn = () => {
      window.setTimeout(requestSignInFromLocation, 0);
    };
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = (data, unused, url) => {
      originalPushState(data, unused, url);
      scheduleRequestSignIn();
    };

    window.history.replaceState = (data, unused, url) => {
      originalReplaceState(data, unused, url);
      scheduleRequestSignIn();
    };

    scheduleRequestSignIn();
    window.addEventListener("popstate", scheduleRequestSignIn);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", scheduleRequestSignIn);
    };
  }, [requestSignInFromLocation]);

  const value = useMemo(() => ({ requestSignIn }), [requestSignIn]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {clerkEnabled ? (
        <AuthModal locale={locale} onClose={() => setOpen(false)} open={open} returnTo={returnTo} />
      ) : (
        <AuthConfigurationModal onClose={() => setOpen(false)} open={open} />
      )}
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

function AuthConfigurationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("auth");

  if (!open) {
    return null;
  }

  return (
    <div
      className="auth-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="auth-modal-title"
        aria-modal="true"
        className="auth-modal-card"
        role="dialog"
      >
        <div className="auth-modal-pin" aria-hidden="true" />
        <div className="auth-modal-header">
          <div className="auth-modal-copy">
            <h2 className="auth-modal-title" id="auth-modal-title">
              {t("title")}
            </h2>
            <p className="auth-modal-description">{t("description")}</p>
          </div>
          <button
            aria-label={t("close")}
            className="auth-modal-close"
            onClick={onClose}
            type="button"
          >
            <X className="auth-modal-close-icon" aria-hidden="true" />
          </button>
        </div>
        <p className="auth-modal-error" role="alert">
          {t("configurationError")}
        </p>
      </div>
    </div>
  );
}
