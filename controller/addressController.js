
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
      landmark,
      city,
      state,
      country,
      pincode,
      phoneNumber,
    } = req.body;
    console.log(req.body)
    const userId = req.session.user._id; 

    const newAddress = new Address({
      userId,
      name,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      country,
      pincode,
      phoneNumber,
    });

   
    await newAddress.save();

    res.json({ status: true, message: 'Address added successfully!' });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ status: false, message: 'Internal server error' });
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
            { new: true }
        );

        if (!updateAddress) {
            return res.status(404).json({ message: "Address not found" });
        }

        return res.status(200).json({
            message: "Address updated successfully",
            address: updateAddress
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ 
            message: 'Failed to update address', 
            error: error.message 
        });
    }
},

deleteAddress: async (req, res) => {
  try {
            const addressId=req.params.id;
            const deleteProduct= await Address.findByIdAndDelete(addressId)
            if(!deleteProduct){
                res.status(404).json({message:"Address not found"})
            }
            return res.status(200).json({message:"Address deleted successfully"})
        } catch (error) {
            console.log(error);
            res.status(500).json({message:"Failed to delete address",error:error.message})
        }
},


};