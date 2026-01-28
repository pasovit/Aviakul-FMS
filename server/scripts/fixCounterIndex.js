// // const mongoose = require("mongoose");
// // const Transaction = require("../models/Transaction");


// // (async () => {
// //   try {
// //     await mongoose.connect(process.env.MONGO_URI);

// //     const result = await Transaction.deleteMany({});
// //     console.log(`✅ Deleted ${result.deletedCount} transactions`);

// //     process.exit(0);
// //   } catch (err) {
// //     console.error("❌ Error deleting transactions:", err);
// //     process.exit(1);
// //   }
// // })();
// require("dotenv").config();

// const mongoose = require("mongoose");
// const Counter = require("../models/Counter");

// async function fixCounterIndex() {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);

//     console.log("Connected to DB");

//     const indexes = await Counter.collection.indexes();
//     console.log("Existing indexes:", indexes);

//     // Drop old wrong index if exists
//     const hasOldIndex = indexes.some(i => i.name === "name_1");

//     if (hasOldIndex) {
//       await Counter.collection.dropIndex("name_1");
//       console.log("✅ Old index name_1 dropped");
//     }

//     console.log("✅ Counter index fixed successfully");
//     process.exit();
//   } catch (err) {
//     console.error("❌ Error fixing index:", err);
//     process.exit(1);
//   }
// }

// fixCounterIndex();
