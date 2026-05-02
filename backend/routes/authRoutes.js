// routes/authRoutes.js — Production-ready Auth (Register, Login, Google OAuth)
import express from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { generateToken, protect } from "../middleware/auth.js";

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
      credits: 30, // 🎁 Welcome credits
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

    console.log(`✅ New user registered: ${user.email} (${user.role}) — 30 welcome credits`);

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

    // Update login tracking
    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

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

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        error: "Google OAuth is not configured on the server",
      });
    }

    // Verify the Google token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error("Google token verification failed:", verifyErr);
      return res.status(401).json({
        success: false,
        error: "Invalid Google token",
      });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Could not retrieve email from Google account",
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
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
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
        credits: 30, // 🎁 Welcome credits
        lastLoginAt: new Date(),
        loginCount: 1,
      });

      console.log(`✅ New Google user: ${email} (${userRole}) — 30 welcome credits`);
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
        credits: 30,
        lastLoginAt: new Date(),
        loginCount: 1,
      });
    } else {
      if (!user.firebaseUid) user.firebaseUid = decoded.uid;
      if (!user.googleId && decoded.firebase?.sign_in_provider === "google.com") {
        user.googleId = decoded.uid;
      }
      if (!user.avatar && decoded.picture) user.avatar = decoded.picture;
      if (!user.fullName && decoded.name) user.fullName = decoded.name;
      if (!user.role) user.role = userRole;
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
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
