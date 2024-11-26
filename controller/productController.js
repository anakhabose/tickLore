const Product = require("../model/productModel");

module.exports = {
  addProducts: async (req, res) => {
    try {
      const { name, description, price, category, stock } = req.body;
      const images = req.files.map((file) => file.path); // Save file paths

      if (
        !name || !description || !price || !category ||!stock ||images.length === 0) {
        return res.status(400).json({ message: "All fields are required." });
      }

      const newProduct = new Product({
        name,
        description,
        price,
        category,
        stock,
        images,
      });
      const savedProduct = await newProduct.save();

      res.status(201).json({
        message: "Product added successfully!",
        product: savedProduct,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error adding product", error: error.message });
    }
  },

};
