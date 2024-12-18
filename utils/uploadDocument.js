const catchAsync = require("./catchAsync");
const cloudinary = require("../config/cloudinaryConfig.js");
const XLSX = require("xlsx");
const FormData = require("form-data");
const fs = require("fs");
const axios = require("axios");
const Upload = require("../models/uploadSchema.js");

const uploadDocument = async (file, input, id) => {
  let jsonResult, documentResult, excelResult;

  try {
    if (!file) {
      throw new Error("File is missing.");
    }

    const { buffer, originalname, size, mimetype } = file;

    // Prepare the data to send to the external API
    const formData = new FormData();
    formData.append("file", buffer, {
      filename: originalname, // Use `originalname` as the filename
      contentType: mimetype, // Use `mimetype` for contentType
    });

    // Get headers for FormData
    const headers = {
      ...formData.getHeaders(), // Axios requires explicit headers for FormData
    };

    // console.log("Headers prepared for API call:", headers);

    // Make the POST API call to the external URL
    const apiResponse = await axios.post(
      "https://aishastri.pythonanywhere.com/process-document",
      formData,
      { headers } // Pass headers explicitly
    );

    // Log the API response for debugging
    // console.log("API Response:", apiResponse.data);

    const jsonData = apiResponse.data.json;

    // Convert JSON data to a string
    const jsonString = JSON.stringify(jsonData);

    // Create a file from the JSON string (e.g., as a Blob or temporary file)
    const jsonBuffer = Buffer.from(jsonString, "utf-8");

    const uniquePublicId = `${originalname}-${Date.now()}`;

    // Use Cloudinary's uploader to upload the buffer (which is now the JSON content)
    jsonResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw", // Use 'raw' as we're uploading raw data
          folder: "json", // Optional: Specify a folder for organization
          public_id: uniquePublicId, // Optional: Specify a custom public ID
          format: "json", // Specify the format as 'json'
        },
        (error, result) => {
          if (error) reject(error);
          resolve(result);
        }
      );
      stream.end(jsonBuffer);
    });
    console.log("Successfully uploaded JSON to Cloudinary:");

    // Upload the original document to Cloudinary
    documentResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "documents" },
        (error, result) => {
          if (error) reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });

    // console.log(documentResult)
    console.log("Successfully uploaded doument to Cloudinary:");

    const workbook = XLSX.utils.book_new();

    function objectToRows(obj) {
      if (!obj || typeof obj !== "object") return []; // Handle invalid inputs gracefully
      return Object.entries(obj).flatMap(([key, value]) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return objectToRows(value); // Recursive call for nested objects
        }
        return { Key: key, Value: value };
      });
    }

    function processDataToSheet(data, sheetName) {
      let rows = Array.isArray(data)
        ? data.flatMap((item, index) =>
            objectToRows(item).map((row) => ({ ...row, Index: index + 1 }))
          )
        : objectToRows(data);

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    processDataToSheet(jsonData, "Sheet1");
    const filePath = `output-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, filePath);

    // Upload the Excel file to Cloudinary
    excelResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "raw",
      folder: "excel-files",
      public_id: `excel-${Date.now()}`,
      format: "xlsx",
    });

    console.log("Successfully uploaded xlsx to Cloudinary:");

    fs.unlinkSync(filePath); // Clean up local Excel
    //  console.log("excelResult", excelResult)

    function formatFileSize(bytes) {
      if (bytes < 1024) {
        return `${bytes} B`; // No decimals for bytes
      } else if (bytes < 1024 * 1024) {
        return `${Math.round(bytes / 1024)} KB`; // Rounded to nearest whole number
      } else {
        return `${Math.round(bytes / (1024 * 1024))} MB`; // Rounded to nearest whole number
      }
    }

    // Save the data to MongoDB
    const savedFile = new Upload({
      user: id,
      fileName: originalname,
      format: documentResult.format,
      size: formatFileSize(size),
      input: input,
      processingTime: apiResponse.data.processing_time,
      document: documentResult.secure_url, // URL of the uploaded document
      csv: excelResult.secure_url,
      json: jsonResult.secure_url, // URL of the JSON file
    });

    const data = await savedFile.save(); // Await the save operation

    return data;
  } catch (error) {
    console.error("Error in uploading document:", error, error.message);
    throw error; // Re-throw the error for upstream handling
  }
};

module.exports = uploadDocument;
