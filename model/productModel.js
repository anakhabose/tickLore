const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  images: {
    type: [String], 
    required: true,
    
  },
  deleted: { type: Boolean, default: false },
}, {
  timestamps: true 
});

module.exports = mongoose.model('products', productSchema);;
