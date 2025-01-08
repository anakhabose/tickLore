const Cart = require("../model/cartModel");
const Product = require('../model/productModel');
const userSchema = require('../model/userModel');
const orderSchema = require('../model/orderModel');
const razorpay = require('../config/razorpay');
const Coupon = require('../model/couponModel');
const mongoose = require('mongoose');
const Address = require('../model/addressModel');


module.exports = {

loadOrders: async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await userSchema.findById(userId);
        
       
        const page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const skip = (page - 1) * limit;
        
        
        const totalOrders = await orderSchema.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);
        
        
        const orders = await orderSchema.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

       
        const formatDate = (date) => {
            if (!date) return null;
            return new Date(date).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const populatedOrders = await Promise.all(orders.map(async (order) => {
            const populatedItems = await Promise.all(order.items.map(async (item) => {
                const product = await Product.findById(item.product);
                return {
                    ...item.toObject(),
                    product: product
                };
            }));

            return {
                _id: order._id,
                items: populatedItems,
                total: order.total,
                status: order.status,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                createdAt: formatDate(order.createdAt)
            };
        }));

        res.render("user/orders", {
            user,
            orders: populatedOrders,
            currentPath: '/orders',
            pagination: {
                page,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error("Error in loadOrders:", error);
        res.render("user/orders", {
            user: req.session.user,
            orders: [],
            currentPath: '/orders',
            pagination: {
                page: 1,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
            }
        });
    }
},

loadViewDetail: async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user._id;
        const user = await userSchema.findById(userId);

        const order = await orderSchema.findById(orderId).populate({
            path: 'items.product',
            select: 'productName images price'
        });

        if (!order) {
            return res.status(404).render('error', {
                message: 'Order not found'
            });
        }

        const formatDate = (date) => {
            if (!date) return null;
            return new Date(date).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const formattedOrder = {
            ...order.toObject(),
            createdAt: formatDate(order.createdAt),
            shippedAt: formatDate(order.shippedAt),
            outForDeliveryAt: formatDate(order.outForDeliveryAt),
            deliveredAt: formatDate(order.deliveredAt)
        };

        res.render("user/viewDetail", { 
            order: formattedOrder,
            user,
            currentPath: '/orders'
        });

    } catch (error) {
        console.error("Error in loadViewDetail:", error);
        res.status(500).render('error', {
            message: 'Error loading order details'
        });
    }
},
  
createRazorpayOrder: async (req, res) => {
   try {
       const { amount, discountedAmount } = req.body;
       const options = {
           amount: (discountedAmount || amount) * 100,
           currency: "INR",
           receipt: "order_" + Date.now(),
       };
        const order = await razorpay.orders.create(options);
       res.json({
           success: true,
           order,
           key: process.env.RAZORPAY_KEY_ID
       });
   } catch (error) {
       console.error("Error creating Razorpay order:", error);
       res.status(500).json({ success: false, error: "Payment initiation failed" });
   }
}
,
verifyPayment: async (req, res) => {
    try {
        const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature,
            address, 
            couponId,
            discountAmount,
            finalAmount
        } = req.body;

        console.log('Request body:', req.body);
        
        const userId = req.session.user._id;
       
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature === razorpay_signature) {
            const cart = await Cart.findOne({ userId }).populate('items.productId');

            if (!cart) {
                return res.json({ success: false, error: "Cart not found" });
            }

          
            const subtotal = cart.items.reduce((total, item) => {
                return total + (item.productId.price * item.quantity);
            }, 0);

              const deliveryCharges = subtotal >= 2000 ? 0 : 
                                  subtotal >= 1000 ? 30 : 50;

          
            const orderItems = cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                subtotal: item.productId.price * item.quantity
            }));

            let couponApplied = null;
            let discount = 0;

             if (couponId) {  
                console.log('Processing coupon:', couponId);
                const coupon = await Coupon.findById(couponId);  
                console.log('Found coupon:', coupon);

                if (coupon) {
                    couponApplied = coupon._id;
                    discount = parseFloat(discountAmount) || 0;
                    console.log('Applied discount:', discount);
                }
            }


        
            const total = finalAmount || (subtotal + deliveryCharges - discount);

           
            const orderData = {
                userId,
                address,
                items: orderItems,
                subtotal,
                discount: discount,
                couponApplied: couponApplied,
                total,
                deliveryCharges,
                paymentMethod: 'razorpay',
                status: 'Pending',
                paymentStatus: 'Success',
                paymentDetails: {
                    razorpay_payment_id,
                    razorpay_order_id,
                    razorpay_signature
                },
                createdAt: new Date()
            };

            console.log('Order data before save:', orderData);

        
            const newOrder = new orderSchema(orderData);
            await newOrder.save();

            console.log('Saved order:', newOrder);

           
            if (couponApplied) {
                await Coupon.findByIdAndUpdate(couponApplied, {
                    $push: { usedBy: userId }
                });
            }

        
            for (const item of cart.items) {
                await Product.findByIdAndUpdate(
                    item.productId._id,
                    { $inc: { stock: -item.quantity } }
                );
            }

           
            await Cart.findByIdAndDelete(cart._id);

            return res.json({ 
                success: true,
                orderId: newOrder._id,
                discount: discount,
                couponApplied: couponApplied
            });
        } else {
            return res.json({ 
                success: false, 
                error: "Payment verification failed",
                paymentStatus: 'Failed' 
            });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            paymentStatus: 'Failed'
        });
    }
},


}