const productModel = require('../model/productModel');
const Coupon = require('../model/couponModel');

module.exports={
    loadCoupons: async (req, res) => {
        try {
            const admin = req.session.admin;
            if (!admin) {
                return res.redirect('/admin/login');
            }    
            const search = req.query.search || '';
    
      
            const searchQuery = {
                couponName: { $regex: search, $options: 'i' }
            };
    
           
            const coupons = await Coupon.find(searchQuery)
                .sort({ createdAt: -1 });
    
            res.render('admin/coupons', { 
                coupons,
                search,
                currentPath: '/admin/coupons'
            });
    
        } catch (error) {
            console.error('Error loading coupons:', error);
            res.status(500).send('Error loading coupons');
        }
    },
    
    addCouponsPage:async(req,res)=>{
        try{
            const admin = req.session.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }
       
        res.render('admin/addCoupons');
            
        }catch{
            res.status(500).send('Server Error');
        }
    },
    addCoupons: async (req, res) => {
        try {
            const { 
                couponName, 
                couponCode, 
                discount, 
                minPurchaseAmount, 
                maxDiscount, 
                startDate, 
                endDate, 
                description,
                usagePerUser 
            } = req.body;

    
            if (!couponName || !couponCode || !discount || !minPurchaseAmount || 
                !startDate || !endDate || !usagePerUser) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'All required fields must be filled' 
                });
            }

         
            if (parseInt(usagePerUser) < 1) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Usage per user must be at least 1' 
                });
            }

            
            const existingCouponName = await Coupon.findOne({ 
                couponName: { $regex: new RegExp(`^${couponName}$`, 'i') }
            });
            if (existingCouponName) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Coupon name already exists' 
                });
            }

            const existingCouponCode = await Coupon.findOne({ 
                couponCode: couponCode.toUpperCase()
            });
            if (existingCouponCode) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Coupon code already exists' 
                });
            }

      
            if (discount < 1 || discount > 90) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Discount must be between 1 and 90' 
                });
            }

            if (minPurchaseAmount < 1) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Minimum purchase amount must be at least 1' 
                });
            }

        
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDateObj < today) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Start date cannot be in the past' 
                });
            }

            if (endDateObj <= startDateObj) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'End date must be after start date' 
                });
            }

            const coupon = new Coupon({
                couponName,
                couponCode: couponCode.toUpperCase(),
                discount,
                minPurchaseAmount,
                maxDiscount: maxDiscount || discount,
                startDate: startDateObj,
                endDate: endDateObj,
                description,
                maxUsagePerUser: parseInt(usagePerUser),
                status: 'Active'
            });

            await coupon.save();
            
            res.status(201).json({ 
                status: true, 
                message: 'Coupon added successfully',
                couponId: coupon._id
            });
            
        } catch (error) {
            console.error('Error adding coupon:', error);
            if (error.name === 'ValidationError') {
                return res.status(400).json({ 
                    status: false, 
                    message: Object.values(error.errors).map(err => err.message).join(', ')
                });
            }
            res.status(500).json({ 
                status: false, 
                message: 'Error adding coupon',
                error: error.message
            });
        }
    },
    loadEditCoupons: async (req, res) => {
        try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);
        
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

            
            const formattedCoupon = {
                ...coupon.toObject(),
                startDate: coupon.startDate.toISOString().split('T')[0],
                endDate: coupon.endDate.toISOString().split('T')[0]
            };

            res.render('admin/editCoupons', {
                coupon: formattedCoupon,
                admin: true,
                message: req.query.message
            });
        } catch (error) {
            console.error('Error in loadEditCoupons:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    editCoupons: async (req, res) => {
        try {
            const admin = req.session.admin;
            if (!admin) {
                return res.redirect('/admin/login');
            }

            const couponId = req.params.id;
            const { 
                couponName, 
                couponCode, 
                discount, 
                minPurchaseAmount, 
                startDate, 
                endDate, 
                usagePerUser 
            } = req.body;

            
            if (!couponName || !couponCode || !discount || !minPurchaseAmount || 
                !startDate || !endDate || !usagePerUser) {
                return res.json({ 
                    status: false, 
                    message: 'All required fields must be filled' 
                });
            }

            const existingCouponName = await Coupon.findOne({ 
                _id: { $ne: couponId },
                couponName: { $regex: new RegExp(`^${couponName}$`, 'i') }
            });
            if (existingCouponName) {
                return res.json({ 
                    status: false, 
                    message: 'Coupon name already exists' 
                });
            }

            const existingCouponCode = await Coupon.findOne({ 
                _id: { $ne: couponId },
                couponCode: couponCode.toUpperCase()
            });
            if (existingCouponCode) {
                return res.json({ 
                    status: false, 
                    message: 'Coupon code already exists' 
                });
            }

        
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDateObj < today) {
                return res.json({ 
                    status: false, 
                    message: 'Start date cannot be in the past' 
                });
            }

            if (endDateObj <= startDateObj) {
                return res.json({ 
                    status: false, 
                    message: 'End date must be after start date' 
                });
            }

         

            const updatedCoupon = await Coupon.findByIdAndUpdate(
                couponId,
                {
                    couponName: couponName,
                    couponCode: couponCode.toUpperCase(),
                    discount: parseInt(discount),
                    minPurchaseAmount: parseInt(minPurchaseAmount),
                    startDate: startDateObj,
                    endDate: endDateObj,
                    maxUsagePerUser: parseInt(usagePerUser)
                },
                { new: true, runValidators: true }
            );
            
            if (!updatedCoupon) {
                return res.json({ 
                    status: false, 
                    message: 'Coupon not found' 
                });
            }

            res.json({ status: true, message: 'Coupon updated successfully' });
        } catch (error) {
            console.error('Error updating coupon:', error);
            res.json({ 
                status: false, 
                message: error.message || 'Failed to update coupon' 
            });
        }
    },
    blockCoupon: async (req, res) => {
        try {
            const couponId = req.params.id;
            const updatedCoupon = await Coupon.findByIdAndUpdate(
                couponId,
                { isBlock: true },
                { new: true }
            );

            if (!updatedCoupon) {
                return res.json({ 
                    status: false, 
                    message: 'Coupon not found' 
                });
            }

            res.json({ 
                status: true, 
                message: 'Coupon blocked successfully' 
            });
        } catch (error) {
            console.error('Error blocking coupon:', error);
            res.json({ 
                status: false, 
                message: 'Failed to block coupon' 
            });
        }
    },
    unblockCoupon: async (req, res) => {
        try {
            const couponId = req.params.id;
            const updatedCoupon = await Coupon.findByIdAndUpdate(
                couponId,
                { isBlock: false },
                { new: true }
            );

            if (!updatedCoupon) {
                return res.json({ 
                    status: false, 
                    message: 'Coupon not found' 
                });
            }

            res.json({ 
                status: true, 
                message: 'Coupon unblocked successfully' 
            });
        } catch (error) {
            console.error('Error unblocking coupon:', error);
            res.json({ 
                status: false, 
                message: 'Failed to unblock coupon' 
            });
        }
    }
}