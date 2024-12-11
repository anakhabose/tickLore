
const category = require("../model/categoryModel");

module.exports = {
 addCategory : async (req, res) => {
    try {
        const { categoryName } = req.body;
        const images = req.file.path;
     
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
        const { categoryName} = req.body;
      
        console.log('Category ID:', categoryId);
        console.log('Request Body:', req.body);

        const updateCategory = await category.findByIdAndUpdate(
            categoryId,
            {
               categoryName: categoryName,
            },
            { new: true }
        );
        
      
        console.log('Updated Category:', updateCategory);
      
        if (!updateCategory) {
            return res.status(404).json({ 
                status: false, 
                message: "Product not found" 
            });
        }

        return res.status(200).json({ status: true, message: "Category updated Successfully!" })
    } catch (error) {
      
        console.error('Error details:', error);
        console.error('Error updating category:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            status: false, 
            message: "Server error",
            error: error.message 
        })
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