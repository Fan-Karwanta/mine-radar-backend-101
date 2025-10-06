import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });
};

router.post("/register", async (req, res) => {
  try {
    console.log("=== REGISTER REQUEST ===");
    console.log("Request body:", req.body);
    
    const { email, password, completeName, agency, position, contactNumber } = req.body;

    // Validate required fields
    if (!email || !password || !completeName || !agency || !position || !contactNumber) {
      console.log("Missing required fields");
      return res.status(400).json({ message: "All fields are required" });
    }
    
    console.log("All required fields present");

    if (password.length < 6) {
      return res.status(400).json({ message: "Password should be at least 6 characters long" });
    }

    if (completeName.length < 2) {
      return res.status(400).json({ message: "Complete name should be at least 2 characters long" });
    }

    if (agency.length < 2) {
      return res.status(400).json({ message: "Agency/Company should be at least 2 characters long" });
    }

    if (position.length < 2) {
      return res.status(400).json({ message: "Position/Designation should be at least 2 characters long" });
    }

    // Validate contact number format (basic validation)
    const contactRegex = /^[\d\s\-\+\(\)]+$/;
    if (!contactRegex.test(contactNumber)) {
      return res.status(400).json({ message: "Please enter a valid contact number" });
    }

    // check if user already exists
    console.log("Checking for existing email...");
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log("Email already exists:", email);
      return res.status(400).json({ message: "Email already exists" });
    }
    console.log("Email is unique");

    // Leave profile image empty by default - user can upload later
    const profileImage = "";

    console.log("Creating new user...");
    const user = new User({
      email,
      password,
      completeName,
      agency,
      position,
      contactNumber,
      profileImage,
    });

    console.log("Saving user to database...");
    await user.save();
    console.log("User saved successfully:", user._id);

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        completeName: user.completeName,
        agency: user.agency,
        position: user.position,
        contactNumber: user.contactNumber,
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("=== ERROR IN REGISTER ROUTE ===");
    console.log("Error:", error);
    console.log("Error message:", error.message);
    console.log("Error name:", error.name);
    console.log("Error stack:", error.stack);
    
    // Check for specific error types
    if (error.name === 'ValidationError') {
      console.log("Validation error details:", error.errors);
      return res.status(400).json({ 
        message: "Validation error", 
        details: error.message 
      });
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      console.log("Duplicate key error:", error.keyPattern);
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'email' 
        ? "Email already exists" 
        : `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
      return res.status(400).json({ message });
    }
    
    res.status(500).json({ 
      message: "Internal server error",
      details: error.message
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "All fields are required" });

    // check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ 
        message: "Your account has been blocked by the administrator. Please contact MGB CALABARZON for support.",
        blocked: true 
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        completeName: user.completeName,
        agency: user.agency,
        position: user.position,
        contactNumber: user.contactNumber,
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
router.put("/update-profile", protectRoute, async (req, res) => {
  try {
    const { profileImage, completeName, agency, position, contactNumber } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (completeName !== undefined) updateData.completeName = completeName;
    if (agency !== undefined) updateData.agency = agency;
    if (position !== undefined) updateData.position = position;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        completeName: user.completeName,
        agency: user.agency,
        position: user.position,
        contactNumber: user.contactNumber,
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Error in update profile route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
