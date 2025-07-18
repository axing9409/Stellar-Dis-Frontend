import { useQuery } from "@tanstack/react-query";
import { handleSearchParams } from "api/handleSearchParams";
import { API_URL } from "constants/envVariables";
import { fetchApi } from "helpers/fetchApi";
import { formatReceivers } from "helpers/formatReceivers";
import { logger } from "helpers/logger";
import { performanceMonitor } from "helpers/performance";
import { ApiReceivers, AppError, ReceiversSearchParams } from "types";

export const useReceivers = (searchParams?: ReceiversSearchParams) => {
  // ALL status is for UI only
  if (searchParams?.status === "ALL") {
    delete searchParams.status;
  }

  // Validate search parameters
  const validateSearchParams = (params: ReceiversSearchParams | undefined) => {
    if (params?.payments_min && params?.payments_max && params.payments_min > params.payments_max) {
      logger.warn('Invalid payments range in search params', { 
        payments_min: params.payments_min, 
        payments_max: params.payments_max 
      }, 'ReceiversQuery');
    }

    // Validate search term length
    if (params?.search && params.search.length < 2) {
      logger.warn('Search term too short', { search: params.search }, 'ReceiversQuery');
    }

    return params;
  };

  const validatedParams = validateSearchParams(searchParams);
  const params = handleSearchParams(validatedParams);

  const query = useQuery<ApiReceivers, AppError>({
    queryKey: ["receivers", { ...validatedParams }],
    queryFn: async () => {
      return await performanceMonitor.measureAsync(
        'receivers-api-call',
        async () => {
          const result = await fetchApi(`${API_URL}/receivers/${params}`);
          
          // Log successful query for audit trail
          logger.info('Receivers query executed successfully', {
            params: validatedParams,
            resultCount: result.data?.length || 0,
            totalCount: result.total_count || 0
          }, 'ReceiversQuery');
          
          return result;
        },
        { params: validatedParams }
      );
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        logger.warn('Receivers query failed with client error, not retrying', {
          error: error.message,
          status: error.status
        }, 'ReceiversQuery');
        return false;
      }
      
      // Retry up to 3 times for server errors
      if (failureCount >= 3) {
        logger.error('Receivers query failed after 3 retries', {
          error: error.message,
          failureCount
        }, 'ReceiversQuery');
        return false;
      }
      
      return true;
    },
    onError: (error) => {
      logger.error('Receivers query failed', error, 'ReceiversQuery');
    }
  });

  return {
    ...query,
    data: query.data
      ? {
          ...query.data,
          data: formatReceivers(query.data.data),
        }
      : undefined,
  };
};
