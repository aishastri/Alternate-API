const jwt = require("jsonwebtoken");
const User = require("../models/UserSchema");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
require("dotenv").config();

// exports.protect = async (req, res, next) => {
//   const { token } = req.cookies;

//   if (!token) {
//     res.status(400).json({
//       status: "fail",
//       message: "token verification failed",
//     });
//   } else {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     // console.log("JWT data", decoded)
//     const user = await User.findById(decoded.userId);
//     console.log(user);
//     if (!user) {
//       res.status(400).json({
//         status: "fail",
//         message: "user was not found",
//       });
//     }
//     req.user = user;
//     next();
//   }
// };

exports.protect = catchAsync(async (req, res, next) => {
  const token = req.cookies.token; // Retrieve token from cookies

  if (!token) {
    return next(new AppError("token not found", 404));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError("user not found", 404));
  }
  req.user = user; // Attach user data to the request
  next();
});

// exports.isAdmin = (req, res, next) => {
//   if (req.user && req.user.role === "admin") {
//     return next();
//   } else {
//     return res.status(403).json({ message: "Access denied. Admins only." });
//   }
// };

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin','lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};
