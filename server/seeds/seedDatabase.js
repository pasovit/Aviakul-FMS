const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Entity = require("../models/Entity");
const BankAccount = require("../models/BankAccount");
const Transaction = require("../models/Transaction");
const Vendor = require("../models/Vendor");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

// Seed entities
const seedEntities = async () => {
  try {
    // Clear existing entities
    await Entity.deleteMany({});
    console.log("Cleared existing entities");

    const entities = [
      // Companies
      {
        name: "Aviakul Private Limited",
        type: "company",
        businessType: "private_limited",
        pan: "AAAAA0000A",
        gstin: "29AAAAA0000A1Z5",
        billingAddress: {
          line1: "123 Business Park",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560001",
          country: "India",
        },
        email: "contact@aviakul.com",
        phone: "9876543210",
        industry: "Technology",
        isActive: true,
      },
      {
        name: "Pasovit Technologies Private Limited",
        type: "company",
        businessType: "private_limited",
        pan: "BBBBB1111B",
        gstin: "29BBBBB1111B1Z5",
        billingAddress: {
          line1: "456 Tech Hub",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560002",
          country: "India",
        },
        email: "info@pasovit.com",
        phone: "9876543211",
        industry: "Software Development",
        isActive: true,
      },
      {
        name: "TBBT Media Solutions LLP",
        type: "llp",
        businessType: "llp",
        pan: "CCCCC2222C",
        gstin: "29CCCCC2222C1Z5",
        billingAddress: {
          line1: "789 Media Center",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560003",
          country: "India",
        },
        email: "contact@tbbtmedia.com",
        phone: "9876543212",
        industry: "Media & Advertising",
        isActive: true,
      },
      {
        name: "CSOE Research Foundation",
        type: "ngo",
        businessType: "ngo",
        pan: "DDDDD3333D",
        registrationNumber: "NGO/2020/001",
        is80GEligible: true,
        billingAddress: {
          line1: "321 Foundation Building",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560004",
          country: "India",
        },
        email: "info@csoefoundation.org",
        phone: "9876543213",
        industry: "Research & Education",
        description:
          "Non-profit organization focused on education and research",
        isActive: true,
      },
      {
        name: "B. L. Das & Co.",
        type: "partnership",
        businessType: "sole_proprietorship",
        pan: "EEEEE4444E",
        gstin: "29EEEEE4444E1Z5",
        billingAddress: {
          line1: "654 Trade Street",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560005",
          country: "India",
        },
        email: "contact@bldasandco.com",
        phone: "9876543214",
        industry: "Trading",
        isActive: true,
      },
      {
        name: "A. V. Global Trading Co.",
        type: "company",
        businessType: "sole_proprietorship",
        pan: "FFFFF5555F",
        gstin: "29FFFFF5555F1Z5",
        billingAddress: {
          line1: "987 Global Plaza",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560006",
          country: "India",
        },
        email: "info@avglobal.com",
        phone: "9876543215",
        industry: "Import/Export",
        isActive: true,
      },
      {
        name: "The Tau Studio",
        type: "company",
        businessType: "private_limited",
        pan: "GGGGG6666G",
        gstin: "29GGGGG6666G1Z5",
        billingAddress: {
          line1: "147 Creative Hub",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560007",
          country: "India",
        },
        email: "hello@taustudio.com",
        phone: "9876543216",
        industry: "Design & Creative Services",
        isActive: true,
      },
      // Individuals
      {
        name: "Praveen Sankaran",
        type: "individual",
        businessType: "individual",
        pan: "HHHHH7777H",
        billingAddress: {
          line1: "258 Residential Area",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560008",
          country: "India",
        },
        email: "praveen.sankaran@example.com",
        phone: "9876543217",
        isActive: true,
      },
      {
        name: "Vaibhav Varun",
        type: "individual",
        businessType: "individual",
        pan: "IIIII8888I",
        billingAddress: {
          line1: "369 Garden Colony",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560009",
          country: "India",
        },
        email: "vaibhav.varun@example.com",
        phone: "9876543218",
        isActive: true,
      },
    ];

    const createdEntities = await Entity.insertMany(entities);
    console.log(`Created ${createdEntities.length} entities`);

    return createdEntities;
  } catch (error) {
    console.error("Error seeding entities:", error.message);
    throw error;
  }
};

