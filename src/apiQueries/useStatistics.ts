import { useQuery } from "@tanstack/react-query";
import { API_URL } from "constants/envVariables";
import { fetchApi } from "helpers/fetchApi";
import { formatStatistics } from "helpers/formatStatistics";
import { logger } from "helpers/logger";
import { performanceMonitor } from "helpers/performance";
import { ApiStatistics, AppError } from "types";

export const useStatistics = (isAuthenticated: boolean) => {
  const query = useQuery<ApiStatistics, AppError>({
    queryKey: ["statistics"],
    queryFn: async () => {
      return await performanceMonitor.measureAsync(
        'statistics-api-call',
        async () => {
          const result = await fetchApi(`${API_URL}/statistics`);
          
          // Log successful query for audit trail
          logger.info('Statistics query executed successfully', {
            totalPayments: result.total_payments,
            totalDisbursements: result.total_disbursements,
            totalReceivers: result.total_receivers
          }, 'StatisticsQuery');
          
          return result;
        }
      );
    },
    enabled: Boolean(isAuthenticated),
    staleTime: 2 * 60 * 1000, // 2 minutes - statistics change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        logger.warn('Statistics query failed with client error, not retrying', {
          error: error.message,
          status: error.status
        }, 'StatisticsQuery');
        return false;
      }
      
      // Retry up to 2 times for server errors (statistics are less critical)
      if (failureCount >= 2) {
        logger.error('Statistics query failed after 2 retries', {
          error: error.message,
          failureCount
        }, 'StatisticsQuery');
        return false;
      }
      
      return true;
    },
    onError: (error) => {
      logger.error('Statistics query failed', error, 'StatisticsQuery');
    }
  });

  return {
    ...query,
    data: query.data ? formatStatistics(query.data) : undefined,
  };
};
