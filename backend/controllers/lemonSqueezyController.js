// controllers/lemonSqueezyController.js
import crypto from "crypto";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";

// PLAN → MONTHLY CREDITS
const PLAN_CREDITS = {
  basic: 1300,
  premium: 6500,
  free: 100
};

// Plan prices
const PLAN_PRICES = {
  basic: 29,
  premium: 99,
  free: 0
};

export const lemonWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-signature"];
    
    if (!signature) {
      console.error("❌ No signature provided in webhook");
      return res.status(401).json({ msg: "No signature" });
    }

    // ✅ RAW BUFFER
    const rawBody = req.body;

    // Verify signature
    const hash = crypto
      .createHmac("sha256", process.env.LEMON_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid webhook signature");
      console.error("Expected:", hash);
      console.error("Received:", signature);
      return res.status(401).json({ msg: "Invalid signature" });
    }

    // ✅ Parse AFTER verification
    const body = JSON.parse(rawBody.toString());
    const event = body.meta.event_name;
    const data = body.data;
    const attributes = data.attributes;
    
    console.log(`\n🔔 ======== WEBHOOK RECEIVED ========`);
    console.log(`Event: ${event}`);
    console.log(`Data ID: ${data.id}`);
    console.log(`Email: ${attributes.user_email}`);
    console.log(`Status: ${attributes.status}`);
    console.log(`====================================\n`);

    // Handle different events
    switch (event) {
      case "subscription_created":
        await handleSubscriptionCreated(data);
        break;
        
      case "subscription_updated":
        await handleSubscriptionUpdated(data);
        break;
        
      case "subscription_cancelled":
        await handleSubscriptionCancelled(data);
        break;
        
      case "subscription_expired":
        await handleSubscriptionExpired(data);
        break;
        
      case "subscription_payment_success":
        await handlePaymentSuccess(data);
        break;
        
      case "subscription_payment_failed":
        await handlePaymentFailed(data);
        break;
        
      case "subscription_payment_recovered":
        await handlePaymentRecovered(data);
        break;
        
      case "order_created":
        await handleOrderCreated(data);
        break;
        
      default:
        console.log(`ℹ️ Unhandled event: ${event}`);
    }

    res.json({ received: true, event });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ msg: "Webhook error" });
  }
};

async function handleSubscriptionCreated(data) {
  try {
    console.log("\n📝 ====== HANDLING SUBSCRIPTION CREATED ======");
    const subscriptionId = data.id;
    const attributes = data.attributes;
    const customerId = attributes.customer_id;
    const email = attributes.user_email;
    const status = attributes.status;
    const variantName = attributes.variant_name;
    const renewsAt = attributes.renews_at;
    const urls = attributes.urls;
    
    console.log("Subscription Details:", {
      subscriptionId,
      customerId,
      email,
      status,
      variantName,
      renewsAt,
      updatePaymentMethod: urls?.update_payment_method,
    });
    
    // Detect plan from variant name
    const variantNameLower = variantName.toLowerCase();
    let plan = "basic";
    if (variantNameLower.includes("premium")) plan = "premium";
    else if (variantNameLower.includes("basic")) plan = "basic";
    
    const credits = PLAN_CREDITS[plan] || 0;
    const price = PLAN_PRICES[plan] || 0;
    
    console.log(`Detected plan: ${plan} with ${credits} credits`);
    
    // Find user by email
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Try to find by Lemon Customer ID
      user = await User.findOne({ lemonCustomerId: customerId });
      console.log(`User found by lemonCustomerId: ${user ? 'Yes' : 'No'}`);
    }
    
    if (!user) {
      console.log(`❌ User not found for subscription. Email: ${email}`);
      console.log("Creating temporary user record...");
      
      // Create a temporary user for tracking
      user = new User({
        email: email.toLowerCase(),
        lemonCustomerId: customerId,
        profileCompleted: false,
        plan: plan,
        credits: credits,
        isPro: status === "active",
        subscriptionStatus: status,
        subscriptionRenewsAt: renewsAt ? new Date(renewsAt) : null,
        lastPaymentStatus: "pending",
        lastPaymentAt: new Date(),
      });
      
      // Generate a temporary firebaseUid
      user.firebaseUid = `lemon_${customerId}_${Date.now()}`;
      user.fullName = email.split('@')[0]; // Temporary name
      
      await user.save();
      console.log(`✅ Created temporary user with ID: ${user._id}`);
    } else {
      console.log(`✅ Found existing user: ${user._id}`);
    }
    
    // Create or update subscription record
    const subscription = await Subscription.findOneAndUpdate(
      { lemonSubscriptionId: subscriptionId },
      {
        userId: user._id,
        lemonSubscriptionId: subscriptionId,
        lemonCustomerId: customerId,
        status: status,
        plan: plan,
        price: price,
        creditsGranted: credits,
        creditsUsed: 0,
        renewsAt: renewsAt ? new Date(renewsAt) : null,
        startsAt: new Date(),
        lastPaymentStatus: "pending",
        lastPaymentAt: new Date(),
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );
    
    console.log(`✅ Subscription saved: ${subscription._id}`);
    
    // Update user with subscription info
    user.lemonCustomerId = customerId;
    user.plan = plan;
    user.subscriptionStatus = status;
    user.subscriptionRenewsAt = renewsAt ? new Date(renewsAt) : null;
    user.isPro = status === "active";
    await user.save();
    
    console.log(`✅ User ${user.email} updated with subscription info`);
    console.log("====== END SUBSCRIPTION CREATED ======\n");
    
  } catch (err) {
    console.error("❌ Error in handleSubscriptionCreated:", err);
  }
}

