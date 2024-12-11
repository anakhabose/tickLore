const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
    trim: true
  },
  images: {
    type: [String], 
    required: true,
    
  },
  status:{
        type:Boolean,
        default:true
    }
}, {
  timestamps: true 
});

module.exports = mongoose.model('category', categorySchema);;