// Seed super admin user
const seedSuperAdmin = async (entities) => {
  try {
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ username: "superadmin" });

    if (existingAdmin) {
      console.log("Super Admin user already exists");
      return existingAdmin;
    }

    // Create super admin
    const superAdmin = await User.create({
      username: "superadmin",
      email: "admin@aviakul.com",
      password: "Admin@123456", // CHANGE THIS AFTER FIRST LOGIN
      role: "super_admin",
      firstName: "Super",
      lastName: "Admin",
      phone: "9999999999",
      assignedEntities: entities.map((e) => e._id), // Access to all entities
      isActive: true,
      twoFactorEnabled: false,
    });

    console.log("Created Super Admin user");
    console.log("Email: admin@aviakul.com");
    console.log("Username: superadmin");
    console.log("Password: Admin@123456");
    console.log(
      "IMPORTANT: Change this password immediately after first login!"
    );

    return superAdmin;
  } catch (error) {
    console.error("Error seeding super admin:", error.message);
    throw error;
  }
};

// Seed bank accounts
const seedBankAccounts = async (entities, admin) => {
  try {
    await BankAccount.deleteMany({});
    console.log("Cleared existing bank accounts");

    const accounts = [];

    // Create 1-2 accounts per entity
    for (const entity of entities) {
      // Primary savings/current account
      accounts.push({
        entity: entity._id,
        accountName: `${entity.name} - Primary Account`,
        accountType: entity.type === "individual" ? "savings" : "current",
        accountNumber: `${Math.random().toString().slice(2, 14)}`,
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
        branchName: "Main Branch",
        currency: "INR",
        openingBalance: Math.floor(Math.random() * 500000) + 100000,
        openingBalanceDate: new Date("2024-01-01"),
        isActive: true,
        createdBy: admin._id,
      });

      // Cash account for some entities
      if (Math.random() > 0.5) {
        accounts.push({
          entity: entity._id,
          accountName: `${entity.name} - Cash`,
          accountType: "cash",
          currency: "INR",
          openingBalance: Math.floor(Math.random() * 50000) + 10000,
          openingBalanceDate: new Date("2024-01-01"),
          isActive: true,
          createdBy: admin._id,
        });
      }
    }

    const createdAccounts = await BankAccount.insertMany(accounts);
    console.log(`Created ${createdAccounts.length} bank accounts`);
    return createdAccounts;
  } catch (error) {
    console.error("Error seeding bank accounts:", error.message);
    throw error;
  }
};

