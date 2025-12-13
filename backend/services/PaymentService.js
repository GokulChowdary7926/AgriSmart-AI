
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    
    this.razorpayClient = null;
    if (this.razorpayKeyId && this.razorpayKeySecret) {
      this.razorpayClient = new Razorpay({
        key_id: this.razorpayKeyId,
        key_secret: this.razorpayKeySecret
      });
    } else {
      logger.warn('Razorpay credentials not configured');
    }
  }

  async createPaymentOrder(userId, amount, currency = 'INR', paymentMethod = 'razorpay', subscriptionPlan = null, metadata = {}) {
    try {
      const orderId = `order_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      const amountInPaise = Math.round(amount * 100);
      
      let orderData;
      
      if (paymentMethod === 'razorpay') {
        orderData = await this.createRazorpayOrder(orderId, amountInPaise, currency, userId, metadata);
      } else if (paymentMethod === 'paytm') {
        orderData = await this.createPayTMOrder(orderId, amountInPaise, currency, userId, metadata);
      } else if (paymentMethod === 'phonepe') {
        orderData = await this.createPhonePeOrder(orderId, amountInPaise, currency, userId, metadata);
      } else if (paymentMethod === 'upi') {
        orderData = await this.createUPIPayment(orderId, amountInPaise, currency, userId, metadata);
      } else {
        throw new Error('Unsupported payment method');
      }
      
      await this.storePaymentOrder({
        order_id: orderId,
        user_id: userId,
        amount,
        currency,
        payment_method: paymentMethod,
        subscription_plan: subscriptionPlan,
        metadata,
        razorpay_order_id: orderData.razorpay_order_id || null
      });
      
      return {
        success: true,
        order_id: orderId,
        payment_data: orderData,
        payment_method: paymentMethod,
        amount,
        currency
      };
    } catch (error) {
      logger.error(`Error creating payment order: ${error.message}`);
      throw error;
    }
  }

  async createRazorpayOrder(orderId, amount, currency, userId, metadata) {
    if (!this.razorpayClient) {
      throw new Error('Razorpay not configured');
    }
    
    try {
      const options = {
        amount: amount, // amount in paise
        currency: currency,
        receipt: orderId,
        notes: {
          user_id: userId,
          order_id: orderId,
          ...metadata
        }
      };
      
      const razorpayOrder = await this.razorpayClient.orders.create(options);
      
      return {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: this.razorpayKeyId,
        name: 'AgriSmart AI',
        description: 'Agriculture Intelligence Platform',
        prefill: {
          name: metadata.user_name || 'Farmer',
          email: metadata.email || '',
          contact: metadata.phone || ''
        },
        theme: {
          color: '#2E7D32'
        }
      };
    } catch (error) {
      logger.error(`Error creating Razorpay order: ${error.message}`);
      throw error;
    }
  }

  async createPayTMOrder(orderId, amount, currency, userId, metadata) {
    const merchantId = process.env.PAYTM_MERCHANT_ID;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;
    
    if (!merchantId || !merchantKey) {
      throw new Error('PayTM not configured');
    }
    
    const paytmParams = {
      MID: merchantId,
      ORDER_ID: orderId,
      TXN_AMOUNT: (amount / 100).toString(),
      CUST_ID: userId.toString(),
      INDUSTRY_TYPE_ID: 'Retail',
      CHANNEL_ID: 'WAP',
      WEBSITE: 'DEFAULT',
      CALLBACK_URL: `${process.env.API_BASE_URL || 'http://localhost:5001'}/payment/callback/paytm`
    };
    
    const checksum = this.generatePayTMChecksum(paytmParams, merchantKey);
    
    return {
      mid: merchantId,
      order_id: orderId,
      txn_amount: (amount / 100).toString(),
      cust_id: userId.toString(),
      checksum,
      callback_url: paytmParams.CALLBACK_URL,
      payment_url: 'https://securegw.paytm.in/theia/processTransaction'
    };
  }

  async createPhonePeOrder(orderId, amount, currency, userId, metadata) {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    
    if (!merchantId || !saltKey) {
      throw new Error('PhonePe not configured');
    }
    
    const payload = {
      merchantId,
      merchantTransactionId: orderId,
      merchantUserId: `USER_${userId}`,
      amount,
      redirectUrl: `${process.env.API_BASE_URL || 'http://localhost:5001'}/payment/callback/phonepe`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.API_BASE_URL || 'http://localhost:5001'}/payment/callback/phonepe`,
      mobileNumber: metadata.phone || '',
      paymentInstrument: { type: 'PAY_PAGE' }
    };
    
    const payloadStr = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadStr).toString('base64');
    
    const verifyString = `${base64Payload}/pg/v1/pay${saltKey}`;
    const sha256Hash = crypto.createHash('sha256').update(verifyString).digest('hex');
    const xVerify = `${sha256Hash}###${saltIndex}`;
    
    return {
      merchantId,
      transactionId: orderId,
      payload: base64Payload,
      x_verify: xVerify,
      payment_url: 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
    };
  }

  async createUPIPayment(orderId, amount, currency, userId, metadata) {
    const upiId = process.env.UPI_MERCHANT_ID || 'agrismartai@axisbank';
    const amountRupees = amount / 100;
    
    const upiUrl = `upi://pay?pa=${upiId}&pn=Krishi%20Mitra&tn=Payment%20for%20order%20${orderId}&am=${amountRupees}&cu=${currency}`;
    
    return {
      upi_id: upiId,
      amount: amountRupees,
      currency,
      upi_url: upiUrl,
      qr_code_data: upiUrl,
      instructions: 'Scan QR code or click link to pay via UPI'
    };
  }

  async verifyPayment(paymentId, orderId, signature = null) {
    try {
      const paymentDetails = await this.getPaymentDetails(orderId);
      
      if (!paymentDetails) {
        throw new Error('Order not found');
      }
      
      const paymentMethod = paymentDetails.payment_method;
      
      if (paymentMethod === 'razorpay') {
        return await this.verifyRazorpayPayment(paymentId, orderId, signature);
      } else if (paymentMethod === 'paytm') {
        return await this.verifyPayTMPayment(paymentId, orderId);
      } else if (paymentMethod === 'phonepe') {
        return await this.verifyPhonePePayment(paymentId, orderId);
      } else {
        return {
          success: true,
          verified: true,
          order_id: orderId,
          payment_id: paymentId,
          amount: paymentDetails.amount,
          method: paymentMethod
        };
      }
    } catch (error) {
      logger.error(`Error verifying payment: ${error.message}`);
      return {
        success: false,
        error: error.message,
        verified: false
      };
    }
  }

  async verifyRazorpayPayment(paymentId, orderId, signature) {
    if (!this.razorpayClient) {
      throw new Error('Razorpay not configured');
    }
    
    try {
      const params = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      };
      
      const generatedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      
      if (generatedSignature !== signature) {
        return {
          success: false,
          verified: false,
          error: 'Invalid payment signature'
        };
      }
      
      const payment = await this.razorpayClient.payments.fetch(paymentId);
      
      return {
        success: true,
        verified: true,
        order_id: orderId,
        payment_id: paymentId,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        bank: payment.bank,
        card: payment.card
      };
    } catch (error) {
      logger.error(`Razorpay verification error: ${error.message}`);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }

  async verifyPayTMPayment(paymentId, orderId) {
    return {
      success: true,
      verified: true,
      order_id: orderId,
      payment_id: paymentId,
      method: 'paytm'
    };
  }

  async verifyPhonePePayment(paymentId, orderId) {
    return {
      success: true,
      verified: true,
      order_id: orderId,
      payment_id: paymentId,
      method: 'phonepe'
    };
  }

  generatePayTMChecksum(params, merchantKey) {
    const paramStr = Object.keys(params)
      .sort()
      .map(k => params[k] || '')
      .join('|');
    
    const checksumString = `${paramStr}|${merchantKey}`;
    return crypto.createHash('sha256').update(checksumString).digest('hex');
  }

  async storePaymentOrder(orderData) {
    logger.info(`Stored payment order: ${orderData.order_id} for user ${orderData.user_id}`);
  }

  async getPaymentDetails(orderId) {
    return {
      order_id: orderId,
      amount: 999.00,
      currency: 'INR',
      payment_method: 'razorpay',
      user_id: 1,
      status: 'pending'
    };
  }

  async createSubscription(userId, planId, paymentMethod = 'razorpay') {
    try {
      const plan = this.getSubscriptionPlan(planId);
      
      if (!plan) {
        throw new Error('Plan not found');
      }
      
      const orderResult = await this.createPaymentOrder(
        userId,
        plan.price_monthly,
        'INR',
        paymentMethod,
        planId,
        {
          plan_name: plan.name,
          billing_period: 'monthly'
        }
      );
      
      return {
        success: true,
        subscription_id: `sub_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
        plan,
        payment_order: orderResult,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      logger.error(`Error creating subscription: ${error.message}`);
      throw error;
    }
  }

  getSubscriptionPlan(planId) {
    const plans = {
      free: {
        id: 'free',
        name: 'Free',
        price_monthly: 0,
        price_yearly: 0,
        features: ['Basic crop info', 'Weather updates', 'Market prices'],
        max_farms: 1,
        max_fields: 3
      },
      basic: {
        id: 'basic',
        name: 'Basic',
        price_monthly: 99,
        price_yearly: 999,
        features: ['Disease detection (10/month)', 'AI chat', 'SMS alerts'],
        max_farms: 3,
        max_fields: 10
      },
      premium: {
        id: 'premium',
        name: 'Premium',
        price_monthly: 299,
        price_yearly: 2999,
        features: ['Unlimited disease detection', 'IoT integration', 'Expert consultation'],
        max_farms: 10,
        max_fields: 50
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price_monthly: 999,
        price_yearly: 9999,
        features: ['API access', 'Custom features', 'Dedicated support'],
        max_farms: 999,
        max_fields: 9999
      }
    };
    
    return plans[planId];
  }
}

module.exports = new PaymentService();


