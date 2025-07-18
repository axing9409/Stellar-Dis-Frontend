import { UserRole } from "types";
import { logger } from "./logger";

export interface RoleInfo {
  displayName: string;
  description: string;
  permissions: string[];
  level: number; // Higher number = more permissions
}

export const userRoleText = (role?: UserRole | null): string => {
  try {
    switch (role) {
      case "owner":
        return "Owner";
      case "business":
        return "Business user";
      case "developer":
        return "Developer";
      case "financial_controller":
        return "Financial controller";
      default:
        logger.warn('Unknown user role encountered', { role }, 'UserRole');
        return role || "Unknown";
    }
  } catch (error) {
    logger.error('Error getting user role text', error, 'UserRole');
    return "Unknown";
  }
};

// Enhanced role information with permissions and descriptions
export const getRoleInfo = (role?: UserRole | null): RoleInfo => {
  const defaultRole: RoleInfo = {
    displayName: "Unknown",
    description: "Unknown role with no permissions",
    permissions: [],
    level: 0
  };

  try {
    switch (role) {
      case "owner":
        return {
          displayName: "Owner",
          description: "Full system access with all permissions",
          permissions: [
            "manage_users",
            "manage_roles",
            "manage_disbursements",
            "manage_payments",
            "manage_wallets",
            "manage_assets",
            "view_analytics",
            "manage_settings",
            "manage_api_keys",
            "manage_organization"
          ],
          level: 100
        };
      
      case "business":
        return {
          displayName: "Business User",
          description: "Business operations with limited administrative access",
          permissions: [
            "manage_disbursements",
            "manage_payments",
            "view_receivers",
            "view_analytics",
            "manage_api_keys",
            "view_settings"
          ],
          level: 75
        };
      
      case "developer":
        return {
          displayName: "Developer",
          description: "Technical access for development and integration",
          permissions: [
            "manage_api_keys",
            "view_disbursements",
            "view_payments",
            "view_analytics",
            "manage_integrations",
            "view_settings"
          ],
          level: 60
        };
      
      case "financial_controller":
        return {
          displayName: "Financial Controller",
          description: "Financial oversight and control permissions",
          permissions: [
            "view_disbursements",
            "view_payments",
            "view_receivers",
            "view_analytics",
            "approve_payments",
            "view_financial_reports",
            "manage_payment_limits"
          ],
          level: 80
        };
      
      default:
        logger.warn('Unknown user role encountered', { role }, 'UserRole');
        return defaultRole;
    }
  } catch (error) {
    logger.error('Error getting role info', error, 'UserRole');
    return defaultRole;
  }
};

// Check if a role has a specific permission
export const hasPermission = (role: UserRole | null | undefined, permission: string): boolean => {
  try {
    const roleInfo = getRoleInfo(role);
    return roleInfo.permissions.includes(permission);
  } catch (error) {
    logger.error('Error checking permission', { role, permission, error }, 'UserRole');
    return false;
  }
};

// Check if a role has any of the specified permissions
export const hasAnyPermission = (role: UserRole | null | undefined, permissions: string[]): boolean => {
  try {
    const roleInfo = getRoleInfo(role);
    return permissions.some(permission => roleInfo.permissions.includes(permission));
  } catch (error) {
    logger.error('Error checking permissions', { role, permissions, error }, 'UserRole');
    return false;
  }
};

// Check if a role has all of the specified permissions
export const hasAllPermissions = (role: UserRole | null | undefined, permissions: string[]): boolean => {
  try {
    const roleInfo = getRoleInfo(role);
    return permissions.every(permission => roleInfo.permissions.includes(permission));
  } catch (error) {
    logger.error('Error checking all permissions', { role, permissions, error }, 'UserRole');
    return false;
  }
};

// Compare role levels
export const compareRoleLevels = (role1: UserRole | null | undefined, role2: UserRole | null | undefined): number => {
  try {
    const info1 = getRoleInfo(role1);
    const info2 = getRoleInfo(role2);
    return info1.level - info2.level;
  } catch (error) {
    logger.error('Error comparing role levels', { role1, role2, error }, 'UserRole');
    return 0;
  }
};

// Get all available roles
export const getAvailableRoles = (): Array<{ role: UserRole; info: RoleInfo }> => {
  const roles: UserRole[] = ["owner", "business", "developer", "financial_controller"];
  
  return roles.map(role => ({
    role,
    info: getRoleInfo(role)
  }));
};