// Seed transactions
const seedTransactions = async (entities, bankAccounts, admin) => {
  try {
    await Transaction.deleteMany({});
    console.log("Cleared existing transactions");

    const transactions = [];
    const categories = {
      income: [
        "Sales",
        "Consulting",
        "Interest",
        "Rent Received",
        "Other Income",
      ],
      expense: [
        "Rent",
        "Salary",
        "Utilities",
        "Travel",
        "Office Supplies",
        "Professional Fees",
        "Insurance",
      ],
    };

    const startDate = new Date("2024-01-01");
    const endDate = new Date();

    // Generate 10-15 transactions per account
    for (const account of bankAccounts) {
      const numTransactions = Math.floor(Math.random() * 6) + 10;

      for (let i = 0; i < numTransactions; i++) {
        const type = Math.random() > 0.5 ? "income" : "expense";
        const category =
          categories[type][Math.floor(Math.random() * categories[type].length)];
        const amount = Math.floor(Math.random() * 50000) + 1000;

        // Random date between start and end
        const randomDate = new Date(
          startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime())
        );

        const transaction = {
          entity: account.entity,
          bankAccount: account._id,
          transactionDate: randomDate,
          type,
          category,
          partyName:
            type === "income" ? `Customer ${i + 1}` : `Vendor ${i + 1}`,
          amount,
          gstDetails: {
            cgst: type === "expense" ? Math.floor(amount * 0.09) : 0,
            sgst: type === "expense" ? Math.floor(amount * 0.09) : 0,
            igst: 0,
            totalGST: type === "expense" ? Math.floor(amount * 0.18) : 0,
          },
          tdsDetails: {
            section: type === "income" && Math.random() > 0.7 ? "194J" : "",
            rate: type === "income" && Math.random() > 0.7 ? 10 : 0,
            amount:
              type === "income" && Math.random() > 0.7
                ? Math.floor(amount * 0.1)
                : 0,
          },
          totalAmount:
            amount +
            (type === "expense" ? Math.floor(amount * 0.18) : 0) -
            (type === "income" && Math.random() > 0.7
              ? Math.floor(amount * 0.1)
              : 0),
          paymentMethod: ["neft", "rtgs", "upi", "cheque"][
            Math.floor(Math.random() * 4)
          ],
          status: Math.random() > 0.2 ? "paid" : "pending",
          referenceNumber: `REF${Date.now()}${i}`,
          notes: `Sample ${type} transaction`,
          createdBy: admin._id,
        };

        transactions.push(transaction);
      }
    }

    const createdTransactions = await Transaction.insertMany(transactions);

    // Update bank account balances based on paid transactions
    for (const account of bankAccounts) {
      const accountTransactions = createdTransactions.filter(
        (t) =>
          t.bankAccount.toString() === account._id.toString() &&
          t.status === "paid"
      );

      let balance = account.openingBalance;
      for (const txn of accountTransactions) {
        if (txn.type === "income") {
          balance += txn.totalAmount;
        } else if (txn.type === "expense") {
          balance -= txn.totalAmount;
        }
      }

      account.currentBalance = balance;
      await account.save();
    }

    console.log(`Created ${createdTransactions.length} transactions`);
    console.log(`Updated account balances`);
    return createdTransactions;
  } catch (error) {
    console.error("Error seeding transactions:", error.message);
    throw error;
  }
};

// Seed vendors
const seedVendors = async (entities, admin) => {
  try {
    await Vendor.deleteMany({});
    console.log("Cleared existing vendors");

    const vendorData = [
      {
        entity: entities[0]._id,
        name: "Tech Supplies India Pvt Ltd",
        vendorCode: "VEN-001",
        email: "sales@techsupplies.com",
        phone: "9876543220",
        contactPerson: "Rajesh Kumar",
        category: "raw_material",
        paymentTerms: "net_30",
        creditLimit: 500000,
        creditUsed: 150000,
        address: {
          line1: "12 Industrial Area",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
        },
        pan: "AAATP1234A",
        gstin: "27AAATP1234A1Z5",
        tdsApplicable: true,
        tdsRate: 2,
        tdsSection: "194C",
        isActive: true,
        createdBy: admin._id,
      },
      {
        entity: entities[0]._id,
        name: "Cloud Services Global",
        vendorCode: "VEN-002",
        email: "billing@cloudservices.com",
        phone: "9876543221",
        contactPerson: "Sarah Johnson",
        category: "services",
        paymentTerms: "net_15",
        creditLimit: 1000000,
        creditUsed: 450000,
        address: {
          line1: "Tech Park",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560100",
        },
        pan: "BBBCS5678B",
        gstin: "29BBBCS5678B1Z5",
        tdsApplicable: true,
        tdsRate: 2,
        tdsSection: "194J",
        isActive: true,
        createdBy: admin._id,
      },
      {
        entity: entities[1]._id,
        name: "Office Essentials Ltd",
        vendorCode: "VEN-003",
        email: "orders@officeessentials.com",
        phone: "9876543222",
        contactPerson: "Priya Sharma",
        category: "office_supplies",
        paymentTerms: "net_30",
        creditLimit: 200000,
        creditUsed: 50000,
        address: {
          line1: "Sector 18",
          city: "Delhi",
          state: "Delhi",
          pincode: "110001",
        },
        pan: "CCCOE9012C",
        gstin: "07CCCOE9012C1Z5",
        isActive: true,
        createdBy: admin._id,
      },
      {
        entity: entities[0]._id,
        name: "Marketing Solutions Pro",
        vendorCode: "VEN-004",
        email: "contact@marketingpro.com",
        phone: "9876543223",
        contactPerson: "Amit Patel",
        category: "professional",
        paymentTerms: "net_60",
        creditLimit: 300000,
        creditUsed: 200000,
        address: {
          line1: "Commercial Complex",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
        },
        pan: "DDDMS3456D",
        gstin: "27DDDMS3456D1Z5",
        tdsApplicable: true,
        tdsRate: 10,
        tdsSection: "194J",
        isActive: true,
        createdBy: admin._id,
      },
    ];

    const vendors = await Vendor.insertMany(vendorData);
    console.log(`Seeded ${vendors.length} vendors`);
    return vendors;
  } catch (error) {
    console.error("Error seeding vendors:", error.message);
    throw error;
  }
};

