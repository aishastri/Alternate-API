// const mongoose = require("mongoose");
// const crypto = require("crypto");
// const bcrypt = require("bcrypt");
// const { type } = require("os");
// const Cryptr = require("cryptr");
// const cryptr = new Cryptr(process.env.EMAIL_PASSWORD_ENCRYPT);

// const MailSetupSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//   },
//   password: {
//     type: String,
//     required: true,
//     select: false,
//   },
//   host: {
//     type: String,
//     required: true,
//   },
//   port: {
//     type: Number,
//     default: 993,
//   },
//   date: {
//     type: Date,
//     default: Date.now,
//   },
//   isPasswordHashed: {
//     type: Boolean,
//     default: false, // Added this field to prevent re-hashing
//   },
// });

// const UserSchema = new mongoose.Schema(
//   {
//     name: { type: String },
//     email: { type: String, unique: true },
//     password: {
//       type: String,
//       select: false,
//     },
//     role: {
//       type: String,
//       enum: ["user", "admin"],
//       default: "user",
//     },
//     mailSetup: {
//       type: [MailSetupSchema],
//       default: [],
//     },
//     isMailStatus: {
//       type: Boolean,
//       default: false,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     passwordResetToken: String,
//     passwordResetExpires: Date,
//   },
//   {
//     timestamps: true,
//   }
// );

// UserSchema.pre("save", async function (next) {
//   // Hash the user password if modified
//   if (this.isModified("password")) {
//     this.password = await bcrypt.hash(this.password, 12);
//   }

//   // Hash passwords in the mailSetup array if present
//   if (this.mailSetup && this.isModified("mailSetup")) {
//     for (let mail of this.mailSetup) {
//       if (mail.password && !mail.isPasswordHashed) {
//         mail.password = cryptr.encrypt(mail.password);
//         mail.isPasswordHashed = true; // Mark as hashed
//       }
//     }
//   }

//   next();
// });

// UserSchema.methods.correctPassword = async function (
//   candidatePassword,
//   userPassword
// ) {
//   return await bcrypt.compare(candidatePassword, userPassword);
// };

// UserSchema.methods.createPasswordRestToken = function () {
//   const resetToken = crypto.randomBytes(32).toString("hex");

//   this.passwordResetToken = crypto
//     .createHash("sha256")
//     .update(resetToken)
//     .digest("hex");

//   this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

//   return resetToken;
// };

// module.exports = mongoose.model("User", UserSchema);

const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.EMAIL_PASSWORD_ENCRYPT);

// Email Configuration Schema
const EmailConfigSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    host: {
      type: String,
      required: [true, "IMAP host is required"],
      trim: true,
    },
    port: {
      type: Number,
      //required: [true, "Port number is required"],
      //default: 993,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// User Schema
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    emailConfigurations: {
      type: EmailConfigSchema,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
UserSchema.pre("save", async function (next) {
  // Only hash password if it's modified or new
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  next();
});

// Password verification method
UserSchema.methods.verifyPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