async function handleSubscriptionUpdated(data) {
  try {
    console.log("\n📝 ====== HANDLING SUBSCRIPTION UPDATED ======");
    const subscriptionId = data.id;
    const attributes = data.attributes;
    const status = attributes.status;
    const renewsAt = attributes.renews_at;
    
    console.log("Update Details:", { subscriptionId, status, renewsAt });
    
    // Find subscription
    const subscription = await Subscription.findOne({ 
      lemonSubscriptionId: subscriptionId 
    });
    
    if (!subscription) {
      console.log(`❌ Subscription not found: ${subscriptionId}`);
      return;
    }
    
    console.log(`Found subscription for user: ${subscription.userId}`);
    
    // Update subscription
    subscription.status = status;
    subscription.renewsAt = renewsAt ? new Date(renewsAt) : null;
    await subscription.save();
    
    // Update user
    const user = await User.findById(subscription.userId);
    if (user) {
      user.subscriptionStatus = status;
      user.subscriptionRenewsAt = renewsAt ? new Date(renewsAt) : null;
      user.isPro = status === "active";
      await user.save();
      console.log(`✅ User ${user.email} updated to status: ${status}`);
    }
    
    console.log("====== END SUBSCRIPTION UPDATED ======\n");
  } catch (err) {
    console.error("❌ Error in handleSubscriptionUpdated:", err);
  }
}

async function handleSubscriptionCancelled(data) {
  try {
    console.log("\n❌ ====== HANDLING SUBSCRIPTION CANCELLED ======");
    const subscriptionId = data.id;
    
    console.log(`Cancelling subscription: ${subscriptionId}`);
    
    // Find and update subscription
    const subscription = await Subscription.findOneAndUpdate(
      { lemonSubscriptionId: subscriptionId },
      {
        status: "cancelled",
        cancelled: true,
        cancelledAt: new Date(),
        endsAt: new Date(),
      },
      { new: true }
    );
    
    if (subscription) {
      console.log(`Found subscription for user: ${subscription.userId}`);
      
      // Update user
      const user = await User.findById(subscription.userId);
      if (user) {
        user.subscriptionStatus = "cancelled";
        user.isPro = false;
        await user.save();
        console.log(`✅ User ${user.email} subscription cancelled`);
      }
    }
    
    console.log("====== END SUBSCRIPTION CANCELLED ======\n");
  } catch (err) {
    console.error("❌ Error in handleSubscriptionCancelled:", err);
  }
}

