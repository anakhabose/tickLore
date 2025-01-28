const category = require("../model/categoryModel");

module.exports = {
addCategory: async (req, res) => {
    try {
        const { categoryName } = req.body;
        const images = req.file.path;

        if (!categoryName || categoryName.trim().length === 0) {
            return res.status(400).json({
                status: false,
                message: 'Category name is required'
            });
        }

        if (categoryName.length > 30) {
            return res.status(400).json({
                status: false,
                message: 'Category name cannot exceed 30 characters'
            });
        }

      
        const categoryNameRegex = /^[a-zA-Z0-9\s]{2,}$/;
        if (!categoryNameRegex.test(categoryName)) {
            return res.status(400).json({
                status: false,
                message: 'Category name must contain only letters, numbers, and spaces, and be at least 2 characters long'
            });
        }

        const existingCategory = await category.findOne({
            categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                status: false,
                message: 'A category with this name already exists'
            });
        }

        const newCategory = new category({
            categoryName,
            images
        });

        await newCategory.save();

        res.status(201).json({
            status: true,
            message: 'Category added successfully',
            categoryId: newCategory._id
        });

    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({
            status: false,
            message: 'Error adding category',
            error: error.message
        });
    }
},

editCategory: async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { categoryName } = req.body;
        
        // Validation checks
        if (!categoryName || categoryName.trim().length === 0) {
            return res.status(400).json({
                status: false,
                message: 'Category name is required'
            });
        }

        if (categoryName.length < 3) {  // Updated to match frontend validation
            return res.status(400).json({
                status: false,
                message: 'Category name must be at least 3 characters long'
            });
        }

        if (categoryName.length > 30) {
            return res.status(400).json({
                status: false,
                message: 'Category name cannot exceed 30 characters'
            });
        }

        const categoryNameRegex = /^[a-zA-Z0-9\s]+$/;  // Updated to match frontend validation
        if (!categoryNameRegex.test(categoryName)) {
            return res.status(400).json({
                status: false,
                message: 'Category name can only contain letters, numbers and spaces'
            });
        }

        const updateData = {
            categoryName: categoryName,
        };

        // Handle image upload
        if (req.file) {
            updateData.images = req.file.path;
        }

        // Check for existing category with same name
        const existingCategory = await category.findOne({
            categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') },
            _id: { $ne: categoryId }
        });

        if (existingCategory) {
            return res.status(400).json({
                status: false,
                message: 'A category with this name already exists'
            });
        }

        const updateCategory = await category.findByIdAndUpdate(
            categoryId,
            updateData,
            { new: true }
        );

        if (!updateCategory) {
            return res.status(404).json({
                status: false,
                message: "Category not found"
            });
        }

        return res.status(200).json({
            status: true,
            message: "Category updated successfully!"
        });

    } catch (error) {
        console.error('Error updating category:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            status: false,
            message: "Server error",
            error: error.message
        });
    }
},
    blockCategory:async (req, res) => {
       const userId = req.params.id;

        try {
            await category.findByIdAndUpdate(req.params.id, { status: false });
            res.redirect('/admin/category');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error blocking category');
        }
    },
    unblockCategory:async (req, res) => {
        try {
            await category.findByIdAndUpdate(req.params.id, { status: true });
            res.redirect('/admin/category');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error unblocking category');
        }
       
    },
};