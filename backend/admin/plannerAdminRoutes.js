import express from "express";
import { protect } from "../middleware/auth.js";
import { verifyAdmin } from "./adminMiddleware.js";
import {
  getPlannerUsers,
  getPlannerUserDetails,
  grantPlannerSubscription,
  modifyPlannerSubscription,
  managePlannerCredits,
} from "./plannerAdminController.js";

const router = express.Router();

router.use(protect);
router.use(verifyAdmin);

router.get("/users", getPlannerUsers);
router.get("/users/:id", getPlannerUserDetails);
router.post("/users/:id/subscription", grantPlannerSubscription);
router.put("/users/:id/subscription", modifyPlannerSubscription);
router.post("/users/:id/credits", managePlannerCredits);

export default router;
