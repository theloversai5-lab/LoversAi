import User from "../models/User.js";

export const syncUser = async (req, res) => {
  const { uid, email, name, phone } = req.user;

  let user = await User.findOne({ firebaseUid: uid });

  if (!user) {
    user = await User.create({
      firebaseUid: uid,
      email,
      fullName: name,
      phone,
      credits: 30, // 🎁 Assign 30 welcome credits to new users
    });
    console.log(`✅ New user created with 30 welcome credits: ${email}`);
  }

  res.json({ user });
};
