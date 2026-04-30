// routes/paymentRoutes.js — Razorpay Payment Integration
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

let razorpay = null;

// Initialize Razorpay instance if keys are available
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay initialized');
} else {
  console.warn('⚠️ Razorpay keys missing in .env. Payments will not work.');
}

// Fixed Plans & Credit Packages
const PLANS = {
  // Subscription Plans
  pro: { name: 'Pro Plan', price: 999, currency: 'INR', type: 'subscription', credits: 100 },
  premium: { name: 'Premium Plan', price: 1999, currency: 'INR', type: 'subscription', credits: 300 },
  
  // Credit Top-ups
  credits_10: { name: '10 AI Credits', price: 99, currency: 'INR', type: 'credits', credits: 10 },
  credits_50: { name: '50 AI Credits', price: 399, currency: 'INR', type: 'credits', credits: 50 },
  credits_100: { name: '100 AI Credits', price: 699, currency: 'INR', type: 'credits', credits: 100 }
};

/* ================================================================
   GET /api/payment/plans — View available plans
================================================================ */
router.get('/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

/* ================================================================
   POST /api/payment/create-order — Create a Razorpay Order
================================================================ */
router.post('/create-order', protect, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    }

    const { planId } = req.body;
    const plan = PLANS[planId];
    
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    // Razorpay amount is in smallest currency unit (paise for INR)
    const options = {
      amount: plan.price * 100,
      currency: plan.currency,
      receipt: `rcpt_${req.user._id}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        planId: planId,
        type: plan.type
      }
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment order' });
  }
});

/* ================================================================
   POST /api/payment/verify — Verify Razorpay Payment Signature
================================================================ */
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment details' });
    }

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // Payment is valid — Provide the credits/subscription to the user
    const user = await User.findById(req.user._id);
    
    // Add Credits
    if (plan.credits) {
      user.credits = (user.credits || 0) + plan.credits;
    }
    
    // Upgrade subscription if applicable
    if (plan.type === 'subscription') {
      user.isPro = true;
      user.plan = planId;
      // Set to 30 days from now
      user.subscriptionRenewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    // Update payment metadata
    user.lastPaymentStatus = 'paid';
    user.lastPaymentAt = new Date();
    await user.save();

    console.log(`✅ Payment verified for ${user.email}. Added ${plan.credits} credits.`);

    res.json({
      success: true,
      message: 'Payment successful',
      user: {
        credits: user.credits,
        isPro: user.isPro,
        plan: user.plan
      }
    });

  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ success: false, error: 'Payment verification error' });
  }
});

/* ================================================================
   POST /api/payment/webhook — Razorpay Webhook Handler
================================================================ */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!webhookSecret || !signature) {
      return res.status(400).json({ error: 'Webhook secret or signature missing' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const { payload } = event;

    if (event.event === 'payment.captured') {
      const payment = payload.payment.entity;
      const userId = payment.notes?.userId;
      const planId = payment.notes?.planId;

      if (userId && planId) {
        const user = await User.findById(userId);
        const plan = PLANS[planId];

        if (user && plan) {
          if (plan.credits) {
            user.credits = (user.credits || 0) + plan.credits;
          }
          if (plan.type === 'subscription') {
            user.isPro = true;
            user.plan = planId;
            user.subscriptionRenewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
          user.lastPaymentStatus = 'paid';
          user.lastPaymentAt = new Date();
          await user.save();
          console.log(`✅ Webhook: Payment captured for ${user.email}. Plan: ${planId}`);
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/* ================================================================
   GET /api/payment/credits — Get current user credits
================================================================ */
router.get('/credits', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits');
    res.json({ success: true, credits: user.credits || 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch credits' });
  }
});

/* ================================================================
   GET /api/payment/payment-status — Check current subscription
================================================================ */
router.get('/payment-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('isPro plan subscriptionRenewsAt credits');
    res.json({
      success: true,
      isPro: user.isPro,
      plan: user.plan,
      renewsAt: user.subscriptionRenewsAt,
      credits: user.credits
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

/* ================================================================
   GET /api/payment/payment-history — Get fake history (For now)
================================================================ */
router.get('/payment-history', protect, async (req, res) => {
  try {
    // In a real app, you would query a Payment/Order model here
    // For now, return a placeholder indicating the last payment
    const user = await User.findById(req.user._id);
    const history = [];
    
    if (user.lastPaymentAt && user.lastPaymentStatus === 'paid') {
      history.push({
        id: 'txn_' + user.lastPaymentAt.getTime(),
        date: user.lastPaymentAt,
        status: 'paid',
        plan: user.plan || 'Credits',
        amount: 'N/A' // Need Order model to store history properly
      });
    }
    
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

export default router;