async function handleSubscriptionExpired(data) {
  try {
    console.log("\n📅 ====== HANDLING SUBSCRIPTION EXPIRED ======");
    const subscriptionId = data.id;
    
    console.log(`Expiring subscription: ${subscriptionId}`);
    
    // Find and update subscription
    const subscription = await Subscription.findOneAndUpdate(
      { lemonSubscriptionId: subscriptionId },
      {
        status: "expired",
        endsAt: new Date(),
      },
      { new: true }
    );
    
    if (subscription) {
      console.log(`Found subscription for user: ${subscription.userId}`);
      
      // Update user
      const user = await User.findById(subscription.userId);
      if (user) {
        user.subscriptionStatus = "expired";
        user.isPro = false;
        await user.save();
        console.log(`✅ User ${user.email} subscription expired`);
      }
    }
    
    console.log("====== END SUBSCRIPTION EXPIRED ======\n");
  } catch (err) {
    console.error("❌ Error in handleSubscriptionExpired:", err);
  }
}

async function handlePaymentSuccess(data) {
  try {
    console.log("\n💳 ====== HANDLING PAYMENT SUCCESS ======");
    const subscriptionId = data.id;
    const attributes = data.attributes;
    
    console.log("Payment Success Details:", {
      subscriptionId,
      invoiceId: attributes.invoice_id,
      total: attributes.total,
      status: attributes.status,
      refunded: attributes.refunded,
      currency: attributes.currency,
    });
    
    // First, try to find subscription by Lemon ID
    let subscription = await Subscription.findOne({ 
      lemonSubscriptionId: subscriptionId 
    });
    
    if (!subscription) {
      console.log(`⚠️ Subscription not found by lemonSubscriptionId: ${subscriptionId}`);
      
      // Try to find by order ID from invoice
      if (attributes.order_id) {
        subscription = await Subscription.findOne({ 
          lemonOrderId: attributes.order_id.toString() 
        });
        console.log(`Found by order ID ${attributes.order_id}: ${subscription ? 'Yes' : 'No'}`);
      }
      
      if (!subscription) {
        console.log(`❌ No subscription found for payment success event`);
        return;
      }
    }
    
    console.log(`✅ Found subscription: ${subscription._id} for user: ${subscription.userId}`);
    console.log(`Subscription plan: ${subscription.plan}, Status: ${subscription.status}`);
    
    // Get credits based on plan
    const creditsToAdd = PLAN_CREDITS[subscription.plan] || 0;
    console.log(`Credits to add: ${creditsToAdd}`);
    
    // Update subscription
    subscription.creditsGranted += creditsToAdd;
    subscription.lastPaymentStatus = "success";
    subscription.lastPaymentAt = new Date();
    subscription.status = "active"; // Ensure status is active
    await subscription.save();
    
    console.log(`✅ Subscription updated with ${creditsToAdd} credits. Total granted: ${subscription.creditsGranted}`);
    
    // Update user credits
    const user = await User.findById(subscription.userId);
    if (user) {
      const oldCredits = user.credits;
      user.credits += creditsToAdd;
      user.lastPaymentStatus = "success";
      user.lastPaymentAt = new Date();
      user.isPro = true;
      user.subscriptionStatus = "active";
      user.plan = subscription.plan;
      
      // Track total spent
      if (subscription.price) {
        user.totalSpent = (user.totalSpent || 0) + subscription.price;
        user.totalPayments = (user.totalPayments || 0) + 1;
      }
      
      await user.save();
      
      console.log(`\n🎉 PAYMENT SUCCESS COMPLETE!`);
      console.log(`User: ${user.email}`);
      console.log(`Plan: ${subscription.plan}`);
      console.log(`Credits added: ${creditsToAdd}`);
      console.log(`Old credits: ${oldCredits}`);
      console.log(`New credits: ${user.credits}`);
      console.log(`Total spent: $${user.totalSpent || 0}`);
      console.log(`====================================\n`);
    } else {
      console.log(`❌ User not found: ${subscription.userId}`);
    }
    
    console.log("====== END PAYMENT SUCCESS ======\n");
  } catch (err) {
    console.error("❌ Error in handlePaymentSuccess:", err);
  }
}

