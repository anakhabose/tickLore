const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    sparse: true,
    index: {
      unique: true,
      partialFilterExpression: { googleId: { $exists: true } },
    },
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      // Only require password for non-OAuth users
      return !this.googleId;
    },
  },
  status: {
    type: Boolean,
    default: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
  phoneNumber:{
    type:String,
    unique:true
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: false,
  },
});

module.exports = mongoose.model("user", userSchema);
