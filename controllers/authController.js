const User = require("../models/UserSchema");
const sendMail = require("../utils/mail");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const generateToken = require("../utils/generateToken");
const Imap = require("imap");
const { validationResult } = require("express-validator"); // Optional for validation, if using express-validator
const jwt = require("jsonwebtoken");
const Cryptr = require("cryptr");
const cryptr = new Cryptr("process.env.EMAIL_PASSWORD_ENCRYPT");

// exports.signup = catchAsync(async (req, res, next) => {
//   // console.log(req.body)

//   const { name, email, password, role } = req.body;

//   try {
//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     // Generate an 8-character random password
//     // const plainPassword = crypto.randomBytes(4).toString('hex');

//     // Create a new user
//     const newUser = new User({
//       name,
//       email,
//       // password:plainPassword,
//       password,
//       role,
//     });

//     // Save user to the database
//     await newUser.save();

//     //send mail to user
//     // const URL = process.env.USER_LOGIN_URL;
//     // console.log(URL)
//     const URL = req.get("origin");

//     const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">

//     <p style="color: #333; font-size: 16px;">Dear <strong>${name}</strong>,</p>
//     <p style="color: #333; font-size: 16px;">Following are the access details & access the talktoaishastri application</p>
//     <p style="color: #333; font-size: 16px;">URL: ${URL}</p>
//     <p style="color: #333; font-size: 16px;">Email: ${email}</p>
//     <p style="color: #333; font-size: 16px;">Password: ${password}</p>
//     <p style="color: #333; font-size: 16px;">Thank you for helping us keep your account secure.</p>
//     <p style="color: #333; font-size: 16px;">Best regards,</p>
//     <p style="color: #333; font-size: 16px;"><strong>Support Team</strong><br/><a href="#" style="color: #007bff; text-decoration: none;">talktoaishastri@gmail.com</a></p>
//   </div>`;

//     const mail = await sendMail(email, "Your access details", htmlContent);

//     res.status(201).json({
//       status: "success",
//       message: "User created successfully and Send access details to Mail",
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error creating user", error });
//   }
// });

