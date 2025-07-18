import { useQuery } from "@tanstack/react-query";
import { handleSearchParams } from "api/handleSearchParams";
import { API_URL } from "constants/envVariables";
import { fetchApi } from "helpers/fetchApi";
import { logger } from "helpers/logger";
import { performanceMonitor } from "helpers/performance";
import { ApiPayments, AppError, PaymentsSearchParams } from "types";

export const usePayments = (searchParams?: PaymentsSearchParams) => {
  // ALL status is for UI only
  if (searchParams?.status === "ALL") {
    delete searchParams.status;
  }

  // Validate search parameters
  const validateSearchParams = (params: PaymentsSearchParams | undefined) => {
    if (params?.amount_min && params?.amount_max && params.amount_min > params.amount_max) {
      logger.warn('Invalid amount range in search params', { 
        amount_min: params.amount_min, 
        amount_max: params.amount_max 
      }, 'PaymentsQuery');
    }

    if (params?.date_from && params?.date_to) {
      const fromDate = new Date(params.date_from);
      const toDate = new Date(params.date_to);
      if (fromDate > toDate) {
        logger.warn('Invalid date range in search params', { 
          date_from: params.date_from, 
          date_to: params.date_to 
        }, 'PaymentsQuery');
      }
    }

    return params;
  };

  const validatedParams = validateSearchParams(searchParams);
  const params = handleSearchParams(validatedParams);

  const query = useQuery<ApiPayments, AppError>({
    queryKey: ["payments", { ...validatedParams }],
    queryFn: async () => {
      return await performanceMonitor.measureAsync(
        'payments-api-call',
        async () => {
          const result = await fetchApi(`${API_URL}/payments/${params}`);
          
          // Log successful query for audit trail
          logger.info('Payments query executed successfully', {
            params: validatedParams,
            resultCount: result.data?.length || 0,
            totalCount: result.total_count || 0
          }, 'PaymentsQuery');
          
          return result;
        },
        { params: validatedParams }
      );
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        logger.warn('Payments query failed with client error, not retrying', {
          error: error.message,
          status: error.status
        }, 'PaymentsQuery');
        return false;
      }
      
      // Retry up to 3 times for server errors
      if (failureCount >= 3) {
        logger.error('Payments query failed after 3 retries', {
          error: error.message,
          failureCount
        }, 'PaymentsQuery');
        return false;
      }
      
      return true;
    },
    onError: (error) => {
      logger.error('Payments query failed', error, 'PaymentsQuery');
    }
  });

  return query;
};
