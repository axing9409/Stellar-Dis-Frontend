import { useQuery } from "@tanstack/react-query";
import { API_URL } from "constants/envVariables";
import { fetchApi } from "helpers/fetchApi";
import { logger } from "helpers/logger";
import { performanceMonitor } from "helpers/performance";
import { ApiWallet, AppError } from "types";

type UseWalletsProps = {
  userManaged?: boolean;
  supportedAssets?: string[];
  includeInactive?: boolean;
};

export const useWallets = ({
  userManaged,
  supportedAssets,
  includeInactive = false,
}: UseWalletsProps) => {
  // Validate supported assets format
  const validateSupportedAssets = (assets: string[] | undefined) => {
    if (!assets || assets.length === 0) return assets;
    
    const validAssets = assets.filter(asset => {
      if (!asset || typeof asset !== 'string') {
        logger.warn('Invalid asset format in supportedAssets', { asset }, 'WalletsQuery');
        return false;
      }
      return true;
    });

    if (validAssets.length !== assets.length) {
      logger.warn('Some supported assets were filtered out', {
        original: assets,
        valid: validAssets
      }, 'WalletsQuery');
    }

    return validAssets;
  };

  const validatedAssets = validateSupportedAssets(supportedAssets);

  const query = useQuery<ApiWallet[], AppError>({
    queryKey: ["wallets", { userManaged, supportedAssets: validatedAssets, includeInactive }],
    queryFn: async () => {
      return await performanceMonitor.measureAsync(
        'wallets-api-call',
        async () => {
          const url = new URL(`${API_URL}/wallets`);

          if (userManaged !== undefined) {
            url.searchParams.append("user_managed", userManaged.toString());
          }

          if (validatedAssets && validatedAssets.length > 0) {
            url.searchParams.set("supported_assets", validatedAssets.join(","));
          }

          if (includeInactive) {
            url.searchParams.append("include_inactive", "true");
          }

          const result = await fetchApi(url.toString());
          
          // Log successful query for audit trail
          logger.info('Wallets query executed successfully', {
            userManaged,
            supportedAssetsCount: validatedAssets?.length || 0,
            includeInactive,
            resultCount: result?.length || 0
          }, 'WalletsQuery');
          
          return result;
        },
        { userManaged, supportedAssets: validatedAssets, includeInactive }
      );
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - wallet data doesn't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        logger.warn('Wallets query failed with client error, not retrying', {
          error: error.message,
          status: error.status
        }, 'WalletsQuery');
        return false;
      }
      
      // Retry up to 3 times for server errors
      if (failureCount >= 3) {
        logger.error('Wallets query failed after 3 retries', {
          error: error.message,
          failureCount
        }, 'WalletsQuery');
        return false;
      }
      
      return true;
    },
    onError: (error) => {
      logger.error('Wallets query failed', error, 'WalletsQuery');
    }
  });

  return query;
};
