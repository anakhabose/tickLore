const mongoose=require("mongoose");
const productModel = require('./productModel');

const orderSchema=new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', 
        required: true 
    },
    address: { 
        type: Object, 
        required: true 
    }, 
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
            quantity: { type: Number, required: true },
            subtotal: { type: Number, required: true },
        },
    ],
   
    couponApplied: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    discount: {
        type: Number,
        default: 0
    },
    total: { 
        type: Number, 
        required: true 
    },
    paymentMethod: { 
        type: String, 
        required: true 
    },
    paymentStatus: { 
        type: String,
        enum: ['Pending', 'Failed', 'Success'],
        default: 'Pending' 
    },
    status: {
        type: String,
        enum: ['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
        default: 'Pending'
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    shippedAt: {
        type: Date,
    },
    deliveredAt: {
        type: Date,
    },
    outForDeliveryAt: {
        type: Date,
    },
    returnRequest: {
        reason: String,
        comments: String,
        requestedAt: Date,
        status: String
    },
    returnedAt: Date,
    paymentDetails: {
        razorpay_payment_id: String,
        razorpay_order_id: String,
        razorpay_signature: String
    }
})

orderSchema.pre('save', async function(next) {
  if (this.isNew) { 
    try {
     
      for (const item of this.items) {
        await productModel.findByIdAndUpdate(
          item.product,
          { $inc: { salesCount: item.quantity } }
        );
      }
    } catch (error) {
      console.error('Error updating product sales count:', error);
    }
  }
  next();
});

module.exports=mongoose.model("Orders",orderSchema)