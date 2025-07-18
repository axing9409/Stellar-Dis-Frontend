import { ApiPayment, PaymentDetails } from "types";
import { logger } from "./logger";

export const formatPaymentDetails = (payment: ApiPayment): PaymentDetails => {
  try {
    // Validate required payment data
    if (!payment.id) {
      logger.warn('Payment missing ID', { payment }, 'PaymentFormat');
      throw new Error('Payment ID is required');
    }

    if (!payment.amount || payment.amount <= 0) {
      logger.warn('Invalid payment amount', { payment }, 'PaymentFormat');
      throw new Error('Payment amount must be greater than 0');
    }

    // Validate asset information
    if (!payment.asset?.code) {
      logger.warn('Payment missing asset code', { payment }, 'PaymentFormat');
      throw new Error('Payment asset code is required');
    }

    // Format status history with better error handling
    const statusHistory = payment?.status_history
      ?.filter(history => history.timestamp && history.status) // Filter out invalid entries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((h) => ({
        updatedAt: h.timestamp,
        message: h.status_message || 'Status updated',
        status: h.status,
      })) || [];

    // Validate disbursement information
    const disbursementName = payment.disbursement?.name || "Direct Payment";
    const disbursementId = payment.disbursement?.id || "";
    
    // Log payment processing for audit trail
    logger.info('Payment details formatted successfully', {
      paymentId: payment.id,
      amount: payment.amount,
      assetCode: payment.asset.code,
      status: payment.status,
      disbursementId
    }, 'PaymentFormat');

    return {
      id: payment.id,
      createdAt: payment.created_at,
      disbursementName,
      disbursementId,
      receiverId: payment?.receiver_wallet?.receiver?.id,
      receiverWalletId: payment?.receiver_wallet?.id,
      transactionId: payment.stellar_transaction_id,
      senderAddress: payment.stellar_address,
      totalAmount: payment.amount,
      assetCode: payment.asset.code,
      externalPaymentId: payment?.external_payment_id,
      circleTransferRequestId: payment?.circle_transfer_request_id,
      status: payment.status,
      statusHistory,
    };
  } catch (error) {
    logger.error('Failed to format payment details', error, 'PaymentFormat');
    throw error;
  }
};

// Helper function to validate payment status transitions
export const validatePaymentStatusTransition = (
  currentStatus: string,
  newStatus: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    'pending': ['processing', 'failed', 'canceled'],
    'processing': ['completed', 'failed'],
    'completed': [], // Terminal state
    'failed': ['retry', 'canceled'],
    'canceled': [], // Terminal state
    'retry': ['processing', 'failed', 'canceled']
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

// Helper function to get payment status display information
export const getPaymentStatusInfo = (status: string) => {
  const statusInfo = {
    pending: { label: 'Pending', color: 'warning', description: 'Payment is queued for processing' },
    processing: { label: 'Processing', color: 'info', description: 'Payment is being processed' },
    completed: { label: 'Completed', color: 'success', description: 'Payment has been successfully sent' },
    failed: { label: 'Failed', color: 'error', description: 'Payment processing failed' },
    canceled: { label: 'Canceled', color: 'neutral', description: 'Payment was canceled' },
    retry: { label: 'Retry', color: 'warning', description: 'Payment will be retried' }
  };

  return statusInfo[status as keyof typeof statusInfo] || {
    label: status,
    color: 'neutral',
    description: 'Unknown payment status'
  };
};
