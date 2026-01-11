const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Connect to MongoDB and disable 2FA for superadmin
const disable2FA = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const result = await mongoose.connection.db
      .collection("users")
      .updateOne(
        { username: "superadmin" },
        { $set: { twoFactorEnabled: false, twoFactorSecret: null } }
      );

    console.log("2FA disabled for superadmin user");
    console.log(
      "Matched:",
      result.matchedCount,
      "Modified:",
      result.modifiedCount
    );

    await mongoose.connection.close();
    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

disable2FA();
