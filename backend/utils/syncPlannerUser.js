import PlannerUser from "../models/PlannerUser.js";

const normalizeEmail = (email) => (typeof email === "string" ? email.toLowerCase().trim() : "");

export async function syncPlannerUserFromAuth(user, action = "signin") {
  if (!user || user.role !== "planner") {
    return null;
  }

  const email = normalizeEmail(user.email);
  if (!email) {
    return null;
  }

  const now = new Date();
  const isSignup = action === "signup";

  try {
    return await PlannerUser.findOneAndUpdate(
      {
        $or: [{ userId: user._id }, { email }],
      },
      {
        $set: {
          userId: user._id,
          email,
          fullName: user.fullName || "",
          companyName: user.company_name || "",
          authProvider: user.authProvider || "local",
          lastSeenAt: now,
          lastAuthAction: isSignup ? "signup" : "signin",
        },
        $setOnInsert: {
          role: "planner",
          firstSeenAt: now,
        },
        $inc: {
          authEventCount: 1,
          ...(isSignup ? { signupCount: 1 } : { signInCount: 1 }),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (err) {
    console.warn("Planner user sync failed:", err.message);
    return null;
  }
}