async function handlePaymentFailed(data) {
  try {
    console.log("\n❌ ====== HANDLING PAYMENT FAILED ======");
    const subscriptionId = data.id;
    
    console.log(`Payment failed for subscription: ${subscriptionId}`);
    
    // Find subscription
    const subscription = await Subscription.findOne({ 
      lemonSubscriptionId: subscriptionId 
    });
    
    if (subscription) {
      console.log(`Found subscription for user: ${subscription.userId}`);
      
      subscription.lastPaymentStatus = "failed";
      subscription.status = "past_due";
      await subscription.save();
      
      // Update user
      const user = await User.findById(subscription.userId);
      if (user) {
        user.lastPaymentStatus = "failed";
        user.subscriptionStatus = "past_due";
        user.isPro = false;
        await user.save();
        console.log(`❌ Payment failed for user ${user.email}`);
      }
    }
    
    console.log("====== END PAYMENT FAILED ======\n");
  } catch (err) {
    console.error("❌ Error in handlePaymentFailed:", err);
  }
}

async function handlePaymentRecovered(data) {
  try {
    console.log("\n🔄 ====== HANDLING PAYMENT RECOVERED ======");
    const subscriptionId = data.id;
    
    console.log(`Payment recovered for subscription: ${subscriptionId}`);
    
    // Find subscription
    const subscription = await Subscription.findOne({ 
      lemonSubscriptionId: subscriptionId 
    });
    
    if (subscription) {
      console.log(`Found subscription for user: ${subscription.userId}`);
      
      subscription.lastPaymentStatus = "success";
      subscription.status = "active";
      await subscription.save();
      
      // Update user
      const user = await User.findById(subscription.userId);
      if (user) {
        user.lastPaymentStatus = "success";
        user.subscriptionStatus = "active";
        user.isPro = true;
        await user.save();
        console.log(`✅ Payment recovered for user ${user.email}`);
      }
    }
    
    console.log("====== END PAYMENT RECOVERED ======\n");
  } catch (err) {
    console.error("❌ Error in handlePaymentRecovered:", err);
  }
}

async function handleOrderCreated(data) {
  try {
    console.log("\n🛒 ====== HANDLING ORDER CREATED ======");
    const orderId = data.id;
    const attributes = data.attributes;
    const orderNumber = attributes.order_number;
    const customerId = attributes.customer_id;
    const email = attributes.user_email;
    const total = attributes.total_usd;
    const status = attributes.status;
    const refunded = attributes.refunded;
    
    console.log("Order Details:", {
      orderId,
      orderNumber,
      customerId,
      email,
      total,
      status,
      refunded,
    });
    
    // Find user by email
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log(`✅ Found user: ${user._id}`);
      
      // Update user with Lemon Customer ID if not already set
      if (!user.lemonCustomerId) {
        user.lemonCustomerId = customerId;
        await user.save();
        console.log(`Updated user with lemonCustomerId: ${customerId}`);
      }
      
      // Detect plan from order total
      let plan = "basic";
      if (total >= 99) plan = "premium";
      else if (total >= 29) plan = "basic";
      
      const credits = PLAN_CREDITS[plan] || 0;
      
      // Check if subscription already exists for this order
      let subscription = await Subscription.findOne({ lemonOrderId: orderId });
      
      if (!subscription) {
        // Create subscription record
        subscription = new Subscription({
          userId: user._id,
          lemonOrderId: orderId,
          lemonOrderNumber: orderNumber,
          lemonCustomerId: customerId,
          status: status === "paid" ? "active" : "pending",
          plan: plan,
          price: total,
          currency: "USD",
          creditsGranted: credits,
          creditsUsed: 0,
          lastPaymentStatus: status === "paid" ? "success" : "pending",
          lastPaymentAt: new Date(),
          startsAt: new Date(),
        });
        
        await subscription.save();
        console.log(`✅ Created new subscription: ${subscription._id}`);
        
        // If order is paid, add credits to user
        if (status === "paid") {
          user.credits += credits;
          user.plan = plan;
          user.isPro = true;
          user.subscriptionStatus = "active";
          user.lastPaymentStatus = "success";
          user.lastPaymentAt = new Date();
          user.totalSpent = (user.totalSpent || 0) + total;
          user.totalPayments = (user.totalPayments || 0) + 1;
          await user.save();
          console.log(`✅ Added ${credits} credits to user ${user.email}`);
        }
      } else {
        console.log(`ℹ️ Subscription already exists for order: ${orderId}`);
      }
    } else {
      console.log(`⚠️ User not found for order ${orderNumber}, email: ${email}`);
    }
    
    console.log("====== END ORDER CREATED ======\n");
  } catch (err) {
    console.error("❌ Error in handleOrderCreated:", err);
  }
}

