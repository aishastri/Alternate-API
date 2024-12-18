const mongoose = require("mongoose");

const UploadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // This tells Mongoose to use the User model for this reference
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    input: {
      type: String,
    },
    processingTime: {
      type: String,
      required: true,
    },
    unfinishedContent: {
      type: String,
    },
    document: {
      type: String,
      required: true,
    },
    csv: {
      type: String,
      required: true,
    },
    json: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Upload", UploadSchema);
