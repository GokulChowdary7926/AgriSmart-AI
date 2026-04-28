
const express = require('express');
const router = express.Router();
const paymentService = require('../services/PaymentService');
const { authenticateToken } = require('../middleware/auth');
const { badRequest, serverError, ok } = require('../utils/httpResponses');

router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const {
      amount,
      currency = 'INR',
      payment_method = 'razorpay',
      subscription_plan = null,
      metadata = {}
    } = req.body;
    
    if (!amount || amount <= 0) {
      return badRequest(res, 'Valid amount is required');
    }
    
    const userId = req.user.id;
    
    const order = await paymentService.createPaymentOrder(
      userId,
      amount,
      currency,
      payment_method,
      subscription_plan,
      {
        ...metadata,
        user_name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }
    );
    
    return ok(res, order, {
      source: 'AgriSmart AI',
      isFallback: Boolean(order?.fallback || order?.success === false),
      degradedReason: order?.fallback || order?.success === false ? 'payment_order_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { payment_id, order_id, signature } = req.body;
    
    if (!payment_id || !order_id) {
      return badRequest(res, 'payment_id and order_id are required');
    }
    
    const verification = await paymentService.verifyPayment(
      payment_id,
      order_id,
      signature
    );
    
    return ok(res, verification, {
      source: 'AgriSmart AI',
      isFallback: Boolean(verification?.fallback || verification?.success === false),
      degradedReason: verification?.fallback || verification?.success === false ? 'payment_verification_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post('/subscription/create', authenticateToken, async (req, res) => {
  try {
    const { plan_id, payment_method = 'razorpay' } = req.body;
    
    if (!plan_id) {
      return badRequest(res, 'plan_id is required');
    }
    
    const userId = req.user.id;
    
    const subscription = await paymentService.createSubscription(
      userId,
      plan_id,
      payment_method
    );
    
    return ok(res, subscription, {
      source: 'AgriSmart AI',
      isFallback: Boolean(subscription?.fallback || subscription?.success === false),
      degradedReason: subscription?.fallback || subscription?.success === false ? 'payment_subscription_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/plans', async (req, res) => {
  try {
    const plans = {
      free: paymentService.getSubscriptionPlan('free'),
      basic: paymentService.getSubscriptionPlan('basic'),
      premium: paymentService.getSubscriptionPlan('premium'),
      enterprise: paymentService.getSubscriptionPlan('enterprise')
    };
    
    return ok(res, { plans }, { source: 'AgriSmart AI', isFallback: false, plans });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post('/callback/razorpay', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    const verification = await paymentService.verifyRazorpayPayment(
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    );
    
    if (verification.success && verification.verified) {
      res.redirect(`${process.env.FRONTEND_URL}/payment/success?order_id=${razorpay_order_id}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=${verification.error}`);
    }
  } catch (error) {
    return serverError(res, error.message);
  }
});

module.exports = router;
















