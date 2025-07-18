import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "constants/envVariables";
import { fetchApi } from "helpers/fetchApi";
import { logger } from "helpers/logger";
import { performanceMonitor } from "helpers/performance";
import { getRoleInfo, compareRoleLevels } from "helpers/userRoleText";
import { AppError, UserRole } from "types";

type UserRoleProps = {
  userId: string;
  role: UserRole;
  currentUserRole?: UserRole;
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ userId, role, currentUserRole }: UserRoleProps) => {
      return await performanceMonitor.measureAsync(
        'update-user-role',
        async () => {
          // Validate role change permissions
          if (currentUserRole) {
            const canChangeRole = validateRoleChangePermission(currentUserRole, role);
            if (!canChangeRole.isValid) {
              throw new Error(canChangeRole.reason);
            }
          }

          // Validate role format
          const roleValidation = validateRole(role);
          if (!roleValidation.isValid) {
            throw new Error(`Invalid role: ${roleValidation.errors.join(', ')}`);
          }

          logger.info('Updating user role', {
            userId,
            newRole: role,
            currentUserRole
          }, 'UserRoleUpdate');

          const result = await fetchApi(`${API_URL}/users/roles`, {
            method: "PATCH",
            body: JSON.stringify({
              user_id: userId,
              roles: [role],
            }),
          });

          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });

          logger.info('User role updated successfully', {
            userId,
            newRole: role
          }, 'UserRoleUpdate');

          return result;
        },
        { userId, role, currentUserRole }
      );
    },
    onError: (error, variables) => {
      logger.error('Failed to update user role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: variables.userId,
        role: variables.role
      }, 'UserRoleUpdate');
    }
  });

  return {
    ...mutation,
    error: mutation.error as AppError,
    data: mutation.data as { message: string },
    mutateAsync: async ({ userId, role, currentUserRole }: UserRoleProps) => {
      try {
        await mutation.mutateAsync({ userId, role, currentUserRole });
      } catch (error) {
        logger.error('User role update failed', error, 'UserRoleUpdate');
        throw error;
      }
    },
  };
};

// Validate role change permissions
const validateRoleChangePermission = (currentUserRole: UserRole, newRole: UserRole): {
  isValid: boolean;
  reason?: string;
} => {
  try {
    const currentRoleInfo = getRoleInfo(currentUserRole);
    const newRoleInfo = getRoleInfo(newRole);

    // Check if current user can assign this role
    if (!currentRoleInfo.permissions.includes('manage_roles')) {
      return {
        isValid: false,
        reason: 'Insufficient permissions to manage user roles'
      };
    }

    // Check if trying to assign a higher level role
    if (newRoleInfo.level > currentRoleInfo.level) {
      return {
        isValid: false,
        reason: 'Cannot assign a role with higher permissions than your own'
      };
    }

    // Check if trying to assign owner role (special case)
    if (newRole === 'owner' && currentUserRole !== 'owner') {
      return {
        isValid: false,
        reason: 'Only existing owners can assign owner role'
      };
    }

    return { isValid: true };
  } catch (error) {
    logger.error('Error validating role change permission', error, 'UserRoleUpdate');
    return {
      isValid: false,
      reason: 'Error validating role change permissions'
    };
  }
};

// Validate role format
const validateRole = (role: UserRole): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    if (!role || typeof role !== 'string') {
      errors.push('Role is required and must be a string');
      return { isValid: false, errors };
    }

    const validRoles: UserRole[] = ['owner', 'business', 'developer', 'financial_controller'];
    
    if (!validRoles.includes(role)) {
      errors.push(`Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error validating role', error, 'UserRoleUpdate');
    errors.push('Unexpected error during role validation');
    return { isValid: false, errors };
  }
};
