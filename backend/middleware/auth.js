// middleware/auth.js — JWT Authentication & RBAC Middleware
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Lazy load JWT_SECRET - will be available after dotenv.config() runs in server.js
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("⚠️ JWT_SECRET is not defined — using development fallback secret. Do NOT use this in production.");
      return 'dev_jwt_secret';
    }
    console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
    console.error("Please ensure .env file exists and contains JWT_SECRET=your_secret_key");
    process.exit(1);
  }
  return secret;
};

/**
 * Generate a signed JWT token for a user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    getJWTSecret(),
    { expiresIn: "7d" }
  );
}

/**
 * Middleware: Verify JWT token and attach user to request
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Not authorized — no token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expired — please login again",
        });
      }
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    // Find user in DB
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found — token invalid",
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: "Your account has been suspended",
        reason: user.blockedReason || "Contact support for more information",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

/**
 * Middleware: Role-based access control
 * Usage: authorize('admin', 'planner')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied — role '${req.user.role}' is not authorized for this resource`,
      });
    }

    next();
  };
};

/**
 * Middleware: Optional auth — doesn't fail if no token, but attaches user if present
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, getJWTSecret());
      const user = await User.findById(decoded.id).select("-password");
      if (user && !user.isBlocked) {
        req.user = user;
      }
    }
  } catch {
    // Silently continue — user is just not authenticated
  }
  next();
};

export default { generateToken, protect, authorize, optionalAuth };
