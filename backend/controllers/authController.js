import User from "../models/User.js";
import { WELCOME_CREDITS } from "../constants/credits.js";

export const syncUser = async (req, res) => {
  const { uid, email, name, phone } = req.user;

  let user = await User.findOne({ firebaseUid: uid });

  if (!user) {
    user = await User.create({
      firebaseUid: uid,
      email,
      fullName: name,
      phone,
      credits: WELCOME_CREDITS, // 🎁 Assign welcome credits to new users
    });
    console.log(`✅ New user created with ${WELCOME_CREDITS} welcome credits: ${email}`);
  }

  res.json({ user });
};
