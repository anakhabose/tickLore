const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  offerTitle: {
    type: String,
    required: true,
    trim: true
  },
  offerType: {
    type: String,
    enum: ['product', 'category'],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    required: function() {
      return this.offerType === 'product';
    }
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'category',
    required: function() {
      return this.offerType === 'category';
    }
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }, 
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("offer", offerSchema);