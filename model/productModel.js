const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
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
    validate: {
      validator: function (value) {
        return value.length > 0; 
      },
      message: 'At least one image URL is required'
    }
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('products', productSchema);;
