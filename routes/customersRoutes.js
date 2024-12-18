const express = require("express");
const router = express.Router();
const { restrictTo, protect } = require("../utils/authMiddleware");
const customersController = require("../controllers/customersController");

router.post("/resetPassword", customersController.resetPassword);

router.use(protect);
router.use(restrictTo("admin"));
//router.post("/signup", customersController.signup);
router.get("/getAllCustomers", customersController.getAllUsers);
router.post("/createCustomer", customersController.createCustomer)

router.get("/:id", customersController.getCustomer);
router.patch("/:id", customersController.updateUser);

router.patch("/updateStatus/:id", customersController.UpdateActive);

module.exports = router;
