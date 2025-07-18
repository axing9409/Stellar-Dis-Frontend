import { ApiReceiver, PaymentDetailsReceiver } from "types";
import { logger } from "./logger";

export const formatPaymentReceiver = (
  receiver: ApiReceiver,
  receiverWalletId: string | undefined,
): PaymentDetailsReceiver => {
  try {
    // Validate receiver data
    if (!receiver.id) {
      logger.warn('Receiver missing ID', { receiver }, 'ReceiverFormat');
      throw new Error('Receiver ID is required');
    }

    // Find the specific wallet for this payment
    const paymentWallet = receiverWalletId
      ? receiver.wallets.find((w) => w.id === receiverWalletId)
      : undefined;

    // Validate wallet information if walletId is provided
    if (receiverWalletId && !paymentWallet) {
      logger.warn('Receiver wallet not found', { 
        receiverId: receiver.id, 
        walletId: receiverWalletId,
        availableWallets: receiver.wallets.map(w => w.id)
      }, 'ReceiverFormat');
    }

    // Calculate payment statistics with validation
    const totalPayments = Number(receiver.total_payments) || 0;
    const successfulPayments = Number(receiver.successful_payments) || 0;
    
    // Validate payment statistics
    if (successfulPayments > totalPayments) {
      logger.warn('Invalid payment statistics', {
        receiverId: receiver.id,
        totalPayments,
        successfulPayments
      }, 'ReceiverFormat');
    }

    // Format received amounts with validation
    const amountsReceived = receiver.received_amounts?.map((a) => {
      if (!a.received_amount || a.received_amount <= 0) {
        logger.warn('Invalid received amount', { amount: a }, 'ReceiverFormat');
      }
      
      return {
        amount: a.received_amount,
        assetCode: a.asset_code,
        assetIssuer: a.asset_issuer,
      };
    }).filter(amount => amount.amount > 0) || [];

    // Log receiver processing for audit trail
    logger.info('Receiver details formatted successfully', {
      receiverId: receiver.id,
      totalPayments,
      successfulPayments,
      walletCount: receiver.wallets.length,
      amountsReceivedCount: amountsReceived.length
    }, 'ReceiverFormat');

    return {
      id: receiver.id,
      phoneNumber: receiver.phone_number,
      email: receiver.email,
      walletAddress: paymentWallet?.stellar_address || "",
      provider: paymentWallet?.wallet.name || "",
      totalPaymentsCount: totalPayments,
      successfulPaymentsCount: successfulPayments,
      createdAt: paymentWallet?.created_at || "",
      amountsReceived,
      status: paymentWallet?.status,
    };
  } catch (error) {
    logger.error('Failed to format receiver details', error, 'ReceiverFormat');
    throw error;
  }
};

// Helper function to validate receiver contact information
export const validateReceiverContact = (receiver: ApiReceiver): boolean => {
  const hasPhone = receiver.phone_number && receiver.phone_number.trim() !== '';
  const hasEmail = receiver.email && receiver.email.trim() !== '';
  
  if (!hasPhone && !hasEmail) {
    logger.warn('Receiver has no contact information', { receiverId: receiver.id }, 'ReceiverValidation');
    return false;
  }
  
  return true;
};

// Helper function to get receiver status information
export const getReceiverStatusInfo = (status: string) => {
  const statusInfo = {
    active: { label: 'Active', color: 'success', description: 'Receiver is active and can receive payments' },
    inactive: { label: 'Inactive', color: 'neutral', description: 'Receiver is inactive' },
    pending: { label: 'Pending', color: 'warning', description: 'Receiver registration is pending' },
    suspended: { label: 'Suspended', color: 'error', description: 'Receiver account is suspended' }
  };

  return statusInfo[status as keyof typeof statusInfo] || {
    label: status,
    color: 'neutral',
    description: 'Unknown receiver status'
  };
};

// Helper function to calculate receiver success rate
export const calculateReceiverSuccessRate = (receiver: ApiReceiver): number => {
  const totalPayments = Number(receiver.total_payments) || 0;
  const successfulPayments = Number(receiver.successful_payments) || 0;
  
  if (totalPayments === 0) return 0;
  
  return (successfulPayments / totalPayments) * 100;
};
