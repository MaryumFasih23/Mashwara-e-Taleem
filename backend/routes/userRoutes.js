import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Email regex for validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/create", async (req, res) => {
  try {
    const { uid, name, email } = req.body;

    // TC-01 Missing fields
    if (!uid || !name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // TC-02 Invalid email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // TC-09 Wrong data types
    if (typeof uid !== "string" || typeof name !== "string" || typeof email !== "string") {
      return res.status(400).json({ error: "Invalid data types" });
    }

    // Prevent HTML injection (TC-14)
    const cleanName = name.replace(/<[^>]*>?/gm, "");

    // TC-07 Duplicate users
    const exists = await User.findOne({ uid });
    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    // TC-06 Create new user
    const newUser = await User.create({
      uid,
      name: cleanName,
      email,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "User already exists" });
    }

    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET profile by Firebase UID
router.get("/profile/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

// PUT update profile by Firebase UID (upsert - creates if not exists)
router.put("/profile/:uid", async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { $set: req.body },
      { new: true, upsert: true, runValidators: false }
    );
    return res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;