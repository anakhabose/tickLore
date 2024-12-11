
const Product = require("../model/productModel");

module.exports = {
  addProducts: async (req, res) => {
    try {
      const { productName, price, description, category, stock } = req.body;
      
     
      if (!productName || !price || !description || !category) {
        return res.status(400).json({ 
          status: false, 
          message: 'All required fields must be filled' 
        });
      }

    
      if (!req.files || req.files.length !== 4) {
        return res.status(400).json({ 
          status: false, 
          message: 'Exactly 4 images are required' 
        });
      }

      const images=req.files.map((file)=>file.path)
     
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
        const { productName, description, category, brand, stock, price } = req.body;

        console.log('Product ID:', productId);
        console.log('Request Body:', req.body);

        const updateProduts = await Product.findByIdAndUpdate(
            productId,
            {
                productName: productName,
                description: description,
                category: category,
                brand: brand,
                stock: stock,
                price: price
            },
            { new: true }
        );

        console.log('Updated Product:', updateProduts);

        if (!updateProduts) {
            return res.status(404).json({
                status: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({ status: true, message: "Product updated successfully!" });
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