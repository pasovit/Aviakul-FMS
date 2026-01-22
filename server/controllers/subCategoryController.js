const SubCategory = require("../models/SubCategory");
const Category = require("../models/Category");

// CREATE
exports.createSubCategory = async (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name?.trim() || !category) {
      return res.status(400).json({
        success: false,
        message: "Sub-category name and category are required",
      });
    }

    // Check category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check duplicate
    const exists = await SubCategory.findOne({
      name: new RegExp(`^${name}$`, "i"),
      category,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Sub-category already exists for this category",
      });
    }

    const subCategory = await SubCategory.create({
      name,
      category,
    });

    res.status(201).json({
      success: true,
      message: "Sub-category created successfully",
      data: subCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create sub-category",
      error: error.message,
    });
  }
};



// GET ALL
exports.getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find()
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-categories",
    });
  }
};



// GET BY CATEGORY
exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subCategories = await SubCategory.find({
      category: categoryId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-categories",
    });
  }
};



// UPDATE
exports.updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sub-category name is required",
      });
    }

    // Prevent duplicate names under same category
    const existing = await SubCategory.findOne({
      name: new RegExp(`^${name}$`, "i"),
      _id: { $ne: id },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Sub-category with this name already exists",
      });
    }

    const subCategory = await SubCategory.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found",
      });
    }

    res.json({
      success: true,
      message: "Sub-category updated successfully",
      data: subCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update sub-category",
    });
  }
};



// DELETE
exports.deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await SubCategory.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found",
      });
    }

    res.json({
      success: true,
      message: "Sub-category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete sub-category",
    });
  }
};
