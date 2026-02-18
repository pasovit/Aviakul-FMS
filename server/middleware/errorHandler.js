const { logger } = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(
    `${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose CastError (Invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 404;
    message = `Resource not found`;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
