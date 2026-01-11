const cron = require("node-cron");
const { logger } = require("../utils/logger");

// Import job functions (will be created in future phases)
// const { accrueInterestDaily } = require('./loanJobs');
// const { updateOverdueStatus } = require('./transactionJobs');
// const { sendInvoiceReminders } = require('./invoiceJobs');

const startCronJobs = () => {
  logger.info("Starting cron jobs...");

  // Run daily at midnight IST (00:00)
  cron.schedule(
    "0 0 * * *",
    async () => {
      logger.info("Running daily midnight jobs...");

      try {
        // These will be implemented in future phases
        // await accrueInterestDaily();
        // await updateOverdueStatus();
        // await sendInvoiceReminders();

        logger.info("Daily midnight jobs completed successfully");
      } catch (error) {
        logger.error(`Error running daily jobs: ${error.message}`);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  // Clean up expired sessions every hour
  cron.schedule("0 * * * *", async () => {
    logger.info("Cleaning up expired sessions...");

    try {
      const User = require("../models/User");
      const now = Date.now();

      // Remove expired sessions from all users
      await User.updateMany(
        { "activeSessions.expiresAt": { $lt: now } },
        { $pull: { activeSessions: { expiresAt: { $lt: now } } } }
      );

      logger.info("Expired sessions cleaned up successfully");
    } catch (error) {
      logger.error(`Error cleaning up sessions: ${error.message}`);
    }
  });

  logger.info("Cron jobs started successfully");
};

module.exports = { startCronJobs };
