const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', 
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2, 
    maxlength: 50,
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
    minlength: 5, 
    maxlength: 100, 
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: 100, 
  },
  landmark: {
    type: String,
    trim: true,
    maxlength: 50, 
  },
  city: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50, 
  },
  state: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  country: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50, 
    default: 'India', 
  },
  pincode: {
    type: String,
    required: true,
    match: /^[1-9][0-9]{5}$/, 
    minlength: 6,
    maxlength: 6,
  },
  phoneNumber: {
    type: String,
    required: true,
    match: /^[1-9][0-9]{9}$/,
    minlength: 10,
    maxlength: 10, 
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Address = mongoose.model('Address', AddressSchema);

module.exports = Address;