// Signup Controller

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    // Check if a user already exists with the provided email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists." });
    }

    // Create a new user
    const newUser = await User.create({
      name,
      email,

      password,
    });

    // Return success response
    return res.status(201).json({
      message: "User created successfully.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error during user signup:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

// exports.login = async (req, res, next) => {
//   const { email, password } = req.body;

//   // 1) Check if email and password exist
//   if (!email || !password) {
//     return next(new AppError("Please provide email and password!", 400));
//   }

//   // 2) Check if user exists && password is correct
//   const user = await User.findOne({ email }).select("+password");

//   // console.log(password,user.password)

//   if (!user || !(await user.correctPassword(password, user.password))) {
//     return next(new AppError("Incorrect email and password!", 401));
//   }

//   generateToken(res, user._id);

//   res.status(200).json({
//     status: "success",
//     user,
//   });
// };

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    // Find the user by email
    const user = await User.findOne({ email }).select("+password"); // Include password explicitly
    if (!user) {
      return res.status(404).json({ message: "Invalid email or password." });
    }

    // Verify the password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET, // Replace with your secret key
      { expiresIn: "1h" } // Token validity
    );

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Set token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true, // Prevent client-side access to the cookie
      secure: true, // Use HTTPS in production
      sameSite: "None", // Protect against CSRF
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Return success response with user details
    return res.status(200).json({
      status: "success",
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailConfigurations: user?.emailConfigurations
          ? user?.emailConfigurations
          : null,
      },
    });
  } catch (error) {
    console.error("Error during user login:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

// exports.logout = (req, res) => {
//   // Clear the cookie by setting it to expire immediately
//   res.clearCookie("token", {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//   });

//   res.json({ status: "success", message: "Logout successful" });
// };/

exports.logout = (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    // Send success response
    return res
      .status(200)
      .json({ status: "success", message: "Logout successful." });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

exports.getme = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password from the response
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      status: "success",
      message: "User details retrieved successfully.",
      user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

exports.removeImap = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password from the response
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.emailConfigurations = null;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Imap removed successfully.",
      user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  console.log("forgot");
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with email address.", 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordRestToken();
  // console.log(resetToken);
  await user.save({ validateBeforeSave: false });

  // 3) Send it's to user email
  try {
    const frontendOrigin = req.get("origin");

    const resetURL = `${frontendOrigin}/reset-password/${resetToken}`;

    const htmlContent = `<p> your reset password url is ${resetURL}</p>`;

    const mail = await sendMail(req.body.email, "forgot password", htmlContent);

    // console.log("mail",mail);

    res.status(200).json({
      status: "success",
      message: "Token send to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email, try again later!",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // console.log(req.body);
  // console.log(req.params.token);
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  //user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //generateToken(res, user._id);

  const subject = "Your Account Password has been changed";
  const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
    
    <p style="color: #333; font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
    <p style="color: #333; font-size: 16px;">This email is to confirm that the password for your account was recently changed.</p>
    <p style="color: #333; font-size: 16px;">If you made this change, no further action is required.</p>
    <p style="color: #333; font-size: 16px;">If you did not change your password, please contact our administrator immediately at <a href="mailto:talktoaishastri@gmail.com" style="color: #007bff; text-decoration: none;">talktoaishastri@gmail.com Cube</a>.</p>
    <p style="color: #333; font-size: 16px;">Thank you for helping us keep your account secure.</p>
    <p style="color: #333; font-size: 16px;">Best regards,</p>
    <p style="color: #333; font-size: 16px;"><strong>Support Team</strong><br/><a href="#" style="color: #007bff; text-decoration: none;">talktoaishastri@gmail.com</a></p>
  </div>
`;

  const mail = await sendMail(user.email, subject, htmlContent);
  res.status(200).json({
    status: "success",
    data: "password reset successful",
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // console.log("user", req.user);

  // console.log(req.body);
  // 1) Get user from collections
  const user = await User.findById(req?.user?.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.verifyPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // If so, update password
  user.password = req.body.newPassword;

  // Generate JWT token
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET, // Replace with your secret key
    { expiresIn: "1h" } // Token validity
  );

  // Update last login time
  user.lastLoginAt = new Date();
  await user.save();

  const updatedUser = await user.save();
  // Set token in HTTP-only cookie
  res.cookie("token", token, {
    httpOnly: true, // Prevent client-side access to the cookie
    secure: true, // Use HTTPS in production
    sameSite: "None", // Protect against CSRF
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  console.log(updatedUser);

  res.status(200).json({
    status: "success",
    message: "Login successful.",
    user: updatedUser,
  });
});

exports.UpdateProfile = async (req, res) => {
  console.log("User");

  const { name, email } = req.body;

  console.log(name, email);

  try {
    // Find the user by ID from the protected route
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if the new email is already used by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Email is already in use by another user." });
      }
      user.email = email;
    }

    // Update the name if provided
    if (name) {
      user.name = name;
    }

    // Save updated user data to the database
    const updatedUser = await user.save();
    console.log(updatedUser);

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error updating profile",
      error,
    });
  }
};

// Helper function to detect default host from email
function getDefaultHost(email) {
  const domain = email.split("@")[1].toLowerCase();

  const hosts = {
    "gmail.com": "imap.gmail.com",
    "outlook.com": "outlook.office365.com",
    "hotmail.com": "outlook.office365.com",
    "yahoo.com": "imap.mail.yahoo.com",
    "zoho.com": "imap.zoho.com",
  };

  return hosts[domain] || `imap.secureserver.net`;
  // return "imap.zoho.in";
}

// Promise wrapper for IMAP connection
function connectIMAP(imap) {
  return new Promise((resolve, reject) => {
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) {
          reject(new Error("Failed to open inbox"));
          return;
        }
        resolve();
      });
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.connect();
  });
}

// Format error messages
function formatError(error) {
  const errorMessage = error.message.toLowerCase();
  console.log(errorMessage);

  if (
    errorMessage.includes("invalid credentials") ||
    errorMessage.includes("authentication failed")
  ) {
    return "Invalid email or password";
  }

  if (errorMessage.includes("connection refused")) {
    return "Connection refused. Check if IMAP is enabled for your account";
  }

  if (errorMessage.includes("security")) {
    return "Security settings preventing connection. For Gmail, use App Password if 2FA is enabled";
  }

  return "Failed to connect to email server. Please verify your settings";
}

const addMailSetupToUser = async (userId, newMailSetup) => {
  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Add new mail setup to the mailSetup array
    user.mailSetup.push(newMailSetup);
    user.isMailStatus = true;

    // Save the user to the database
    await user.save();

    console.log("Mail setup added successfully!");
  } catch (error) {
    console.error("Error adding mail setup:", error.message);
  }
};

exports.getIMAPStatus = async (req, res) => {
  const { email, password, host, port } = req.body;
  const userId = req.user.id;
  console.log(userId);

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  // Configure IMAP
  const imapConfig = {
    user: email,
    password: password,
    host: host || getDefaultHost(email), // Use provided host or detect from email
    port: port || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };

  const imap = new Imap(imapConfig);

  try {
    await connectIMAP(imap);

    // // save the host, email, password, port in mongodb
    // // Add new mail setup details
    // const newMailSetup = {
    //   email,
    //   password, // You should hash this if storing sensitive data
    //   host: host || getDefaultHost(email),
    //   port: port,
    // };

    // // console.log("newMailSetup", newMailSetup)
    // addMailSetupToUser(userId, newMailSetup);

    // Update the user's email configuration in one operation
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        emailConfigurations: {
          email,
          password: cryptr.encrypt(password), // Encrypt or hash the password if necessary
          host: host || getDefaultHost(email), // Fallback to default host
          port: port || 993, // Default to 993 if port is not provided
          lastSyncedAt: new Date(), // Set the current time
        },
        isMailStatus: true, // Update isMailStatus flag
      },
      { new: true, runValidators: true } // Return updated user and apply schema validations
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Hi ${email.split("@")[0]}, IMAP connection successful!`,
      user: updatedUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      error: formatError(error),
    });
  } finally {
    imap.end();
  }
};

// fyrgticdgpvjrfyy
