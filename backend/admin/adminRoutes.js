import express from "express";
import { protect } from "../middleware/auth.js";
import { verifyAdmin } from "./adminMiddleware.js";
import {
  getAdminProfile,
  getUserList,
  getUserById,
  updateUserById,
  getAdminStats,
  deleteUser,
  blockUser,
  unblockUser,
  adjustCredits,
  verifyVendor,
  rejectVendor,
} from "./adminController.js";

const router = express.Router();

router.use(protect);
router.use(verifyAdmin);

router.get("/me", getAdminProfile);
router.get("/stats", getAdminStats);
router.get("/users", getUserList);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUserById);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/block", blockUser);
router.post("/users/:id/unblock", unblockUser);
router.post("/users/:id/credits", adjustCredits);
router.post("/vendors/:id/verify", verifyVendor);
router.post("/vendors/:id/reject", rejectVendor);

export default router;
