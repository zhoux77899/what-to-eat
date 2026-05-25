"use client";

import { createContext, useContext } from "react";

type AuthRuntimeContextValue = {
  clerkEnabled: boolean;
};

const AuthRuntimeContext = createContext<AuthRuntimeContextValue>({ clerkEnabled: true });

type AuthRuntimeProviderProps = {
  clerkEnabled: boolean;
  children: React.ReactNode;
};

export function AuthRuntimeProvider({ clerkEnabled, children }: AuthRuntimeProviderProps) {
  return (
    <AuthRuntimeContext.Provider value={{ clerkEnabled }}>
      {children}
    </AuthRuntimeContext.Provider>
  );
}

export function useAuthRuntime() {
  return useContext(AuthRuntimeContext);
}
