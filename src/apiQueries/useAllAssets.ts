import { useQuery } from "@tanstack/react-query";
import { API_URL } from "constants/envVariables";
import { fetchApi } from "helpers/fetchApi";
import { logger } from "helpers/logger";
import { performanceMonitor } from "helpers/performance";
import { ApiAsset, AppError } from "types";

export const useAllAssets = () => {
  const query = useQuery<ApiAsset[], AppError>({
    queryKey: ["assets", "all"],
    queryFn: async () => {
      return await performanceMonitor.measureAsync(
        'assets-api-call',
        async () => {
          const result = await fetchApi(`${API_URL}/assets`);
          
          // Log successful query for audit trail
          logger.info('Assets query executed successfully', {
            resultCount: result?.length || 0,
            assetCodes: result?.map(asset => asset.code).slice(0, 5) // Log first 5 asset codes
          }, 'AssetsQuery');
          
          return result;
        }
      );
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - asset data changes very infrequently
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        logger.warn('Assets query failed with client error, not retrying', {
          error: error.message,
          status: error.status
        }, 'AssetsQuery');
        return false;
      }
      
      // Retry up to 2 times for server errors (assets are less critical)
      if (failureCount >= 2) {
        logger.error('Assets query failed after 2 retries', {
          error: error.message,
          failureCount
        }, 'AssetsQuery');
        return false;
      }
      
      return true;
    },
    onError: (error) => {
      logger.error('Assets query failed', error, 'AssetsQuery');
    }
  });

  return query;
};
