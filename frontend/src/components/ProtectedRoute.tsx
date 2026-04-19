import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useLocalAuth } from "../hooks/useLocalAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useLocalAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/signup" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
