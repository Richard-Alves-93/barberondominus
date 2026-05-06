import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
