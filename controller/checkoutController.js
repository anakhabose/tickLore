const Cart = require('../model/cartModel');
const User = require('../model/userModel');
const Address = require('../model/addressModel');
const productSchema = require('../model/productModel');
const orderSchema = require('../model/orderModel')
const Coupon = require('../model/couponModel');
const Wallet = require('../model/walletModel');
const razorpay = require('../config/razorpay');
const Wishlist = require('../model/wishlistModel');

const checkoutController = {
    loadCheckout: async (req, res) => {
        try {
            if (!req.session.user || !req.session.user._id) {
                return res.redirect('/user/login');
            }

            const userId = req.session.user._id;
            
          
            const userData = await User.findById(userId);
            if (!userData) {
                return res.redirect('/user/login');
            }

         
            const cart = await Cart.findOne({ userId })
                .populate({
                    path: 'items.productId',
                    model: 'products',
                    select: 'productName images price deleted discountedPrice offer',
                    populate: [
                        {
                            path: 'offer',
                            model: 'offer',
                            select: 'discountValue'
                        },
                     
                    ]
                });

            if (!cart || cart.items.length === 0) {
                return res.redirect('/user/cart');
            }

            const activeCartItems = cart.items.filter(item => 
                item.productId && !item.productId.deleted
            ).map(item => {
                let effectivePrice = Number(item.productId.price);
                let appliedDiscount = 0;
                let hasOffer = false;

                if (item.productId.offer && item.productId.offer.discountValue) {
                    appliedDiscount = Math.max(appliedDiscount, item.productId.offer.discountValue);
                    hasOffer = true;
                }

                // if (item.productId.category && item.productId.category.offer && 
                //     item.productId.category.offer.discountValue) {
                //     appliedDiscount = Math.max(appliedDiscount, item.productId.category.offer.discountValue);
                //     hasOffer = true;
                // }

                if (hasOffer) {
                    effectivePrice = effectivePrice - (effectivePrice * (appliedDiscount / 100));
                }

                return {
                    ...item.toObject(),
                    productId: item.productId,
                    quantity: item.quantity,
                    originalPrice: Number(item.productId.price),
                    salePrice: effectivePrice,
                    totalPrice: effectivePrice * item.quantity,
                    hasOffer: hasOffer,
                    appliedDiscount: appliedDiscount
                };
            });

            const subtotal = activeCartItems.reduce((total, item) => {
                return total + item.totalPrice;
            }, 0);

           
            const hasOfferProducts = activeCartItems.some(item => item.hasOffer);

            const calculateDeliveryCharges = (totalAmount) => {
                if (totalAmount >= 2000) return 0;        
                if (totalAmount >= 1000) return 30;      
                return 50;
            };

            const deliveryCharges = calculateDeliveryCharges(subtotal);
            const totalAmount = subtotal + deliveryCharges;

            const isCodAvailable = totalAmount <= 1000;

         
            cart.items = activeCartItems;
            cart.totalCartPrice = subtotal;
            cart.deliveryCharges = deliveryCharges;
            cart.finalAmount = totalAmount;
            await cart.save();

          
            const currentDate = new Date();
            const availableCoupons = await Coupon.find({
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate },
                isBlock: false,
                status: 'Active',
                minPurchaseAmount: { $lte: subtotal }
            });

            console.log('Available Coupons:', availableCoupons);

            const validCoupons = await Promise.all(availableCoupons.map(async (coupon) => {
                const canUse = await coupon.canUserUse(userId);
                return canUse ? coupon : null;
            }));

            const filteredCoupons = validCoupons.filter(coupon => coupon !== null);
            console.log('Filtered Coupons:', filteredCoupons);

     
            const addresses = await Address.find({ userId });

       
            const cartCount = cart ? cart.items.length : 0;

           
            const wishlistCount = await Wishlist.countDocuments({ user: userId });

            return res.render('user/checkout', {
                user: req.session.user,
                users: userData,
                cartItems: activeCartItems,
                subtotal: Math.round(subtotal).toFixed(2),
                deliveryCharges: deliveryCharges.toFixed(2),
                totalAmount: Math.round(totalAmount).toFixed(2),
                addresses,
                hasOfferProducts,
                hasCoupons: filteredCoupons.length > 0 && !hasOfferProducts,
                availableCoupons: filteredCoupons,
                isCodAvailable,
                cartCount,
                wishlistCount
            });

        } catch (error) {
            console.error('Checkout error:', error);
            res.status(500).render('error', { 
                message: 'Error loading checkout page. Please try again.', 
                error: error 
            });
            return res.redirect('/user/cart');
        }
    },
  placeOrder: async (req, res) => {
    try {
        console.log('place order reached');
        console.log('Request body:', req.body);

        const userId = req.session.user._id; 
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated. Please login." });
        }

        const { 
            addressId, 
            paymentMethod, 
            couponId,        
            discountAmount,   
            finalAmount       
        } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (!paymentMethod) {
            return res.status(400).json({ message: "Payment method is required" });
        }

        
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty. Add products before placing an order." });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(400).json({ message: "Invalid address" });
        }

        
        const orderItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            subtotal: item.productId.price * item.quantity
        }));

        const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        const discount = parseFloat(discountAmount) || 0;
        const total = parseFloat(finalAmount) || (subtotal - discount);

     
        const newOrder = new orderSchema({
            userId,
            address,
            items: orderItems,
            subtotal,
            discount,        
            total,            
            paymentMethod,
            status: "Pending",
            couponApplied: couponId || null, 
            createdAt: new Date()
        });
        console.log(newOrder);

        await newOrder.save();

      
        if (couponId) {
            await Coupon.findByIdAndUpdate(couponId, {
                $push: { usedBy: userId }
            });
        }

       
        for (const item of orderItems) {
            await productSchema.findByIdAndUpdate(
                item.product,
                { 
                    $inc: { 
                        stock: -item.quantity,
                        salesCount: item.quantity
                    } 
                }
            );
        }

      
        await Cart.findByIdAndDelete(cart._id);

        return res.status(200).json({
            message: "Order Placed Successfully!",
            orderId: newOrder._id
        });

    } catch (error) {
        console.error('Order placement error:', error);
        return res.status(500).json({
            message: "Error placing order",
            error: error.message
        });
    }
},
cancelOrder: async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user._id;
        
        const order = await orderSchema.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

      
        for (const item of order.items) {
            await productSchema.findByIdAndUpdate(
                item.product._id,
                { 
                    $inc: { 
                        stock: item.quantity,
                        salesCount: -item.quantity
                    } 
                }
            );
        }

        
        if (order.paymentMethod.toLowerCase() !== 'cod') {
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: 0,
                    transactions: []
                });
            }

            const productNames = order.items.map(item => item.product.productName).join(', ');
            const description = `Refund for cancelled order: ${productNames}`;

            wallet.balance += order.total;
            wallet.transactions.push({
                type: 'refund',
                amount: order.total,
                description: description,
                date: new Date()
            });

            await wallet.save();
        }
        
        order.status = "Cancelled";
        await order.save();

        const message = order.paymentMethod.toLowerCase() === 'cod' 
            ? "Your order has been cancelled successfully"
            : "Your order has been cancelled successfully and amount has been refunded to your wallet";

        return res.status(200).json({ message });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error occurred", error: error.message });
    }
},
    submitReturnRequest: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { reason, comments } = req.body;
            const userId = req.session.user._id;

            const order = await orderSchema.findById(orderId).populate('items.product');
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            
            for (const item of order.items) {
                await productSchema.findByIdAndUpdate(
                    item.product._id,
                    { 
                        $inc: { 
                            stock: item.quantity,
                            salesCount: -item.quantity
                        } 
                    }
                );
            }

        
            if (order.paymentMethod.toLowerCase() !== 'cod') {
                let wallet = await Wallet.findOne({ userId });
                if (!wallet) {
                    wallet = new Wallet({
                        userId,
                        balance: 0,
                        transactions: []
                    });
                }

                const productNames = order.items.map(item => item.product.productName).join(', ');
                const description = `Refund for returned order: ${productNames}`;

                wallet.balance += order.total;
                wallet.transactions.push({
                    type: 'refund',
                    amount: order.total,
                    description: description,
                    date: new Date()
                });

                await wallet.save();
            }

            order.status = 'Returned';
            order.returnRequest = {
                reason,
                comments,
                requestedAt: new Date(),
                status: 'approved'
            };
            
            order.returnedAt = new Date();
            await order.save();

            const message = order.paymentMethod.toLowerCase() === 'cod'
                ? 'Return request approved successfully.'
                : 'Return request approved successfully. Amount has been refunded to your wallet.';

            res.status(200).json({ message });
        } catch (error) {
            console.error('Error in submitReturnRequest:', error);
            res.status(500).json({ message: 'Error submitting return request' });
        }
    },
    applyCoupon: async (req, res) => {
         try {
        const { couponId, cartTotal } = req.body;
        const userId = req.session.user._id;

          
            if (!couponId || !cartTotal) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon ID and cart total are required'
                });
            }

        const coupon = await Coupon.findById(couponId);
        
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        if (new Date() > coupon.expiryDate) {
            return res.status(400).json({
                success: false,
                message: 'Coupon has expired'
            });
        }

            if (cartTotal < coupon.minPurchaseAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum purchase amount of Rs.${coupon.minPurchaseAmount} required`
                });
            }

            const hasUsed = await orderSchema.findOne({
                user: userId,
                'coupon.couponId': couponId
            });

        if (hasUsed) {
            return res.status(400).json({
                success: false,
                message: 'You have already used this coupon'
            });
        }


        const discount = coupon.discount;
        const finalAmount = cartTotal - discount;

        return res.status(200).json({
            success: true,
            discount,
            finalAmount,
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Error in applyCoupon:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
},

removeCoupon: async (req, res) => {
    try {
        const { cartTotal } = req.body;

        if (!cartTotal) {
            return res.status(400).json({
                success: false,
                message: 'Cart total is required'
            });
        }

        return res.status(200).json({
            success: true,
            finalAmount: cartTotal,
            message: 'Coupon removed successfully'
        });

    } catch (error) {
        console.error('Error in removeCoupon:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
},

handleRepayment: async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user._id;

       
        const order = await orderSchema.findOne({ 
            _id: orderId,
            userId: userId
        });

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        if (order.paymentStatus === 'Success') {
            return res.status(400).json({
                success: false,
                message: 'Payment already completed for this order'
            });
        }

       
        const shortReceiptId = `re_${Date.now().toString().slice(-8)}`;

        
        const options = {
            amount: Math.round(order.total * 100),
            currency: "INR",
            receipt: shortReceiptId,
            notes: {
                orderType: 'repayment',
                originalOrderId: orderId.toString()
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        await orderSchema.findByIdAndUpdate(orderId, {
            $push: {
                paymentAttempts: {
                    razorpayOrderId: razorpayOrder.id,
                    amount: order.total,
                    timestamp: new Date()
                }
            }
        });

        res.status(200).json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            order: razorpayOrder,
            orderDetails: {
                orderId: order._id,
                amount: order.total,
                items: order.items
            }
        });

    } catch (error) {
        console.error('Repayment initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate repayment',
            error: error.message
        });
    }
},


verifyRepayment: async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            orderId
        } = req.body;

        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        const updatedOrder = await orderSchema.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    paymentStatus: 'Success',
                    'paymentDetails.razorpay_payment_id': razorpay_payment_id,
                    'paymentDetails.razorpay_order_id': razorpay_order_id,
                    'paymentDetails.razorpay_signature': razorpay_signature,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment successful',
            order: updatedOrder
        });

    } catch (error) {
        console.error('Repayment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
},
createPendingOrder: async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { address, couponId, discountAmount, finalAmount } = req.body;

    
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const orderItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            subtotal: item.productId.price * item.quantity
        }));

    
        const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        const discount = parseFloat(discountAmount) || 0;
        const total = parseFloat(finalAmount) || (subtotal - discount);

      
        const newOrder = new orderSchema({
            userId,
            address,
            items: orderItems,
            subtotal,
            discount,
            total,
            couponApplied: couponId || null,
            paymentMethod: 'razorpay',
            status: 'Pending',
            paymentStatus: 'Failed',
            createdAt: new Date()
        });

        await newOrder.save();

     
        for (const item of orderItems) {
            await productSchema.findByIdAndUpdate(
                item.product,
                { 
                    $inc: { 
                        stock: -item.quantity,
                        salesCount: item.quantity
                    } 
                }
            );
        }

   
        await Cart.findByIdAndDelete(cart._id);

        res.status(200).json({
            success: true,
            message: "Order created with pending payment",
            orderId: newOrder._id
        });

    } catch (error) {
        console.error('Error in createPendingOrder:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create order",
            error: error.stack
        });
    }
},


}
module.exports = checkoutController;