export const createCheckout = async (req, res) => {
  try {
    const { plan } = req.body;
    const { uid, email } = req.user;
    
    // Get user
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Validate plan
    if (!["basic", "premium"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    
    // Create checkout URL
    const plans = {
      basic: { 
        price: 29, 
        credits: 1300, 
        variant: "246e6b0e-526d-4a6b-8584-25e3f2340301" 
      },
      premium: { 
        price: 99, 
        credits: 6500, 
        variant: "660a017c-a10a-4db4-b03d-04e2970382e5" 
      },
    };
    
    const planData = plans[plan];
    
    // Store checkout info in user
    user.checkoutSessionId = `checkout_${Date.now()}`;
    user.checkoutPlan = plan;
    await user.save();
    
    const checkoutUrl =
      `https://loversai.lemonsqueezy.com/checkout/buy/${planData.variant}` +
      `?checkout[email]=${encodeURIComponent(email)}` +
      `&checkout[custom][user_id]=${user._id}` +
      `&checkout[custom][firebase_uid]=${uid}` +
      `&checkout[name]=${encodeURIComponent(user.fullName || email)}` +
      `&checkout[custom][checkout_session]=${user.checkoutSessionId}`;
    
    res.json({
      success: true,
      checkoutUrl,
      plan: plan,
      credits: planData.credits,
      price: planData.price,
      sessionId: user.checkoutSessionId,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};

// Helper function to get variant IDs
function getVariantId(plan) {
  const variantIds = {
    basic: "246e6b0e-526d-4a6b-8584-25e3f2340301",
    premium: "660a017c-a10a-4db4-b03d-04e2970382e5",
  };
  
  return variantIds[plan] || variantIds.basic;
}

// Helper function to sync user data after payment
export const syncUserPayment = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;
    
    // Find latest subscription
    const subscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ["active", "pending"] }
    }).sort({ createdAt: -1 });
    
    if (subscription && subscription.lastPaymentStatus === "success") {
      // Update user from subscription
      user.plan = subscription.plan;
      user.isPro = subscription.status === "active";
      user.subscriptionStatus = subscription.status;
      user.subscriptionRenewsAt = subscription.renewsAt;
      user.lastPaymentStatus = subscription.lastPaymentStatus;
      user.lastPaymentAt = subscription.lastPaymentAt;
      await user.save();
    }
    
    return user;
  } catch (err) {
    console.error("Error syncing user payment:", err);
    return null;
  }
};
// // controllers/lemonSqueezyController.js
// import crypto from "crypto";
// import User from "../models/User.js";
// import Subscription from "../models/Subscription.js";

// // PLAN → MONTHLY CREDITS
// const PLAN_CREDITS = {
//   basic: 1300,
//   premium: 6500,
//   free: 100
// };

// // Plan prices
// const PLAN_PRICES = {
//   basic: 29,
//   premium: 99,
//   free: 0
// };

// export const lemonWebhook = async (req, res) => {
//   try {
//     const signature = req.headers["x-signature"];

//     // ✅ RAW BUFFER
//     const rawBody = req.body;

//     // Verify signature
//     const hash = crypto
//       .createHmac("sha256", process.env.LEMON_WEBHOOK_SECRET)
//       .update(rawBody)
//       .digest("hex");

//     if (hash !== signature) {
//       console.error("❌ Invalid webhook signature");
//       return res.status(401).json({ msg: "Invalid signature" });
//     }

//     // ✅ Parse AFTER verification
//     const body = JSON.parse(rawBody.toString());
//     const event = body.meta.event_name;
//     const data = body.data;
//     const attributes = data.attributes;
    
//     console.log(`🔔 Webhook received: ${event}`, {
//       subscriptionId: data.id,
//       customerEmail: attributes.user_email,
//       status: attributes.status,
//       orderNumber: attributes.order_number,
//     });

//     // Handle different events
//     switch (event) {
//       case "subscription_created":
//         await handleSubscriptionCreated(data);
//         break;
        
//       case "subscription_updated":
//         await handleSubscriptionUpdated(data);
//         break;
        
