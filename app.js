require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/appError.js");
const globalErrorHandler = require("./controllers/errorController.js");
const { syncAllUsersEmails } = require("./utils/emailSync.js");

const app = express();

app.use(cookieParser());
app.use(express.json({ extends: true }));
app.use(express.urlencoded({ extended: true }));

// app.use(cors({
//     origin: ["http://localhost:3000","http://localhost:3001"],
//     methods: ["GET", "POST", "PUT","PATCH", "DELETE"],
//     credentials: true,  // Allow cookies to be sent
// }));

// Setup CORS
const allowedOrigins = [
  "http://localhost:3001",
  "https://apsense-frontend.vercel.app",
  "https://apsense.vercel.app",
  "https://focussoftnet.vercel.app",
  // Add more origins as needed
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // This allows the server to accept cookies
};

// Apply CORS for all routes except specific ones
app.use((req, res, next) => {
  const exemptedRoutes = ["/fetch-new-attachments"];
  const isExempted = exemptedRoutes.some((route) => req.path.startsWith(route));

  if (isExempted) {
    return next(); // Skip CORS for these routes
  }

  cors(corsOptions)(req, res, next); // Apply CORS for other routes
});

// Custom CORS headers for exempted routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // Respond OK to preflight with no content
  }

  next();
});

app.get("/", (req, res) => {
  res.send("API running 😊");
});

app.get("/fetch-new-attachments", syncAllUsersEmails);

// API Routes
app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/customers", require("./routes/customersRoutes.js"));
app.use("/api/v1/upload", require("./routes/uploadRoutes.js"));

// Handle all undefined routes
app.all("*", (req, res, next) => {
  return next(new AppError("Route not defined", 404));
  // return next(400,"Route not defind")
});

// Global error handler
app.use(globalErrorHandler);

module.exports = app;
