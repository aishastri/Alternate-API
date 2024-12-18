const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { restrictTo, protect } = require("../utils/authMiddleware");

// Login route
router.post("/login", authController.login);
router.post("/signup", authController.signup);

// Logout route
router.get("/logout", authController.logout);

//forgot password and reset password
router.post("/forgot", authController.forgotPassword);
router.post("/reset/:token", authController.resetPassword);

router.use(protect);
router.post("/test-imap-connection", authController.getIMAPStatus);
router.patch("/remove-imap-connection", authController.removeImap);
router.get("/getMe", authController.getme);
router.put("/updatePassword", authController.updatePassword);
router.put("/profile", authController.UpdateProfile);

router.use(restrictTo("admin"));
// router.post("/signup", authController.signup);
//router.get("/customers",authController.getAllUsers);
// router.patch('/UpdateActive/:id')
module.exports = router;