// Seed customers
const seedCustomers = async (entities, admin) => {
  try {
    await Customer.deleteMany({});
    console.log("Cleared existing customers");

    const customerData = [
      {
        entity: entities[0]._id,
        name: "Acme Corporation",
        customerCode: "CUS-001",
        email: "procurement@acmecorp.com",
        phone: "9876543230",
        contactPerson: "John Smith",
        category: "corporate",
        creditTerms: "net_30",
        creditLimit: 1000000,
        creditUsed: 350000,
        billingAddress: {
          line1: "Tower A, Business District",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560001",
        },
        shippingAddresses: [
          {
            address: "Warehouse 1, Industrial Area",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560099",
            isDefault: true,
          },
        ],
        gstin: "29AAAAC1234A1Z5",
        tdsApplicable: false,
        isActive: true,
        createdBy: admin._id,
      },
      {
        entity: entities[0]._id,
        name: "Bright Future Industries",
        customerCode: "CUS-002",
        email: "orders@brightfuture.com",
        phone: "9876543231",
        contactPerson: "Neha Gupta",
        category: "wholesale",
        creditTerms: "net_45",
        creditLimit: 500000,
        creditUsed: 200000,
        billingAddress: {
          line1: "Plot 45, MIDC",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
        },
        shippingAddresses: [
          {
            address: "Factory Unit, MIDC",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001",
            isDefault: true,
          },
          {
            address: "Regional Office",
            city: "Pune",
            state: "Maharashtra",
            pincode: "411001",
            isDefault: false,
          },
        ],
        gstin: "27AAABF5678B1Z5",
        isActive: true,
        createdBy: admin._id,
      },
      {
        entity: entities[1]._id,
        name: "Digital Dreams Pvt Ltd",
        customerCode: "CUS-003",
        email: "billing@digitaldreams.com",
        phone: "9876543232",
        contactPerson: "Vikram Singh",
        category: "corporate",
        creditTerms: "net_15",
        creditLimit: 300000,
        creditUsed: 150000,
        billingAddress: {
          line1: "Startup Hub",
          city: "Hyderabad",
          state: "Telangana",
          pincode: "500001",
        },
        gstin: "36AAADD9012C1Z5",
        isActive: true,
        createdBy: admin._id,
      },
      {
        entity: entities[0]._id,
        name: "Global Tech Solutions",
        customerCode: "CUS-004",
        email: "accounts@globaltech.com",
        phone: "9876543233",
        contactPerson: "Lisa Wong",
        category: "corporate",
        creditTerms: "net_60",
        creditLimit: 2000000,
        creditUsed: 800000,
        billingAddress: {
          line1: "IT Park Block B",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600001",
        },
        shippingAddresses: [
          {
            address: "IT Park Block B",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600001",
            isDefault: true,
          },
          {
            address: "Branch Office",
            city: "Coimbatore",
            state: "Tamil Nadu",
            pincode: "641001",
            isDefault: false,
          },
        ],
        gstin: "33AAAGT3456D1Z5",
        tdsApplicable: true,
        tdsRate: 1,
        tdsSection: "194C",
        isActive: true,
        createdBy: admin._id,
      },
    ];

    const customers = await Customer.insertMany(customerData);
    console.log(`Seeded ${customers.length} customers`);
    return customers;
  } catch (error) {
    console.error("Error seeding customers:", error.message);
    throw error;
  }
};