//       case "subscription_cancelled":
//         await handleSubscriptionCancelled(data);
//         break;
        
//       case "subscription_expired":
//         await handleSubscriptionExpired(data);
//         break;
        
//       case "subscription_payment_success":
//         await handlePaymentSuccess(data);
//         break;
        
//       case "subscription_payment_failed":
//         await handlePaymentFailed(data);
//         break;
        
//       case "subscription_payment_recovered":
//         await handlePaymentRecovered(data);
//         break;
        
//       case "order_created":
//         await handleOrderCreated(data);
//         break;
        
//       default:
//         console.log(`ℹ️ Unhandled event: ${event}`);
//     }

//     res.json({ received: true, event });
//   } catch (err) {
//     console.error("❌ Webhook error:", err);
//     res.status(500).json({ msg: "Webhook error" });
//   }
// };

// async function handleSubscriptionCreated(data) {
//   console.log("📝 Subscription created:", data.id);
  
//   const subscriptionId = data.id;
//   const attributes = data.attributes;
//   const customerId = attributes.customer_id;
//   const email = attributes.user_email;
//   const status = attributes.status;
//   const variantName = attributes.variant_name;
//   const renewsAt = attributes.renews_at;
  
//   // Detect plan from variant name
//   const variantNameLower = variantName.toLowerCase();
//   const plan = variantNameLower.includes("basic")
//     ? "basic"
//     : variantNameLower.includes("premium")
//     ? "premium"
//     : "basic"; // default
  
//   const credits = PLAN_CREDITS[plan] || 0;
//   const price = PLAN_PRICES[plan] || 0;
  
//   console.log(`Detected plan: ${plan} with ${credits} credits for ${email}`);
  
//   // Find user by email
//   let user = await User.findOne({ email: email.toLowerCase() });
  
//   if (!user) {
//     // Try to find by Lemon Customer ID
//     user = await User.findOne({ lemonCustomerId: customerId });
//   }
  
//   if (!user) {
//     console.log(`❌ User not found for subscription ${subscriptionId}, email: ${email}`);
    
//     // Create a new user if not found (for testing)
//     user = new User({
//       email: email,
//       lemonCustomerId: customerId,
//       profileCompleted: false,
//       plan: plan,
//       credits: credits,
//       isPro: status === "active",
//       subscriptionStatus: status,
//       subscriptionRenewsAt: renewsAt ? new Date(renewsAt) : null,
//       lastPaymentStatus: "success",
//       lastPaymentAt: new Date(),
//     });
    
//     // Generate a temporary firebaseUid
//     user.firebaseUid = `lemon_${customerId}`;
    
//     await user.save();
//     console.log(`✅ Created new user for ${email}`);
//   } else {
//     // Update existing user
//     user.lemonCustomerId = customerId;
//     user.plan = plan;
//     user.isPro = status === "active";
//     user.subscriptionStatus = status;
//     user.subscriptionRenewsAt = renewsAt ? new Date(renewsAt) : null;
//     user.credits = credits; // Set initial credits
//     user.lastPaymentStatus = "success";
//     user.lastPaymentAt = new Date();
    
//     await user.save();
//     console.log(`✅ Updated user ${email} with ${credits} credits`);
//   }
  
//   // Create or update subscription record
//   const subscription = await Subscription.findOneAndUpdate(
//     { lemonSubscriptionId: subscriptionId },
//     {
//       userId: user._id,
//       lemonSubscriptionId: subscriptionId,
//       lemonCustomerId: customerId,
//       status,
//       plan,
//       price,
//       creditsGranted: credits,
//       creditsUsed: 0,
//       renewsAt: renewsAt ? new Date(renewsAt) : null,
//       startsAt: new Date(),
//       lastPaymentStatus: "success",
//       lastPaymentAt: new Date(),
//     },
//     { upsert: true, new: true, setDefaultsOnInsert: true }
//   );
  
//   console.log(`✅ Subscription ${subscriptionId} created/updated for user ${user._id}`);
// }

// async function handleSubscriptionUpdated(data) {
//   console.log("📝 Subscription updated:", data.id);
  
//   const subscriptionId = data.id;
//   const attributes = data.attributes;
//   const status = attributes.status;
//   const renewsAt = attributes.renews_at;
  
