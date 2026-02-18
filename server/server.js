require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Routes
const authRoutes = require("./routes/authRoutes");
const entityRoutes = require("./routes/entityRoutes");
const auditRoutes = require("./routes/auditRoutes");
const bankAccountRoutes = require("./routes/bankAccountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// Utils
const { logger } = require("./utils/logger");
const { startCronJobs } = require("./jobs");
const errorHandler = require("./middleware/errorHandler");

const app = express();

/* ======================================================
   TRUST PROXY
====================================================== */
app.set("trust proxy", 1);

/* ======================================================
   CORS (VERY IMPORTANT – MUST BE FIRST)
====================================================== */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.APP_URL,
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Allow preflight
app.options("*", cors());

/* ======================================================
   HANDLE OPTIONS BEFORE RATE LIMIT
====================================================== */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ======================================================
   BODY PARSER
====================================================== */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ======================================================
   SECURITY
====================================================== */
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

/* ======================================================
   LOGGING
====================================================== */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ======================================================
   RATE LIMITING
====================================================== */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

/* ======================================================
   ROUTES
====================================================== */
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    time: new Date(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/bank-accounts", bankAccountRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);

app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/subcategories", require("./routes/subCategoryRoutes"));

/* ======================================================
   404 HANDLER
====================================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ======================================================
   ERROR HANDLER
====================================================== */
app.use(errorHandler);


/* ======================================================
   DATABASE CONNECTION
====================================================== */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  startCronJobs();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

/* ======================================================
   PROCESS SAFETY
====================================================== */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

module.exports = app;
