// routes/authRoutes.js — Production-ready Auth (Register, Login, Google OAuth)
import express from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { generateToken, protect } from "../middleware/auth.js";
import { WELCOME_CREDITS } from "../constants/credits.js";

const router = express.Router();

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_OAUTH_CLIENT_ID ||
  process.env.GOOGLE_WEB_CLIENT_ID ||
  "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

/* ================================================================
   POST /api/auth/register — Email/Password Registration
================================================================ */
router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, role, partnerName, companyName } = req.body;

    // ─── Validation ───
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const validRoles = ["couple", "planner", "vendor"];
    const userRole = validRoles.includes(role) ? role : "couple";

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists. Please login.",
      });
    }

    // ─── Create user ───
    const userData = {
      email: email.toLowerCase().trim(),
      password,
      fullName: fullName?.trim() || "",
      role: userRole,
      authProvider: "local",
      credits: WELCOME_CREDITS, // 🎁 Welcome credits
    };

    // Role-specific fields
    if (userRole === "couple" && partnerName) {
      userData.weddingProfile = { partnerName2: partnerName.trim() };
    }
    if ((userRole === "planner" || userRole === "vendor") && companyName) {
      userData.company_name = companyName.trim();
    }

    const user = await User.create(userData);
    const token = generateToken(user);

    console.log(`✅ New user registered: ${user.email} (${user.role}) — ${WELCOME_CREDITS} welcome credits`);

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Registration error:", err);

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(". "),
      });
    }

    res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
});

/* ================================================================
   POST /api/auth/login — Email/Password Login
================================================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Check if user signed up with Google (no password set)
    if (user.authProvider === "google" && !user.password) {
      return res.status(401).json({
        success: false,
        error: "This account uses Google Sign-In. Please continue with Google.",
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: "Your account has been suspended",
        reason: user.blockedReason,
      });
    }

    // Update login tracking in the background so response is not blocked by a write.
    User.updateOne(
      { _id: user._id },
      {
        $set: { lastLoginAt: new Date() },
        $inc: { loginCount: 1 },
      },
    ).catch((updateErr) => {
      console.warn("Login tracking update failed:", updateErr.message);
    });

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
});

/* ================================================================
   POST /api/auth/google — Google OAuth Login/Signup
================================================================ */
router.post("/google", async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: "Google credential is required",
      });
    }

    if (!GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
      return res.status(500).json({
        success: false,
        error: "Google OAuth is not configured on the server. Set GOOGLE_CLIENT_ID to your Google Web Client ID.",
      });
    }

    // Verify the Google token
    let payload;
    try {
      const verifyOptions = {
        idToken: credential,
      };

      if (GOOGLE_CLIENT_ID) {
        verifyOptions.audience = GOOGLE_CLIENT_ID;
      } else {
        console.warn(
          "GOOGLE_CLIENT_ID is not set. Google tokens are being verified without an audience check for local development.",
        );
      }

      const ticket = await googleClient.verifyIdToken(verifyOptions);
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error("Google token verification failed:", verifyErr);
      return res.status(401).json({
        success: false,
        error: "Invalid Google token",
      });
    }

    const { sub: googleId, email, email_verified: emailVerified, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Could not retrieve email from Google account",
      });
    }

    if (emailVerified === false) {
      return res.status(401).json({
        success: false,
        error: "Please verify your Google email address before signing in.",
      });
    }

    // Find existing user by googleId OR email
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    let isNewUser = false;

    if (user) {
      // Existing user — link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      User.updateOne(
        { _id: user._id },
        {
          $set: {
            ...(picture && !user.avatar ? { avatar: picture } : {}),
            ...(!user.googleId ? { googleId, authProvider: "google" } : {}),
            lastLoginAt: new Date(),
          },
          $inc: { loginCount: 1 },
        },
      ).catch((updateErr) => {
        console.warn("Google login tracking update failed:", updateErr.message);
      });
    } else {
      // New user via Google
      isNewUser = true;
      const validRoles = ["couple", "planner", "vendor"];
      const userRole = validRoles.includes(role) ? role : "couple";

      user = await User.create({
        email: email.toLowerCase(),
        fullName: name || "",
        googleId,
        authProvider: "google",
        avatar: picture,
        role: userRole,
        credits: WELCOME_CREDITS, // 🎁 Welcome credits
        lastLoginAt: new Date(),
        loginCount: 1,
      });

      console.log(`✅ New Google user: ${email} (${userRole}) — ${WELCOME_CREDITS} welcome credits`);
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: "Your account has been suspended",
        reason: user.blockedReason,
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      isNewUser,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({
      success: false,
      error: "Google authentication failed",
    });
  }
});

/* ================================================================
   GET /api/auth/me — Get current authenticated user
================================================================ */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ success: false, error: "Failed to get user" });
  }
});

/* ================================================================
   Legacy: POST /api/auth/firebase-login — backward compat
   Keeps existing Firebase users working during migration
================================================================ */
router.post("/firebase-login", async (req, res) => {
  try {
    // Try to import firebase admin — if it fails, return an error
    let admin;
    try {
      admin = (await import("../firebaseAdmin.js")).default;
    } catch {
      return res.status(501).json({
        success: false,
        error: "Firebase authentication is being deprecated. Please use /api/auth/login or /api/auth/google",
      });
    }

    const { role } = req.body || {};
    const fbToken = req.headers.authorization?.split(" ")[1] || req.body?.token;
    if (!fbToken) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    const decoded = await admin.auth().verifyIdToken(fbToken);
    const validRoles = ["couple", "planner", "vendor"];
    const userRole = validRoles.includes(role) ? role : "couple";

    // Find or create user with backwards compatibility
    let user = await User.findOne({
      $or: [{ firebaseUid: decoded.uid }, { email: decoded.email?.toLowerCase() }],
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email?.toLowerCase(),
        fullName: decoded.name || "",
        avatar: decoded.picture,
        authProvider: "google",
        role: userRole,
        credits: WELCOME_CREDITS,
        lastLoginAt: new Date(),
        loginCount: 1,
      });
    } else {
      User.updateOne(
        { _id: user._id },
        {
          $set: {
            ...(!user.firebaseUid ? { firebaseUid: decoded.uid } : {}),
            ...(!user.googleId && decoded.firebase?.sign_in_provider === "google.com"
              ? { googleId: decoded.uid }
              : {}),
            ...(!user.avatar && decoded.picture ? { avatar: decoded.picture } : {}),
            ...(!user.fullName && decoded.name ? { fullName: decoded.name } : {}),
            ...(!user.role ? { role: userRole } : {}),
            lastLoginAt: new Date(),
          },
          $inc: { loginCount: 1 },
        },
      ).catch((updateErr) => {
        console.warn("Firebase login tracking update failed:", updateErr.message);
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: "Your account has been suspended",
        reason: user.blockedReason,
      });
    }

    // Issue a proper JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      isNewUser,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Firebase login error:", err);
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

/* ─── Helper: Sanitize user object for API response ─── */
function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    authProvider: user.authProvider,
    profileCompleted: user.profileCompleted,
    weddingProfile: user.weddingProfile,
    plan: user.plan,
    isPro: user.isPro,
    credits: user.credits,
    subscriptionStatus: user.subscriptionStatus,
    isAdmin: user.isAdmin,
    location: user.location,
    company_name: user.company_name,
    position: user.position,
    interest: user.interest,
    age: user.age,
    budget: user.budget,
  };
}

export default router;
