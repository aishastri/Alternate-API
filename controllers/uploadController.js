const Upload = require("../models/uploadSchema.js");
const User = require("../models/UserSchema.js");
const { json } = require("stream/consumers");
const AppError = require("../utils/appError.js");
const FormData = require("form-data");
const fs = require("fs");
const { resolve } = require("path");
const { response } = require("express");
const Imap = require("imap");
const path = require("path");
const { simpleParser } = require("mailparser");
const { promisify } = require("util");
const writeFileAsync = promisify(fs.writeFile);
const catchAsync = require("../utils/catchAsync.js");
const uploadDocument = require("../utils/uploadDocument.js");

exports.createDocument = catchAsync(async (req, res, next) => {
  const { input } = req.body;
  console.log(req.user);

  const response = await uploadDocument(req.file, input, req.user.id);

  if (!response) {
    return next(new AppError("failed to upload document", 500));
  }

  res.status(201).json({
    status: "success",
    message: "document uploaded successfully",
    response,
  });
});

exports.getHistory = async (req, res, next) => {
  try {
    const history = await Upload.find({ user: req.user.id });
    // .sort({ createdAt: -1 });
    res.status(200).json({ status: "success", data: history });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.getSingleHistory = async (req, res, next) => {
  try {
    const id = req.params.id;

    const singleHistory = await Upload.findById(id);

    if (!singleHistory) {
      return res
        .status(404)
        .json({ status: "error", message: "Data not found" });
    }

    res.status(200).json({ status: "success", data: singleHistory });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.getHistoryCount = async (req, res, next) => {
  try {
    const history_email = await Upload.countDocuments({
      user: req.user.id,
      input: "Email",
    });
    const history_file = await Upload.countDocuments({
      user: req.user.id,
      input: "Upload",
    });
    const history = await Upload.countDocuments({
      user: req.user.id,
    });
    res.status(200).json({
      status: "success",
      data: { history_email, history_file, history },
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

// // check the email setup
// const uploadDir = path.join(__dirname, "..", "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
//   console.log(`Created uploads directory at: ${uploadDir}`);
// }

// function getSafeFilename(filename, seqno) {
//   const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
//   return `${seqno}-${sanitized}`;
// }

// async function processAttachment(attachment, seqno) {
//   try {
//     const filename = getSafeFilename(attachment.filename, seqno);
//     const filepath = path.join(uploadDir, filename);

//     console.log(`Processing attachment: ${attachment.filename}`);
//     console.log(`Size: ${attachment.size} bytes`);

//     if (attachment.content) {
//       await writeFileAsync(filepath, attachment.content);
//       console.log(`✓ Saved attachment to: ${filepath}`);

//       return {
//         originalFilename: attachment.filename,
//         savedFilename: filename,
//         path: filepath,
//         size: attachment.size,
//         contentType: attachment.contentType,
//       };
//     }
//     return null;
//   } catch (error) {
//     console.error(`Error saving attachment ${attachment.filename}:`, error);
//     return null;
//   }
// }
