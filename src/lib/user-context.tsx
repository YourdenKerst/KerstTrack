"use client";

import { createContext, useContext, type ReactNode } from "react";

const UserIdContext = createContext<string | null>(null);

export function UserProvider({ userId, children }: { userId: string; children: ReactNode }) {
  return <UserIdContext.Provider value={userId}>{children}</UserIdContext.Provider>;
}

export function useUserId(): string {
  const id = useContext(UserIdContext);
  if (!id) throw new Error("useUserId must be used within a UserProvider");
  return id;
}
