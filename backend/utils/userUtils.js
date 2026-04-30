// utils/userUtils.js
import User from "../models/User.js";

/**
 * Ensure user exists with welcome credits
 * @param {string} uid - Firebase UID
 * @param {string} email - User email
 * @param {string} name - User name (optional)
 * @returns {Object} User document
 */
export async function ensureUserExists(uid, email, name = "") {
  let user = await User.findOne({ firebaseUid: uid });

  if (!user) {
    user = await User.create({
      firebaseUid: uid,
      email: email,
      fullName: name || "",
      credits: 30, // 🎁 Assign 30 welcome credits to new users
    });
    console.log(`✅ New user created with 30 welcome credits: ${email}`);
  }

  return user;
}

/**
 * Update user profile from form data
 * @param {string} uid - Firebase UID
 * @param {Object} profileData - Profile data to update
 * @returns {Object} Updated user document
 */
export async function updateUserProfile(uid, profileData) {
  const {
    fullName,
    location,
    age,
    budget,
    position,
    interest,
    phone,
    company_name,
  } = profileData;

  const updateData = {
    profileCompleted: Boolean(
      fullName && location && age && budget && position && interest
    ),
  };

  if (fullName) updateData.fullName = fullName;
  if (location) updateData.location = location;
  if (age) updateData.age = age ? parseInt(age) : undefined;
  if (budget) updateData.budget = budget ? parseInt(budget) : undefined;
  if (position) updateData.position = position;
  if (interest) updateData.interest = interest;
  if (phone) updateData.phone = phone;
  if (company_name) updateData.company_name = company_name;

  const user = await User.findOneAndUpdate(
    { firebaseUid: uid },
    updateData,
    { new: true, upsert: true }
  );

  return user;
}

/**
 * Get sanitized user profile (exclude sensitive data)
 * @param {Object} user - User document
 * @returns {Object} Sanitized user object
 */
export function getSanitizedProfile(user) {
  return {
    id: user._id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    location: user.location,
    age: user.age,
    budget: user.budget,
    position: user.position,
    interest: user.interest,
    company_name: user.company_name,
    profileCompleted: user.profileCompleted,
    plan: user.plan,
    isPro: user.isPro,
    credits: user.credits,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionRenewsAt: user.subscriptionRenewsAt,
    lastPaymentStatus: user.lastPaymentStatus,
    lastPaymentAt: user.lastPaymentAt,
    lemonCustomerId: user.lemonCustomerId,
  };
}