// Seed invoices
const seedInvoices = async (entities, vendors, customers, admin) => {
  try {
    await Invoice.deleteMany({});
    console.log("Cleared existing invoices");

    const invoiceData = [
      // Sales Invoices (AR)
      {
        entity: entities[0]._id,
        invoiceType: "sales_invoice",
        customer: customers[0]._id,
        invoiceNumber: "INV-E001-001",
        invoiceDate: new Date("2024-12-01"),
        dueDate: new Date("2024-12-31"),
        lineItems: [
          {
            description: "Software License - Enterprise",
            quantity: 10,
            unit: "nos",
            rate: 50000,
            taxRate: 18,
            hsnSacCode: "998314",
          },
          {
            description: "Support Services",
            quantity: 1,
            unit: "year",
            rate: 100000,
            taxRate: 18,
            hsnSacCode: "998315",
          },
        ],
        status: "sent",
      },
      {
        entity: entities[0]._id,
        invoiceType: "sales_invoice",
        customer: customers[1]._id,
        invoiceNumber: "INV-E001-002",
        invoiceDate: new Date("2024-11-15"),
        dueDate: new Date("2024-12-30"),
        lineItems: [
          {
            description: "Consulting Services",
            quantity: 40,
            unit: "hours",
            rate: 5000,
            taxRate: 18,
            hsnSacCode: "998316",
          },
        ],
        status: "overdue",
      },
      {
        entity: entities[0]._id,
        invoiceType: "sales_invoice",
        customer: customers[3]._id,
        invoiceNumber: "INV-E001-003",
        invoiceDate: new Date("2024-12-15"),
        dueDate: new Date("2025-02-13"),
        lineItems: [
          {
            description: "Cloud Infrastructure Setup",
            quantity: 1,
            unit: "project",
            rate: 500000,
            taxRate: 18,
            hsnSacCode: "998317",
          },
          {
            description: "Migration Services",
            quantity: 1,
            unit: "project",
            rate: 300000,
            taxRate: 18,
            hsnSacCode: "998318",
          },
        ],
        status: "sent",
        paidAmount: 400000,
      },
      // Purchase Invoices (AP)
      {
        entity: entities[0]._id,
        invoiceType: "purchase_invoice",
        vendor: vendors[0]._id,
        invoiceNumber: "PINV-E001-001",
        invoiceDate: new Date("2024-12-05"),
        dueDate: new Date("2025-01-04"),
        lineItems: [
          {
            description: "Server Hardware",
            quantity: 5,
            unit: "nos",
            rate: 80000,
            taxRate: 18,
            hsnSacCode: "847130",
          },
          {
            description: "Network Equipment",
            quantity: 10,
            unit: "nos",
            rate: 15000,
            taxRate: 18,
            hsnSacCode: "851762",
          },
        ],
        status: "sent",
      },
      {
        entity: entities[0]._id,
        invoiceType: "purchase_invoice",
        vendor: vendors[1]._id,
        invoiceNumber: "PINV-E001-002",
        invoiceDate: new Date("2024-11-01"),
        dueDate: new Date("2024-11-16"),
        lineItems: [
          {
            description: "AWS Cloud Services",
            quantity: 1,
            unit: "month",
            rate: 450000,
            taxRate: 18,
            hsnSacCode: "998319",
          },
        ],
        status: "overdue",
      },
      {
        entity: entities[0]._id,
        invoiceType: "purchase_invoice",
        vendor: vendors[3]._id,
        invoiceNumber: "PINV-E001-003",
        invoiceDate: new Date("2024-12-10"),
        dueDate: new Date("2025-02-08"),
        lineItems: [
          {
            description: "Digital Marketing Campaign",
            quantity: 1,
            unit: "campaign",
            rate: 200000,
            taxRate: 18,
            hsnSacCode: "998320",
          },
        ],
        status: "sent",
        paidAmount: 100000,
      },
    ];

    // Calculate amounts for each invoice
    invoiceData.forEach((invoice) => {
      let subtotal = 0;
      let totalTax = 0;

      invoice.lineItems = invoice.lineItems.map((item) => {
        const amount = item.quantity * item.rate;
        const taxAmount = (amount * item.taxRate) / 100;
        const totalAmount = amount + taxAmount;
        subtotal += amount;
        totalTax += taxAmount;
        return { ...item, amount, taxAmount, totalAmount };
      });

      invoice.subtotal = subtotal;
      invoice.cgst = totalTax / 2;
      invoice.sgst = totalTax / 2;
      invoice.totalTax = totalTax;
      invoice.totalAmount = subtotal + totalTax;
      invoice.amountPaid = invoice.paidAmount || 0;
      invoice.amountDue = invoice.totalAmount - invoice.amountPaid;
      invoice.createdBy = admin._id;

      // Fix enum values
      if (invoice.invoiceType === "sales_invoice")
        invoice.invoiceType = "sales";
      if (invoice.invoiceType === "purchase_invoice")
        invoice.invoiceType = "purchase";
      if (invoice.status === "sent") invoice.status = "pending";
    });

    const invoices = await Invoice.insertMany(invoiceData);
    console.log(`Seeded ${invoices.length} invoices`);
    return invoices;
  } catch (error) {
    console.error("Error seeding invoices:", error.message);
    throw error;
  }
};