//   // Find subscription
//   const subscription = await Subscription.findOne({ 
//     lemonSubscriptionId: subscriptionId 
//   });
  
//   if (!subscription) {
//     console.log(`❌ Subscription not found: ${subscriptionId}`);
//     return;
//   }
  
//   // Update subscription
//   subscription.status = status;
//   subscription.renewsAt = renewsAt ? new Date(renewsAt) : null;
//   await subscription.save();
  
//   // Update user
//   const user = await User.findById(subscription.userId);
//   if (user) {
//     user.subscriptionStatus = status;
//     user.subscriptionRenewsAt = renewsAt ? new Date(renewsAt) : null;
//     user.isPro = status === "active";
//     await user.save();
//   }
  
//   console.log(`✅ Subscription ${subscriptionId} updated to status: ${status}`);
// }

// async function handleSubscriptionCancelled(data) {
//   console.log("❌ Subscription cancelled:", data.id);
  
//   const subscriptionId = data.id;
  
//   // Find and update subscription
//   const subscription = await Subscription.findOneAndUpdate(
//     { lemonSubscriptionId: subscriptionId },
//     {
//       status: "cancelled",
//       cancelled: true,
//       cancelledAt: new Date(),
//       endsAt: new Date(),
//     },
//     { new: true }
//   );
  
//   if (subscription) {
//     // Update user
//     await User.findByIdAndUpdate(subscription.userId, {
//       subscriptionStatus: "cancelled",
//       isPro: false,
//     });
    
//     console.log(`✅ Subscription ${subscriptionId} cancelled`);
//   }
// }

// async function handleSubscriptionExpired(data) {
//   console.log("📅 Subscription expired:", data.id);
  
//   const subscriptionId = data.id;
  
//   // Find and update subscription
//   const subscription = await Subscription.findOneAndUpdate(
//     { lemonSubscriptionId: subscriptionId },
//     {
//       status: "expired",
//       endsAt: new Date(),
//     },
//     { new: true }
//   );
  
//   if (subscription) {
//     // Update user
//     await User.findByIdAndUpdate(subscription.userId, {
//       subscriptionStatus: "expired",
//       isPro: false,
//     });
    
//     console.log(`✅ Subscription ${subscriptionId} marked as expired`);
//   }
// }

// async function handlePaymentSuccess(data) {
//   console.log("💳 Payment success:", data.id);
  
//   const subscriptionId = data.id;
  
//   // Find subscription
//   const subscription = await Subscription.findOne({ 
//     lemonSubscriptionId: subscriptionId 
//   });
  
//   if (!subscription) {
//     console.log(`❌ Subscription not found: ${subscriptionId}`);
//     return;
//   }
  
//   // Get credits based on plan
//   const creditsToAdd = PLAN_CREDITS[subscription.plan] || 0;
  
//   // Update subscription
//   subscription.creditsGranted += creditsToAdd;
//   subscription.lastPaymentStatus = "success";
//   subscription.lastPaymentAt = new Date();
//   await subscription.save();
  
//   // Update user credits
//   const user = await User.findById(subscription.userId);
//   if (user) {
//     user.credits += creditsToAdd;
//     user.lastPaymentStatus = "success";
//     user.lastPaymentAt = new Date();
//     user.isPro = true;
//     user.subscriptionStatus = "active";
//     await user.save();
    
//     console.log(`✅ Added ${creditsToAdd} credits to user ${user.email}. Total: ${user.credits}`);
//   }
// }

// async function handlePaymentFailed(data) {
//   console.log("❌ Payment failed:", data.id);
  
//   const subscriptionId = data.id;
  
//   // Find subscription
//   const subscription = await Subscription.findOne({ 
//     lemonSubscriptionId: subscriptionId 
//   });
  
//   if (subscription) {
//     subscription.lastPaymentStatus = "failed";
//     await subscription.save();
    
//     // Update user
//     const user = await User.findById(subscription.userId);
//     if (user) {
//       user.lastPaymentStatus = "failed";
//       await user.save();
//     }
    
//     console.log(`❌ Payment failed for subscription ${subscriptionId}`);
//   }
// }

// async function handlePaymentRecovered(data) {
//   console.log("🔄 Payment recovered:", data.id);
  
