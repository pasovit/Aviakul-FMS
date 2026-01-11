const BankAccount = require("../models/BankAccount");
const Transaction = require("../models/Transaction");
const Entity = require("../models/Entity");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { entity, startDate, endDate, businessOnly } = req.query;

    // Build entity filter based on role
    let entityFilter = {};

    if (req.user.role === "employee" || req.user.role === "observer") {
      if (req.user.assignedEntities && req.user.assignedEntities.length > 0) {
        entityFilter._id = { $in: req.user.assignedEntities };
      } else {
        return res.status(200).json({
          success: true,
          data: {
            accounts: [],
            balances: {},
            transactions: { income: 0, expense: 0, count: 0 },
            recentTransactions: [],
          },
        });
      }
    }

    // Apply entity filter if specified
    if (entity) {
      entityFilter._id = entity;
    }

    // Apply business/personal filter
    if (businessOnly === "true") {
      entityFilter.type = { $in: ["company", "llp", "partnership", "ngo"] };
    } else if (businessOnly === "false") {
      entityFilter.type = "individual";
    }

    // Get filtered entities
    const entities = await Entity.find(entityFilter);
    const entityIds = entities.map((e) => e._id);

    // Get bank accounts
    const accounts = await BankAccount.find({
      entity: { $in: entityIds },
      isActive: true,
    }).populate("entity", "name type");

    // Calculate total balances by currency
    const balances = {};
    accounts.forEach((acc) => {
      if (!balances[acc.currency]) {
        balances[acc.currency] = {
          total: 0,
          accounts: 0,
          positive: 0,
          negative: 0,
        };
      }
      balances[acc.currency].total += acc.currentBalance;
      balances[acc.currency].accounts += 1;
      if (acc.currentBalance >= 0) {
        balances[acc.currency].positive += acc.currentBalance;
      } else {
        balances[acc.currency].negative += acc.currentBalance;
      }
    });

    // Get transaction stats for date range
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const transactionMatch = {
      entity: { $in: entityIds },
      status: { $in: ["paid", "reconciled"] },
    };

    if (startDate || endDate) {
      transactionMatch.transactionDate = dateFilter;
    }

    const transactionStats = await Transaction.aggregate([
      { $match: transactionMatch },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const transactions = {
      income: 0,
      expense: 0,
      transfer: 0,
      count: 0,
    };

    transactionStats.forEach((stat) => {
      transactions[stat._id] = stat.totalAmount;
      transactions.count += stat.count;
    });

    // Calculate net (income - expense)
    transactions.net = transactions.income - transactions.expense;

    // Get recent transactions (last 10)
    const recentTransactions = await Transaction.find({
      entity: { $in: entityIds },
    })
      .populate("entity", "name type")
      .populate("bankAccount", "accountName accountNumber")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get pending transactions count
    const pendingCount = await Transaction.countDocuments({
      entity: { $in: entityIds },
      status: "pending",
    });

    res.status(200).json({
      success: true,
      data: {
        accounts,
        balances,
        transactions,
        recentTransactions,
        pendingCount,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category-wise breakdown
// @route   GET /api/dashboard/category-breakdown
// @access  Private
exports.getCategoryBreakdown = async (req, res, next) => {
  try {
    const { entity, type, startDate, endDate } = req.query;

    // Build entity filter
    let entityIds = [];

    if (req.user.role === "employee" || req.user.role === "observer") {
      entityIds = req.user.assignedEntities || [];
    } else if (entity) {
      entityIds = [entity];
    } else {
      const entities = await Entity.find({});
      entityIds = entities.map((e) => e._id);
    }

    if (entityIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Build match criteria
    const matchCriteria = {
      entity: { $in: entityIds },
      status: { $in: ["paid", "reconciled"] },
    };

    if (type) {
      matchCriteria.type = type;
    }

    if (startDate || endDate) {
      matchCriteria.transactionDate = {};
      if (startDate) matchCriteria.transactionDate.$gte = new Date(startDate);
      if (endDate) matchCriteria.transactionDate.$lte = new Date(endDate);
    }

    const breakdown = await Transaction.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            type: "$type",
            category: "$category",
          },
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $group: {
          _id: "$_id.type",
          categories: {
            $push: {
              category: "$_id.category",
              amount: "$totalAmount",
              count: "$count",
            },
          },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly trends
// @route   GET /api/dashboard/monthly-trends
// @access  Private
exports.getMonthlyTrends = async (req, res, next) => {
  try {
    const { entity, months = 6 } = req.query;

    // Build entity filter
    let entityIds = [];

    if (req.user.role === "employee" || req.user.role === "observer") {
      entityIds = req.user.assignedEntities || [];
    } else if (entity) {
      entityIds = [entity];
    } else {
      const entities = await Entity.find({});
      entityIds = entities.map((e) => e._id);
    }

    if (entityIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Calculate start date (N months ago)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const trends = await Transaction.aggregate([
      {
        $match: {
          entity: { $in: entityIds.map((id) => mongoose.Types.ObjectId(id)) },
          status: { $in: ["paid", "reconciled"] },
          transactionDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$transactionDate" },
            month: { $month: "$transactionDate" },
            type: "$type",
          },
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month",
          },
          data: {
            $push: {
              type: "$_id.type",
              amount: "$totalAmount",
              count: "$count",
            },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Format the data for frontend charts
    const formattedTrends = trends.map((trend) => {
      const monthData = {
        year: trend._id.year,
        month: trend._id.month,
        monthName: new Date(trend._id.year, trend._id.month - 1).toLocaleString(
          "default",
          { month: "short" }
        ),
        income: 0,
        expense: 0,
        transfer: 0,
      };

      trend.data.forEach((item) => {
        monthData[item.type] = item.amount;
      });

      monthData.net = monthData.income - monthData.expense;

      return monthData;
    });

    res.status(200).json({
      success: true,
      data: formattedTrends,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get entity-wise summary
// @route   GET /api/dashboard/entity-summary
// @access  Private
exports.getEntitySummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build entity filter based on role
    let entityFilter = {};

    if (req.user.role === "employee" || req.user.role === "observer") {
      if (req.user.assignedEntities && req.user.assignedEntities.length > 0) {
        entityFilter._id = { $in: req.user.assignedEntities };
      } else {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
    }

    const entities = await Entity.find(entityFilter);
    const summary = [];

    for (const entity of entities) {
      // Get total balance
      const accounts = await BankAccount.find({
        entity: entity._id,
        isActive: true,
      });

      const totalBalance = accounts.reduce(
        (sum, acc) => sum + acc.currentBalance,
        0
      );

      // Get transaction stats
      const transactionMatch = {
        entity: entity._id,
        status: { $in: ["paid", "reconciled"] },
      };

      if (startDate || endDate) {
        transactionMatch.transactionDate = {};
        if (startDate)
          transactionMatch.transactionDate.$gte = new Date(startDate);
        if (endDate) transactionMatch.transactionDate.$lte = new Date(endDate);
      }

      const transactionStats = await Transaction.aggregate([
        { $match: transactionMatch },
        {
          $group: {
            _id: "$type",
            totalAmount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]);

      const transactions = {
        income: 0,
        expense: 0,
        transfer: 0,
      };

      transactionStats.forEach((stat) => {
        transactions[stat._id] = stat.totalAmount;
      });

      summary.push({
        entity: {
          _id: entity._id,
          name: entity.name,
          type: entity.type,
        },
        totalBalance,
        accountCount: accounts.length,
        transactions,
        net: transactions.income - transactions.expense,
      });
    }

    // Sort by total balance descending
    summary.sort((a, b) => b.totalBalance - a.totalBalance);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AR/AP Summary
// @route   GET /api/dashboard/ar-ap-summary
// @access  Private
exports.getARAPSummary = async (req, res, next) => {
  try {
    const { entity } = req.query;

    // Build entity filter
    let entityFilter = {};

    if (req.user.role === "employee" || req.user.role === "observer") {
      if (req.user.assignedEntities && req.user.assignedEntities.length > 0) {
        entityFilter._id = { $in: req.user.assignedEntities };
      } else {
        return res.status(200).json({
          success: true,
          data: {
            accountsReceivable: {
              total: 0,
              current: 0,
              overdue: 0,
              overdueCount: 0,
            },
            accountsPayable: {
              total: 0,
              current: 0,
              overdue: 0,
              overdueCount: 0,
            },
            agingAR: { age30: 0, age60: 0, age90: 0, ageOver90: 0 },
            agingAP: { age30: 0, age60: 0, age90: 0, ageOver90: 0 },
            topOverdueCustomers: [],
            topOverdueVendors: [],
          },
        });
      }
    }

    if (entity) {
      entityFilter._id = entity;
    }

    const entities = await Entity.find(entityFilter);
    const entityIds = entities.map((e) => e._id);

    // Calculate Accounts Receivable (Sales Invoices)
    const salesInvoices = await Invoice.find({
      entity: { $in: entityIds },
      invoiceType: "sales_invoice",
      status: { $in: ["sent", "overdue", "partially_paid"] },
    }).populate("customer", "customerName");

    let arTotal = 0;
    let arCurrent = 0;
    let arOverdue = 0;
    let arOverdueCount = 0;
    let ar30 = 0;
    let ar60 = 0;
    let ar90 = 0;
    let arOver90 = 0;

    const customerOutstanding = {};

    salesInvoices.forEach((invoice) => {
      const outstanding = invoice.totalAmount - invoice.paidAmount;
      arTotal += outstanding;

      if (invoice.status === "overdue") {
        arOverdue += outstanding;
        arOverdueCount++;
      } else {
        arCurrent += outstanding;
      }

      // Aging buckets
      ar30 += invoice.age30 || 0;
      ar60 += invoice.age60 || 0;
      ar90 += invoice.age90 || 0;
      arOver90 += invoice.ageOver90 || 0;

      // Top overdue customers
      if (invoice.customer && invoice.status === "overdue") {
        const customerId = invoice.customer._id.toString();
        const customerName = invoice.customer.customerName;

        if (!customerOutstanding[customerId]) {
          customerOutstanding[customerId] = {
            customer: { _id: customerId, name: customerName },
            outstanding: 0,
            invoiceCount: 0,
          };
        }

        customerOutstanding[customerId].outstanding += outstanding;
        customerOutstanding[customerId].invoiceCount++;
      }
    });

    // Calculate Accounts Payable (Purchase Invoices)
    const purchaseInvoices = await Invoice.find({
      entity: { $in: entityIds },
      invoiceType: "purchase_invoice",
      status: { $in: ["sent", "overdue", "partially_paid"] },
    }).populate("vendor", "vendorName");

    let apTotal = 0;
    let apCurrent = 0;
    let apOverdue = 0;
    let apOverdueCount = 0;
    let ap30 = 0;
    let ap60 = 0;
    let ap90 = 0;
    let apOver90 = 0;

    const vendorOutstanding = {};

    purchaseInvoices.forEach((invoice) => {
      const outstanding = invoice.totalAmount - invoice.paidAmount;
      apTotal += outstanding;

      if (invoice.status === "overdue") {
        apOverdue += outstanding;
        apOverdueCount++;
      } else {
        apCurrent += outstanding;
      }

      // Aging buckets
      ap30 += invoice.age30 || 0;
      ap60 += invoice.age60 || 0;
      ap90 += invoice.age90 || 0;
      apOver90 += invoice.ageOver90 || 0;

      // Top overdue vendors
      if (invoice.vendor && invoice.status === "overdue") {
        const vendorId = invoice.vendor._id.toString();
        const vendorName = invoice.vendor.vendorName;

        if (!vendorOutstanding[vendorId]) {
          vendorOutstanding[vendorId] = {
            vendor: { _id: vendorId, name: vendorName },
            outstanding: 0,
            invoiceCount: 0,
          };
        }

        vendorOutstanding[vendorId].outstanding += outstanding;
        vendorOutstanding[vendorId].invoiceCount++;
      }
    });

    // Get top 5 overdue customers and vendors
    const topOverdueCustomers = Object.values(customerOutstanding)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    const topOverdueVendors = Object.values(vendorOutstanding)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        accountsReceivable: {
          total: arTotal,
          current: arCurrent,
          overdue: arOverdue,
          overdueCount: arOverdueCount,
        },
        accountsPayable: {
          total: apTotal,
          current: apCurrent,
          overdue: apOverdue,
          overdueCount: apOverdueCount,
        },
        agingAR: {
          age30: ar30,
          age60: ar60,
          age90: ar90,
          ageOver90: arOver90,
        },
        agingAP: {
          age30: ap30,
          age60: ap60,
          age90: ap90,
          ageOver90: apOver90,
        },
        topOverdueCustomers,
        topOverdueVendors,
      },
    });
  } catch (error) {
    next(error);
  }
};
