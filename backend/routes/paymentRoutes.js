// routes/paymentRoutes.js — Razorpay Payment Integration
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import creditService from '../services/creditService.js';
import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

const router = express.Router();

let razorpay = null;
let resend = null;

// Initialize Resend if key is available
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend email client initialized');
} else {
  console.warn('⚠️ Resend API key missing in .env. Emails will not send.');
}

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

const PLANS = {
  // Planner Subscription Plans
  basic: { name: 'Basic Plan (Planner)', price: 32999, currency: 'INR', type: 'subscription', credits: 100 },
  premium: { name: 'Premium Plan (Planner)', price: 63999, currency: 'INR', type: 'subscription', credits: 210 },
  pro: { name: 'Pro Plan (Planner)', price: 99999, currency: 'INR', type: 'subscription', credits: 400 },
  enterprise: { name: 'Enterprise', price: 0, currency: 'INR', type: 'subscription', credits: 99999 },

  planner_basic: { name: 'Basic Plan (Planner)', price: 32999, currency: 'INR', type: 'subscription', credits: 100 },
  planner_premium: { name: 'Premium Plan (Planner)', price: 63999, currency: 'INR', type: 'subscription', credits: 210 },
  planner_pro: { name: 'Pro Plan (Planner)', price: 99999, currency: 'INR', type: 'subscription', credits: 400 },
  planner_enterprise: { name: 'Enterprise (Planner)', price: 0, currency: 'INR', type: 'subscription', credits: 99999 },

  // Couple Subscription Plans
  couple_basic: { name: 'Basic Plan (Couple)', price: 4999, currency: 'INR', type: 'subscription', credits: 12 },
  couple_premium: { name: 'Premium Plan (Couple)', price: 13499, currency: 'INR', type: 'subscription', credits: 32 },
  couple_pro: { name: 'Pro Plan (Couple)', price: 26999, currency: 'INR', type: 'subscription', credits: 64 },
  couple_elite: { name: 'Pro Plan (Couple)', price: 26999, currency: 'INR', type: 'subscription', credits: 64 } // Legacy fallback
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
      receipt: `rcpt_${String(req.user._id).substring(0, 15)}_${Date.now()}`,
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
    
    const productType = planId.startsWith('planner') ? 'planner' : 'couple';
    
    // Add Credits via CreditService
    if (plan.credits) {
      await creditService.addCredits(
        user._id,
        plan.credits,
        'purchased', // TRANSACTION_SOURCES.PURCHASED
        `rzp_${razorpay_payment_id}`,
        { planId, razorpay_order_id },
        productType
      );
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
   POST /api/payment/library/create-order — Create a Razorpay Order for Template
================================================================ */
router.post('/library/create-order', protect, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    }

    const { templateId, price } = req.body;
    if (!templateId || !price) {
      return res.status(400).json({ success: false, error: 'Template ID and price are required' });
    }

    // Razorpay amount is in smallest currency unit (paise for INR)
    const options = {
      amount: price * 100,
      currency: 'INR',
      receipt: `lib_${templateId.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        templateId: templateId,
        type: 'library_template'
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
    console.error('Razorpay Library Create Order Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create template payment order' });
  }
});

/* ================================================================
   POST /api/payment/library/verify — Verify Razorpay Template Payment Signature
================================================================ */
router.post('/library/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, templateId } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !templateId) {
      return res.status(400).json({ success: false, error: 'Invalid payment details or missing templateId' });
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

    // Add template to user's purchased list
    const user = await User.findById(req.user._id);
    if (!user.purchasedTemplates) {
      user.purchasedTemplates = [];
    }
    
    const templateIds = templateId.split(',').map(id => id.trim()).filter(Boolean);
    for (const id of templateIds) {
      if (!user.purchasedTemplates.includes(id)) {
        user.purchasedTemplates.push(id);
      }
    }
    
    user.lastPaymentStatus = 'success';
    user.lastPaymentAt = new Date();
    await user.save();

    console.log(`✅ Templates [${templateIds.join(', ')}] purchased successfully by ${user.email}`);

    // Send Invoice Email via Resend
    if (resend) {
      try {
        let paymentMethod = 'Razorpay Online';
        let amountStr = '₹23,600';
        if (razorpay) {
          try {
            const payment = await razorpay.payments.fetch(razorpay_payment_id);
            if (payment && payment.method) {
              paymentMethod = payment.method.toUpperCase();
            }
            if (payment && payment.amount) {
              amountStr = `₹${(payment.amount / 100).toLocaleString('en-IN')}`;
            }
          } catch (fetchErr) {
            console.error("Failed to fetch payment details from Razorpay:", fetchErr);
          }
        }

        const templateNames = {
          'ppt-m1': 'Mehndi Luxury Pitch Deck',
          'ppt-m2': 'Mehndi Royal Swing Pitch Deck',
          'ppt-m3': 'Mehndi Boho Marigold Pitch Deck',
          'ppt-m4': 'Mehndi Royal Dome Pitch Deck',
          'ppt-m5': 'Mehndi Modern Fusion Pitch Deck',
          'ppt-my1': 'Mayra Royal Setup Pitch Deck',
          'ppt-s1': 'Sangeet Starlit Pitch Deck',
          'ppt-s2': 'Sangeet Concert Style Pitch Deck',
          'ppt-s3': 'Sangeet Royal Palace Pitch Deck',
          'ppt-s4': 'Sangeet Luxury Ballroom Pitch Deck',
          'ppt-r1': 'Reception Grand Stage Pitch Deck',
          'ppt-r2': 'Reception Glasshouse Layout Pitch Deck',
          'ppt-r3': 'Reception Royal Velvet Stage Pitch Deck',
          'ppt-h1': 'Haldi Sunshine Pitch Deck',
          'ppt-h2': 'Haldi Poolside Pitch Deck',
          'ppt-h3': 'Haldi Marigold Pitch Deck',
          'ppt-sh1': 'Shaadi Royal Mandap Pitch Deck',
          'ppt-sh2': 'Shaadi Royal Floral Pitch Deck',
          'ppt-cl1': 'Carnival Lunch Pitch Deck'
        };
        const resolvedNames = templateIds.map(tid => templateNames[tid] || 'Premium Pitch Deck');
        const templateName = resolvedNames.join(', ');

        const emailData = {
          from: `LoversAI <${process.env.FROM_EMAIL || 'noreply@loversai.com'}>`,
          to: user.email,
          subject: `Invoice for ${templateIds.length === 1 ? templateName : 'Multiple Templates'} Purchase - LoversAI`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; color: #333; line-height: 1.6;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.fullName || user.email.split('@')[0]},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">Thank you for your purchase! 🎉</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">We've successfully received your payment for: <strong>${templateName}</strong>.</p>
              
              <div style="background-color: #fcfbf9; border: 1px solid #f2edd5; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #1a1512; margin-top: 0; margin-bottom: 15px; font-size: 18px; border-bottom: 1px solid #f2edd5; padding-bottom: 8px;">Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #666; font-weight: 500; width: 130px;">Order ID:</td>
                    <td style="padding: 6px 0; color: #1a1512; word-break: break-all;">${razorpay_order_id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666; font-weight: 500;">Amount Paid:</td>
                    <td style="padding: 6px 0; color: #b89f79; font-weight: 600;">${amountStr} (Includes 18% GST)</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666; font-weight: 500;">Payment Date:</td>
                    <td style="padding: 6px 0; color: #1a1512;">${new Date().toLocaleDateString('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666; font-weight: 500;">Payment Method:</td>
                    <td style="padding: 6px 0; color: #1a1512; font-weight: 500;">${paymentMethod}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 15px; margin-bottom: 20px;">Your order has been confirmed and is now being processed.</p>
              
              <p style="font-size: 15px; margin-bottom: 20px;">If you have any questions or need assistance, simply reply to this email or contact our support team.</p>
              
              <p style="font-size: 15px; margin-bottom: 20px;">Thank you for choosing <strong>LoversAI</strong>.</p>
              
              <p style="font-size: 15px; margin-bottom: 5px; margin-top: 30px;">Best regards,</p>
              <p style="font-size: 15px; margin-top: 0; font-weight: bold; color: #1a1512;">The LoversAI Team</p>
            </div>
          `
        };

        const { data, error } = await resend.emails.send(emailData);
        if (error) {
          console.error("Resend Email Sending Error:", error);
        } else {
          console.log(`✉️ Invoice email sent to ${user.email}. ID: ${data?.id}`);
        }
      } catch (emailErr) {
        console.error("Failed to send invoice email:", emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Template purchased successfully',
      purchasedTemplates: user.purchasedTemplates
    });

  } catch (error) {
    console.error('Razorpay Library Verify Error:', error);
    res.status(500).json({ success: false, error: 'Template purchase verification error' });
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
          const productType = planId.startsWith('planner') ? 'planner' : 'couple';
          if (plan.credits) {
            await creditService.addCredits(
              user._id,
              plan.credits,
              'purchased',
              `webhook_${payment.id || Date.now()}`,
              { planId },
              productType
            );
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
    const productType = req.query.wallet;
    if (!productType) {
      return res.status(400).json({ success: false, error: "Missing required 'wallet' query parameter. Must be one of: couple, planner, etc." });
    }
    const walletData = await creditService.getWallet(req.user._id, productType);
    res.json({ success: true, credits: walletData.credits || 0, wallet: walletData.wallet, plan: walletData.plan, productType: walletData.productType });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch credits' });
  }
});

/* ================================================================
   GET /api/payment/transactions — Get user transaction history
================================================================ */
router.get('/transactions', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || null;
    const source = req.query.source || null;
    const productType = req.query.wallet || "couple";

    const data = await creditService.getTransactionHistory(req.user._id, { page, limit, type, source, productType });
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

/* ================================================================
   GET /api/payment/payment-status — Check current subscription
================================================================ */
router.get('/payment-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('isPro plan subscriptionRenewsAt credits purchasedTemplates');
    res.json({
      success: true,
      isPro: user.isPro,
      plan: user.plan,
      renewsAt: user.subscriptionRenewsAt,
      credits: user.credits,
      purchasedTemplates: user.purchasedTemplates || []
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