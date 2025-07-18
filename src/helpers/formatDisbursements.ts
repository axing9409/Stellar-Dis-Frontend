import { ApiDisbursement, Disbursement } from "types";
import { logger } from "./logger";

export const formatDisbursements = (
  disbursements: ApiDisbursement[],
): Disbursement[] => {
  try {
    const formattedDisbursements = disbursements.map((d) => formatDisbursement(d));
    
    logger.info('Disbursements formatted successfully', {
      count: formattedDisbursements.length,
      statuses: formattedDisbursements.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }, 'DisbursementFormat');
    
    return formattedDisbursements;
  } catch (error) {
    logger.error('Failed to format disbursements', error, 'DisbursementFormat');
    throw error;
  }
};

export const formatDisbursement = (
  disbursement: ApiDisbursement,
): Disbursement => {
  try {
    // Validate required disbursement data
    if (!disbursement.id) {
      logger.warn('Disbursement missing ID', { disbursement }, 'DisbursementFormat');
      throw new Error('Disbursement ID is required');
    }

    if (!disbursement.name || disbursement.name.trim() === '') {
      logger.warn('Disbursement missing name', { disbursementId: disbursement.id }, 'DisbursementFormat');
      throw new Error('Disbursement name is required');
    }

    // Validate asset information
    if (!disbursement.asset?.id || !disbursement.asset?.code) {
      logger.warn('Disbursement missing asset information', { disbursementId: disbursement.id }, 'DisbursementFormat');
      throw new Error('Disbursement asset information is required');
    }

    // Validate wallet information
    if (!disbursement.wallet?.id || !disbursement.wallet?.name) {
      logger.warn('Disbursement missing wallet information', { disbursementId: disbursement.id }, 'DisbursementFormat');
      throw new Error('Disbursement wallet information is required');
    }

    // Calculate and validate statistics
    const totalPayments = disbursement.total_payments || 0;
    const successfulPayments = disbursement.total_payments_sent || 0;
    const failedPayments = disbursement.total_payments_failed || 0;
    const canceledPayments = disbursement.total_payments_canceled || 0;
    const remainingPayments = disbursement.total_payments_remaining || 0;

    // Validate payment statistics consistency
    const calculatedTotal = successfulPayments + failedPayments + canceledPayments + remainingPayments;
    if (totalPayments !== calculatedTotal) {
      logger.warn('Disbursement payment statistics mismatch', {
        disbursementId: disbursement.id,
        totalPayments,
        calculatedTotal,
        successfulPayments,
        failedPayments,
        canceledPayments,
        remainingPayments
      }, 'DisbursementFormat');
    }

    // Validate amount calculations
    const totalAmount = disbursement.total_amount || 0;
    const disbursedAmount = disbursement.amount_disbursed || 0;
    const averageAmount = disbursement.average_amount || 0;

    if (totalAmount > 0 && disbursedAmount > totalAmount) {
      logger.warn('Disbursed amount exceeds total amount', {
        disbursementId: disbursement.id,
        totalAmount,
        disbursedAmount
      }, 'DisbursementFormat');
    }

    // Format status history with validation
    const statusHistory = disbursement.status_history
      ?.filter(history => history.timestamp && history.status) // Filter out invalid entries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((h) => ({
        status: h.status,
        timestamp: h.timestamp,
        userId: h.user_id,
      })) || [];

    // Format user names with validation
    const createdBy = disbursement.created_by?.first_name && disbursement.created_by?.last_name
      ? `${disbursement.created_by.first_name} ${disbursement.created_by.last_name}`
      : undefined;

    const startedBy = disbursement.started_by?.first_name && disbursement.started_by?.last_name
      ? `${disbursement.started_by.first_name} ${disbursement.started_by.last_name}`
      : undefined;

    // Log disbursement processing for audit trail
    logger.info('Disbursement formatted successfully', {
      disbursementId: disbursement.id,
      name: disbursement.name,
      status: disbursement.status,
      totalPayments,
      successfulPayments,
      totalAmount,
      disbursedAmount
    }, 'DisbursementFormat');

    return {
      id: disbursement.id,
      name: disbursement.name,
      createdAt: disbursement.created_at,
      createdBy,
      startedBy,
      stats: {
        paymentsSuccessfulCount: successfulPayments,
        paymentsFailedCount: failedPayments,
        paymentsCanceledCount: canceledPayments,
        paymentsRemainingCount: remainingPayments,
        paymentsTotalCount: totalPayments,
        totalAmount,
        disbursedAmount,
        averagePaymentAmount: averageAmount,
      },
      status: disbursement.status,
      registrationContactType: disbursement.registration_contact_type,
      asset: {
        id: disbursement.asset.id,
        code: disbursement.asset.code,
      },
      wallet: {
        id: disbursement.wallet.id,
        name: disbursement.wallet.name,
      },
      verificationField: disbursement.verification_field,
      fileName: disbursement.file_name,
      statusHistory,
      receiverRegistrationMessageTemplate:
        disbursement.receiver_registration_message_template,
    };
  } catch (error) {
    logger.error('Failed to format disbursement', error, 'DisbursementFormat');
    throw error;
  }
};

// Helper function to validate disbursement status transitions
export const validateDisbursementStatusTransition = (
  currentStatus: string,
  newStatus: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    'draft': ['pending', 'canceled'],
    'pending': ['processing', 'canceled'],
    'processing': ['completed', 'failed', 'canceled'],
    'completed': [], // Terminal state
    'failed': ['retry', 'canceled'],
    'canceled': [], // Terminal state
    'retry': ['processing', 'failed', 'canceled']
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

// Helper function to calculate disbursement completion percentage
export const calculateDisbursementCompletion = (disbursement: Disbursement): number => {
  const { paymentsTotalCount, paymentsSuccessfulCount, paymentsFailedCount, paymentsCanceledCount } = disbursement.stats;
  
  if (paymentsTotalCount === 0) return 0;
  
  const completedPayments = paymentsSuccessfulCount + paymentsFailedCount + paymentsCanceledCount;
  return (completedPayments / paymentsTotalCount) * 100;
};

// Helper function to get disbursement status information
export const getDisbursementStatusInfo = (status: string) => {
  const statusInfo = {
    draft: { label: 'Draft', color: 'neutral', description: 'Disbursement is in draft mode' },
    pending: { label: 'Pending', color: 'warning', description: 'Disbursement is pending approval' },
    processing: { label: 'Processing', color: 'info', description: 'Disbursement is being processed' },
    completed: { label: 'Completed', color: 'success', description: 'Disbursement has been completed' },
    failed: { label: 'Failed', color: 'error', description: 'Disbursement processing failed' },
    canceled: { label: 'Canceled', color: 'neutral', description: 'Disbursement was canceled' },
    retry: { label: 'Retry', color: 'warning', description: 'Disbursement will be retried' }
  };

  return statusInfo[status as keyof typeof statusInfo] || {
    label: status,
    color: 'neutral',
    description: 'Unknown disbursement status'
  };
};
