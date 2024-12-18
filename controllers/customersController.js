const User = require("../models/UserSchema");
const sendMail = require("../utils/mail");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const mongoose = require("mongoose");

exports.signup = catchAsync(async (req, res, next) => {
  console.log(req.body);

  const { name, email } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate an 8-character random password
    const plainPassword = crypto.randomBytes(4).toString("hex");

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: plainPassword,
    });

    // Save user to the database
    await newUser.save();

    //send mail to user
    const URL = process.env.USER_LOGIN_URL;
    console.log(URL);

    const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
    
    <p style="color: #333; font-size: 16px;">Dear <strong>${name}</strong>,</p>
    <p style="color: #333; font-size: 16px;">Following are the access details & access the LED Cube application</p>
    <p style="color: #333; font-size: 16px;">URL: ${URL}</p>
    <p style="color: #333; font-size: 16px;">Email: ${email}</p>
    <p style="color: #333; font-size: 16px;">Password: ${plainPassword}</p>
    <p style="color: #333; font-size: 16px;">Thank you for helping us keep your account secure.</p>
    <p style="color: #333; font-size: 16px;">Best regards,</p>
    <p style="color: #333; font-size: 16px;"><strong>Support Team</strong><br/><a href="#" style="color: #007bff; text-decoration: none;">LED Cube</a></p>
  </div>`;

    const mail = await sendMail(email, "Your access details", htmlContent);

    res.status(201).json({
      status: "success",
      message: "User created successfully and Send access details to Mail",
    });
  } catch (error) {
    return next(new AppError("Error creating user", 500));
  }
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ role: "user" });
  if (!users) {
    return next(new AppError("users not found", 404));
  }
  res.status(200).json({ status: "success", data: users });
});

exports.createCustomer = catchAsync(async (req, res, next) => {
  console.log(req.body);

  const { name, email } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate an 8-character random password
    const plainPassword = crypto.randomBytes(4).toString("hex");

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: plainPassword,
    });

    // Save user to the database
    await newUser.save();

    //send mail to user
    const URL = process.env.USER_LOGIN_URL;
    console.log(URL);

    const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
    
    <p style="color: #333; font-size: 16px;">Dear <strong>${name}</strong>,</p>
    <p style="color: #333; font-size: 16px;">Following are the access details & access the LED Cube application</p>
    <p style="color: #333; font-size: 16px;">URL: ${URL}</p>
    <p style="color: #333; font-size: 16px;">Email: ${email}</p>
    <p style="color: #333; font-size: 16px;">Password: ${plainPassword}</p>
    <p style="color: #333; font-size: 16px;">Thank you for helping us keep your account secure.</p>
    <p style="color: #333; font-size: 16px;">Best regards,</p>
    <p style="color: #333; font-size: 16px;"><strong>Support Team</strong><br/><a href="#" style="color: #007bff; text-decoration: none;">LED Cube</a></p>
  </div>`;

    const mail = await sendMail(email, "Your access details", htmlContent);

    res.status(201).json({
      status: "success",
      message: "User created successfully and Send access details to Mail",
    });
  } catch (error) {
    console.log(error.message);
    return next(new AppError("Error creating user", 500));
  }
});

exports.getCustomer = async (req, res) => {
  const id = req.params.id;
  // console.log(id)

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid ID format" });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ status: "error", message: "User not found" });
  }

  res.status(200).json({ status: "success", data: user });
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params; // Get the user ID from the URL params
    const { name, email } = req.body; // Extract name and email from the request body
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid ID format", 400));
    }

    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true, runValidators: true } // Return the updated document and validate inputs
    );

    if (!updatedUser) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({ status: "success", data: updatedUser });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.UpdateActive = catchAsync(async (req, res) => {
  // Extract userId from request parameters
  const userId = req.params.id;
  // console.log(userId)

  // Extract isActive value from request body
  const { isActive } = req.body;
  //console.log(isActive);

  // Validate isActive value (if necessary)
  if (typeof isActive !== "boolean") {
    return next(new AppError("isActive must be a boolean value", 400));
  }

  // Find the user by userId
  const user = await User.findById(userId);

  // Check if user exists
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Update isActive field of the user
  user.isActive = isActive;

  console.log(user.isActive);

  // Save the updated user object
  // const data = await user.save();
  await user.save();

  console.log(user);

  // Return success response
  res.status(200).json({ status: "success", data: user });
});

exports.resetPassword = async (req, res) => {
  try {
    // Extract userId from request parameters
    //const userId = req.params.id;
    //console.log(userId);

    const { email } = req.body;

    const user = await User.findOne({ email: email });
    // Check if user exists
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    // Generate an 8-character random password
    const plainPassword = crypto.randomBytes(4).toString("hex");

    console.log(plainPassword);

    user.password = plainPassword;

    // Save user to the database
    const data = await user.save();
    // console.log(data)

    //send mail to user
    const URL = process.env.USER_LOGIN_URL;
    // console.log(URL)

    const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
    
    <p style="color: #333; font-size: 16px;">Dear <strong>${data.name}</strong>,</p>
    <p style="color: #333; font-size: 16px;">Following are the access details & access the LED Cube application</p>
    <p style="color: #333; font-size: 16px;">URL: ${URL}</p>
    <p style="color: #333; font-size: 16px;">Email: ${data.email}</p>
    <p style="color: #333; font-size: 16px;">Password: ${plainPassword}</p>
    <p style="color: #333; font-size: 16px;">Thank you for helping us keep your account secure.</p>
    <p style="color: #333; font-size: 16px;">Best regards,</p>
    <p style="color: #333; font-size: 16px;"><strong>Support Team</strong><br/><a href="#" style="color: #007bff; text-decoration: none;">LED Cube</a></p>
  </div>`;

    const mail = await sendMail(data.email, "Your access details", htmlContent);
    console.log(mail);

    //console.log(mail.messageId);

    res
      .status(201)
      .json({ status: "success", message: " Send access details to Mail" });
  } catch (error) {
    console.log(error);
    return next(new AppError(error.message, 500));
  }
};
