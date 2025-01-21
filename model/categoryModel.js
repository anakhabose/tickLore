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
    },
     offer: {                            
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer',
    default: null
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('category', categorySchema);;
