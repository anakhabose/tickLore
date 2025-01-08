const mongoose = require('mongoose');
const { Schema } = mongoose; 

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
    type:String,
    //type: Schema.Types.ObjectId,
    //ref: 'category', 
    required: true
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
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer',
    default: null
  },
  discountedPrice: {
    type: Number,
    default: null
  },
}, {
  timestamps: true 
});
productSchema.pre('save', async function(next) {
  try {
   
    this.discountedPrice = this.price;

   
    if (this.offer) {
      const offer = await mongoose.model('Offer').findById(this.offer);
      if (offer && offer.isActive) {
        const discount = (this.price * offer.discountValue) / 100;
        this.discountedPrice = this.price - discount;
      }
    } else {
     
      const category = await mongoose.model('category')
        .findById(this.category)
        .populate('offer');
      
      if (category?.offer?.isActive) {
        const discount = (this.price * category.offer.discountValue) / 100;
        this.discountedPrice = this.price - discount;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});


module.exports = mongoose.model('products', productSchema);;
