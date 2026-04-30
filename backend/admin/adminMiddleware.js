import User from "../models/User.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ success: false, error: "Missing user token" });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

    if (user?.isAdmin || adminEmails.includes(req.user.email)) {
      req.adminUser = user;
      return next();
    }

    return res.status(403).json({ success: false, error: "Admin access required" });
  } catch (err) {
    console.error("Admin check error:", err);
    return res.status(500).json({ success: false, error: "Admin check failed" });
  }
};