// Seed payments
const seedPayments = async (entities, invoices, bankAccounts, admin) => {
  try {
    await Payment.deleteMany({});
    console.log("Cleared existing payments");

    const paymentData = [
      {
        entity: entities[0]._id,
        paymentType: "received",
        paymentNumber: "PAY-E001-001",
        paymentDate: new Date("2024-12-20"),
        amount: 400000,
        paymentMode: "neft",
        bankAccount: bankAccounts[0]._id,
        referenceNumber: "TXN123456789",
        customer: invoices[2].customer,
        allocations: [{ invoice: invoices[2]._id, allocatedAmount: 400000 }],
        createdBy: admin._id,
      },
      {
        entity: entities[0]._id,
        paymentType: "made",
        paymentNumber: "PAY-E001-002",
        paymentDate: new Date("2024-12-18"),
        amount: 100000,
        paymentMode: "neft",
        bankAccount: bankAccounts[0]._id,
        referenceNumber: "TXN987654321",
        vendor: invoices[5].vendor,
        allocations: [{ invoice: invoices[5]._id, allocatedAmount: 100000 }],
        createdBy: admin._id,
      },
      {
        entity: entities[0]._id,
        paymentType: "received",
        paymentNumber: "PAY-E001-003",
        paymentDate: new Date("2024-12-22"),
        amount: 250000,
        paymentMode: "cheque",
        bankAccount: bankAccounts[0]._id,
        chequeNumber: "CHQ456789",
        chequeDate: new Date("2024-12-22"),
        customer: invoices[0].customer,
        createdBy: admin._id,
      },
    ];

    const payments = await Payment.insertMany(paymentData);
    console.log(`Seeded ${payments.length} payments`);
    return payments;
  } catch (error) {
    console.error("Error seeding payments:", error.message);
    throw error;
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log("Starting database seeding...");

    // Connect to database
    await connectDB();

    // Seed entities
    const entities = await seedEntities();

    // Seed super admin
    const admin = await seedSuperAdmin(entities);

    // Seed bank accounts
    const bankAccounts = await seedBankAccounts(entities, admin);

    // Seed transactions
    const transactions = await seedTransactions(entities, bankAccounts, admin);

    // Seed Phase 2: Payables & Receivables
    const vendors = await seedVendors(entities, admin);
    const customers = await seedCustomers(entities, admin);
    const invoices = await seedInvoices(entities, vendors, customers, admin);
    const payments = await seedPayments(
      entities,
      invoices,
      bankAccounts,
      admin
    );

    console.log("Database seeding completed successfully!");
    console.log("Summary:");
    console.log(`Entities: ${entities.length}`);
    console.log("Super Admin: 1");
    console.log(`Bank Accounts: ${bankAccounts.length}`);
    console.log(`Transactions: ${transactions.length}`);
    console.log(`Vendors: ${vendors.length}`);
    console.log(`Customers: ${customers.length}`);
    console.log(`Invoices: ${invoices.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log("You can now start the server with: npm run dev");

    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error.message);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
