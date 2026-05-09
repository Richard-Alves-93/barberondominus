import { Navigate } from "react-router-dom";
import { useStaffRole, StaffPermissions } from "@/hooks/useStaffRole";

type Props = {
  children: React.ReactNode;
  ownerOnly?: boolean;
  require?: keyof StaffPermissions;
};

export const PermissionRoute = ({ children, ownerOnly, require }: Props) => {
  const { loading, isOwner, permissions } = useStaffRole();
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (ownerOnly && !isOwner) return <Navigate to="/dashboard" replace />;
  if (require && !isOwner && !permissions[require]) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
