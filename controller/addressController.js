const Address = require("../model/addressModel");
const userSchema = require('../model/userModel');

module.exports = {

  addAddress: async (req, res) => {
    try {
      console.log('Adding address reached');
      const {
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        pincode,
        phoneNumber,
      } = req.body;

      // Validate required fields
      if (!name || !addressLine1 || !city || !state || !country || !pincode || !phoneNumber) {
        return res.status(400).json({ 
          status: false, 
          message: 'All required fields must be filled' 
        });
      }

      // Validate field lengths
      if (name.length > 10 || name.length < 2) {
        return res.status(400).json({ 
          status: false, 
          message: 'Name must be between 2 and 10 characters' 
        });
      }

      if (addressLine1.length > 30 || addressLine1.length < 5) {
        return res.status(400).json({ 
          status: false, 
          message: 'Address must be between 5 and 30 characters' 
        });
      }

      if (city.length > 15 || city.length < 2) {
        return res.status(400).json({ 
          status: false, 
          message: 'City must be between 2 and 15 characters' 
        });
      }

      // Validate pincode and phone number format
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      const phoneRegex = /^[1-9][0-9]{9}$/;

      if (!pincodeRegex.test(pincode)) {
        return res.status(400).json({ 
          status: false, 
          message: 'Invalid pincode format' 
        });
      }

      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ 
          status: false, 
          message: 'Invalid phone number format' 
        });
      }

      // Check if user exists in session
      if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ 
          status: false, 
          message: 'User not authenticated' 
        });
      }

      const userId = req.session.user._id;

      const newAddress = new Address({
        userId,
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        pincode,
        phoneNumber,
      });

      await newAddress.save();

      res.status(200).json({ 
        status: true, 
        message: 'Address added successfully!' 
      });

    } catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({ 
        status: false, 
        message: 'Internal server error',
        error: error.message 
      });
    }
  },

  editAddress: async (req, res) => {
    try {
      const addressId = req.params.id;
      const {
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        phoneNumber,
        pincode
      } = req.body;

      // Validate required fields
      if (!name || !addressLine1 || !city || !state || !country || !pincode || !phoneNumber) {
        return res.status(400).json({ 
          status: false, 
          message: 'All required fields must be filled' 
        });
      }

      // Validate field lengths
      if (name.length > 10 || name.length < 2) {
        return res.status(400).json({ 
          status: false, 
          message: 'Name must be between 2 and 10 characters' 
        });
      }

      if (addressLine1.length > 30 || addressLine1.length < 5) {
        return res.status(400).json({ 
          status: false, 
          message: 'Address must be between 5 and 30 characters' 
        });
      }

      if (city.length > 15 || city.length < 2) {
        return res.status(400).json({ 
          status: false, 
          message: 'City must be between 2 and 15 characters' 
        });
      }

      if (state.length > 15 || state.length < 2) {
        return res.status(400).json({ 
          status: false, 
          message: 'State must be between 2 and 15 characters' 
        });
      }

      if (country.length > 15 || country.length < 2) {
        return res.status(400).json({ 
          status: false, 
          message: 'Country must be between 2 and 15 characters' 
        });
      }

      // Validate pincode and phone number format
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      const phoneRegex = /^[1-9][0-9]{9}$/;

      if (!pincodeRegex.test(pincode)) {
        return res.status(400).json({ 
          status: false, 
          message: 'Invalid pincode format' 
        });
      }

      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ 
          status: false, 
          message: 'Invalid phone number format' 
        });
      }

      // Validate if address exists
      const existingAddress = await Address.findById(addressId);
      if (!existingAddress) {
        return res.status(404).json({ 
          status: false, 
          message: "Address not found" 
        });
      }

      // Validate if address belongs to the logged-in user
      if (existingAddress.userId.toString() !== req.session.user._id.toString()) {
        return res.status(403).json({ 
          status: false, 
          message: "Unauthorized to edit this address" 
        });
      }

      const updates = {
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        phoneNumber,
        pincode
      };

      const updateAddress = await Address.findByIdAndUpdate(
        addressId,
        updates,
        { 
          new: true,
          runValidators: true // This ensures mongoose schema validations run on update
        }
      );

      return res.status(200).json({
        status: true,
        message: "Address updated successfully",
        address: updateAddress
      });

    } catch (error) {
      console.log(error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          status: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => err.message)
        });
      }
      res.status(500).json({ 
        status: false,
        message: 'Failed to update address', 
        error: error.message 
      });
    }
  },

  deleteAddress: async (req, res) => {
    try {
      const addressId = req.params.id;

      // Validate if address exists
      const existingAddress = await Address.findById(addressId);
      if (!existingAddress) {
        return res.status(404).json({ 
          status: false, 
          message: "Address not found" 
        });
      }

      // Validate if address belongs to the logged-in user
      if (existingAddress.userId.toString() !== req.session.user._id.toString()) {
        return res.status(403).json({ 
          status: false, 
          message: "Unauthorized to delete this address" 
        });
      }

      await Address.findByIdAndDelete(addressId);
      return res.status(200).json({
        status: true,
        message: "Address deleted successfully"
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: false,
        message: "Failed to delete address",
        error: error.message
      });
    }
  }
};