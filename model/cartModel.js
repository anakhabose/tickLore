const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',  
    required: true,
  },
  items:[
  {
    productId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',  
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,  
    min: 1, 
  },
  salePrice: {
        type: Number,
        required: true,
      },
      totalPrice: {
        type: Number,
        required: true,
      },
  },
  ],
  totalCartPrice: {
    type: Number,
    default: 0,
  },
  deliveryCharges: {
     type: Number,
      required: true, 
      default: 0 
    },
  finalAmount : {
    type: Number,
    default: 0,
  },
  status: {
        type: String,
        default: 'placed',
        enum: ['placed', 'shipped', 'delivered', 'cancelled'] 
    },
   
},{timestamps:true});

const cart = mongoose.model('cart', cartSchema);
module.exports = cart;
