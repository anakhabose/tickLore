const Product = require("../model/productModel");
const categoryModel = require("../model/categoryModel");

module.exports = {
 addProducts: async (req, res) => {
    try {
      console.log('Headers:', req.headers);
      console.log('Raw request body:', req.body);
      console.log('Files:', req.files);
      
      const { productName, price, description, category, stock } = req.body;
      
      console.log('Category value:', category);
      console.log('Category type:', typeof category);
    
      if (!productName || !price || !description || !category) {
        return res.status(400).json({ 
          status: false, 
          message: 'All required fields must be filled' 
        });
      }

      
      const existingProduct = await Product.findOne({ productName: { $regex: new RegExp(`^${productName}$`, 'i') } });
      if (existingProduct) {
        return res.status(400).json({
          status: false,
          message: 'Product name already exists'
        });
      }

    
      if (!req.files || req.files.length !== 4) {
        return res.status(400).json({ 
          status: false, 
          message: 'Exactly 4 images are required' 
        });
      }

      const images = req.files.map((file) => file.path);
     
      console.log('Searching for category with ID:', category);
      const categoryExists = await categoryModel.findById(category);
      console.log('Found category:', categoryExists);
      
      if (!categoryExists) {
        return res.status(400).json({
          status: false,
          message: 'Invalid category selected'
        });
      }

      const product = new Product({
        productName, 
        price, 
        description, 
        category, 
        stock: stock || 0,  
        images,
      });

      await product.save();
      
      res.status(201).json({ 
        status: true, 
        message: 'Product added successfully',
        productId: product._id
      });
      
    } catch (error) {
      console.error('Error adding product:', error);

      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          status: false, 
          message: Object.values(error.errors).map(err => err.message).join(', ')
        });
      }

      res.status(500).json({ 
        status: false, 
        message: 'Error adding product',
        error: error.message
      });
    }
},
editProducts: async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, description, category, stock, price } = req.body;

        console.log('Product ID:', productId);
        console.log('Request Body:', req.body);

     
        if (productName) {
            const existingProduct = await Product.findOne({
                _id: { $ne: productId },
                productName: { $regex: new RegExp(`^${productName}$`, 'i') }
            });
            
            if (existingProduct) {
                return res.status(400).json({
                    status: false,
                    message: 'Product name already exists'
                });
            }
        }

     
        const categoryExists = await categoryModel.findById(category);

        if (!categoryExists) {
            return res.status(400).json({
                status: false,
                message: "Invalid category selected"
            });
        }

        const updateProduct = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {
                    productName,
                    description,
                    category,
                    stock,
                    price
                }
            },
            { 
                new: true,
                runValidators: true
            }
        );

        console.log('Updated Product:', updateProduct);

        if (!updateProduct) {
            return res.status(404).json({
                status: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({ 
            status: true, 
            message: "Product updated successfully!" 
        });
    } catch (error) {
        console.error('Error details:', error);
        return res.status(500).json({
            status: false,
            message: "Server error",
            error: error.message
        });
    }
},

deleteProduct: async (req, res) => {
  try {
          const productId=req.params.id;
          const deletedProduct=await Product.findByIdAndUpdate(
          productId,
          {deleted:true,deletedAt: new Date()},
          {new : true}
      );

      if(!deletedProduct){
          res.status(400).json({status:false,message:"Product not found "})
      }

      res.status(200).json({status:true,message:"Product deleted Successfully",product:deletedProduct})

      } catch (error) {
          console.error("Error soft deleting product:", error);
          res.status(500).json({ status: false, message: "Server error", error: error.message });
      }
},

};