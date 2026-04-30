// utils/lemonCheckout.js
export const openLemonCheckout = (plan, email, userId = null) => {
  console.log("🛒 Opening Lemon Checkout for:", { plan, email, userId });
  
  // Updated variant IDs with UUID format
  const variantIds = {
    basic: "246e6b0e-526d-4a6b-8584-25e3f2340301", // Basic Plan variant ID (UUID format)
    premium: "660a017c-a10a-4db4-b03d-04e2970382e5", // You'll need to get this too
  };

  const variantId = variantIds[plan];
  
  if (!variantId || variantId === "YOUR_PREMIUM_VARIANT_UUID") {
    console.error("❌ Invalid or missing variant ID for plan:", plan);
    
    if (plan === "premium") {
      alert("Premium plan checkout is not available yet. Please contact support.");
    } else {
      alert("Invalid plan selected");
    }
    return null;
  }

  if (!email || !email.includes('@')) {
    console.error("❌ Invalid email:", email);
    alert("Please provide a valid email address");
    return null;
  }

  // Build checkout URL
  const encodedEmail = encodeURIComponent(email);
  let checkoutUrl = `https://loversai.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodedEmail}`;
  
  // Add user_id if provided
  if (userId) {
    checkoutUrl += `&checkout[custom][user_id]=${encodeURIComponent(userId)}`;
  }
  
  console.log("🔗 Checkout URL:", checkoutUrl);
  
  // Open in new tab
  window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  
  return checkoutUrl;
};

// Function to get your premium variant ID
export const getPremiumVariantId = () => {
  // Instructions to get premium variant ID:
  console.log(`
    To get your Premium variant ID:
    1. Go to https://app.lemonsqueezy.com/products
    2. Click on your Premium Plan product
    3. Click "Edit" on the Premium variant
    4. Check the URL: it should contain the variant UUID
    5. Copy the UUID and update the variantIds object above
  `);
  
  return "Get this from your Lemon Squeezy dashboard";
};

// Test function to verify variant works
export const testCheckout = () => {
  const testEmail = "test@example.com";
  const testUrl = `https://loversai.lemonsqueezy.com/checkout/buy/246e6b0e-526d-4a6b-8584-25e3f2340301?checkout[email]=${encodeURIComponent(testEmail)}`;
  
  console.log("🧪 Testing checkout URL:", testUrl);
  window.open(testUrl, '_blank', 'noopener,noreferrer');
  
  return testUrl;
};

// Fallback function
export const openLemonSqueezyCheckout = openLemonCheckout;