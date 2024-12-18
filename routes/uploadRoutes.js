const express = require("express");
const router = express.Router();
const {
  createDocument,
  getHistory,
  getSingleHistory,
  getHistoryCount,
} = require("../controllers/uploadController");
const multer = require("multer");
const { isAdmin, protect } = require("../utils/authMiddleware");
// const { syncAllUsersEmails } = require("../utils/emailSync");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); // Store file in memory
// router.patch("/fetch-new-attachments", syncAllUsersEmails);

router.use(protect);

router.post("/", upload.single("file"), createDocument);
router.get("/", getHistory);
router.get("/processed-documents", getHistoryCount);
router.get("/:id", getSingleHistory);

module.exports = router;
