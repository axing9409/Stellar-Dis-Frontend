import { useIsUserRoleAccepted } from "hooks/useIsUserRoleAccepted";
import { logger } from "helpers/logger";
import { getRoleInfo, hasPermission, hasAnyPermission } from "helpers/userRoleText";
import { UserRole } from "types";

interface ShowForRolesProps {
  acceptedRoles: UserRole[];
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  logAccess?: boolean;
}

export const ShowForRoles: React.FC<ShowForRolesProps> = ({
  acceptedRoles,
  children,
  requiredPermission,
  requiredPermissions,
  fallback = null,
  logAccess = false,
}: ShowForRolesProps) => {
  const { isRoleAccepted, userRole } = useIsUserRoleAccepted(acceptedRoles);

  // Check additional permissions if specified
  const hasRequiredPermission = requiredPermission 
    ? hasPermission(userRole, requiredPermission)
    : true;

  const hasRequiredPermissions = requiredPermissions 
    ? hasAnyPermission(userRole, requiredPermissions)
    : true;

  const shouldShow = isRoleAccepted && hasRequiredPermission && hasRequiredPermissions;

  // Log access attempts if enabled
  if (logAccess) {
    logger.debug('Role-based access check', {
      userRole,
      acceptedRoles,
      requiredPermission,
      requiredPermissions,
      isRoleAccepted,
      hasRequiredPermission,
      hasRequiredPermissions,
      shouldShow
    }, 'ShowForRoles');
  }

  // Log access denied for security monitoring
  if (!shouldShow && (requiredPermission || requiredPermissions)) {
    logger.warn('Access denied due to insufficient permissions', {
      userRole,
      acceptedRoles,
      requiredPermission,
      requiredPermissions,
      component: 'ShowForRoles'
    }, 'AccessControl');
  }

  if (shouldShow) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

// Enhanced component for permission-based rendering
interface ShowForPermissionProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  logAccess?: boolean;
}

export const ShowForPermission: React.FC<ShowForPermissionProps> = ({
  permission,
  children,
  fallback = null,
  logAccess = false,
}: ShowForPermissionProps) => {
  const { userRole } = useIsUserRoleAccepted([]);
  const hasPermission = userRole ? hasPermission(userRole, permission) : false;

  if (logAccess) {
    logger.debug('Permission-based access check', {
      userRole,
      permission,
      hasPermission
    }, 'ShowForPermission');
  }

  if (!hasPermission) {
    logger.warn('Access denied due to missing permission', {
      userRole,
      permission,
      component: 'ShowForPermission'
    }, 'AccessControl');
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

// Component for role-based content with different fallbacks
interface ShowForRoleWithFallbackProps {
  acceptedRoles: UserRole[];
  children: React.ReactNode;
  fallbackForRole?: (role: UserRole | null) => React.ReactNode;
  defaultFallback?: React.ReactNode;
}

export const ShowForRoleWithFallback: React.FC<ShowForRoleWithFallbackProps> = ({
  acceptedRoles,
  children,
  fallbackForRole,
  defaultFallback = null,
}: ShowForRoleWithFallbackProps) => {
  const { isRoleAccepted, userRole } = useIsUserRoleAccepted(acceptedRoles);

  if (isRoleAccepted) {
    return <>{children}</>;
  }

  if (fallbackForRole && userRole) {
    return <>{fallbackForRole(userRole)}</>;
  }

  return <>{defaultFallback}</>;
};
