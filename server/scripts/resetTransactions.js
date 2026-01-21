// const mongoose = require("mongoose");
// const Transaction = require("../models/Transaction");
// require("dotenv").config();


// (async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);

//     const result = await Transaction.deleteMany({});
//     console.log(`✅ Deleted ${result.deletedCount} transactions`);

//     process.exit(0);
//   } catch (err) {
//     console.error("❌ Error deleting transactions:", err);
//     process.exit(1);
//   }
// })();
