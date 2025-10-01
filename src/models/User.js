import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    completeName: {
      type: String,
      required: true,
    },
    agency: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ['Public User', 'Deputized Personnel', 'admin'],
      default: 'Public User',
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'pending'],
      default: 'active',
    },
    isApproved: {
      type: Boolean,
      default: function() {
        return this.role !== 'admin';
      },
    },
  },
  { timestamps: true }
);

// hash password before saving user to db
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// compare password func
userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
