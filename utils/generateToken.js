const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateToken = (res, userId) => {
  // console.log("Node is ", process.env.NODE_ENV);

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'development',
    sameSite: "None",
    maxAge: 60 * 60 * 1000, // 1 day
    // path: "/", 
  });
};

module.exports = generateToken;