//   const subscriptionId = data.id;
  
//   // Find subscription
//   const subscription = await Subscription.findOne({ 
//     lemonSubscriptionId: subscriptionId 
//   });
  
//   if (subscription) {
//     subscription.lastPaymentStatus = "success";
//     await subscription.save();
    
//     // Update user
//     const user = await User.findById(subscription.userId);
//     if (user) {
//       user.lastPaymentStatus = "success";
//       await user.save();
//     }
    
//     console.log(`✅ Payment recovered for subscription ${subscriptionId}`);
//   }
// }

// async function handleOrderCreated(data) {
//   console.log("🛒 Order created:", data.id);
  
//   const orderId = data.id;
//   const attributes = data.attributes;
//   const orderNumber = attributes.order_number;
//   const customerId = attributes.customer_id;
//   const email = attributes.user_email;
//   const total = attributes.total_usd;
//   const status = attributes.status;
  
//   console.log(`Order #${orderNumber} for ${email}, total: $${total}, status: ${status}`);
  
//   // Find user by email
//   let user = await User.findOne({ email: email.toLowerCase() });
  
//   if (user) {
//     // Update user with Lemon Customer ID if not already set
//     if (!user.lemonCustomerId) {
//       user.lemonCustomerId = customerId;
//       await user.save();
//     }
    
//     // Detect plan from order total or variant
//     let plan = "basic";
//     if (total >= 99) plan = "premium";
//     else if (total >= 29) plan = "basic";
//     else plan = "free";
    
//     // Create subscription record
//     await Subscription.findOneAndUpdate(
//       { lemonOrderId: orderId },
//       {
//         userId: user._id,
//         lemonOrderId: orderId,
//         lemonOrderNumber: orderNumber,
//         lemonCustomerId: customerId,
//         status: status === "paid" ? "active" : "pending",
//         plan: plan,
//         price: total,
//         currency: "USD",
//         creditsGranted: PLAN_CREDITS[plan] || 0,
//         creditsUsed: 0,
//         lastPaymentStatus: status === "paid" ? "success" : "pending",
//         lastPaymentAt: new Date(),
//         startsAt: new Date(),
//       },
//       { upsert: true, new: true }
//     );
    
//     console.log(`✅ Order ${orderNumber} recorded for user ${email}`);
//   } else {
//     console.log(`⚠️ User not found for order ${orderNumber}, email: ${email}`);
//   }
// }

// export const createCheckout = async (req, res) => {
//   try {
//     const { plan } = req.body;
//     const { uid, email } = req.user;
    
//     // Get user
//     const user = await User.findOne({ firebaseUid: uid });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
    
//     // Validate plan
//     if (!["basic", "premium"].includes(plan)) {
//       return res.status(400).json({ error: "Invalid plan" });
//     }
    
//     // Create checkout URL
//     const plans = {
//       basic: { 
//         price: 29, 
//         credits: 1300, 
//         variant: "246e6b0e-526d-4a6b-8584-25e3f2340301" 
//       },
//       premium: { 
//         price: 99, 
//         credits: 6500, 
//         variant: "660a017c-a10a-4db4-b03d-04e2970382e5" 
//       },
//     };
    
//     const planData = plans[plan];
//     const checkoutUrl =
//       `https://loversai.lemonsqueezy.com/checkout/buy/${planData.variant}` +
//       `?checkout[email]=${encodeURIComponent(email)}` +
//       `&checkout[custom][user_id]=${user._id}` +
//       `&checkout[custom][firebase_uid]=${uid}` +
//       `&checkout[name]=${encodeURIComponent(user.fullName || email)}`;
    
//     res.json({
//       success: true,
//       checkoutUrl,
//       plan: plan,
//       credits: planData.credits,
//       price: planData.price,
//     });
//   } catch (err) {
//     console.error("Checkout error:", err);
//     res.status(500).json({ error: "Failed to create checkout session" });
//   }
// };

// // Helper function to get variant IDs
// function getVariantId(plan) {
//   const variantIds = {
//     basic: "246e6b0e-526d-4a6b-8584-25e3f2340301",
//     premium: "660a017c-a10a-4db4-b03d-04e2970382e5",
//   };
  
//   return variantIds[plan] || variantIds.basic;
// }