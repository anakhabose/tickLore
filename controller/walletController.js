const Wallet = require('../model/walletModel');
// const Razorpay = require('razorpay');
require('dotenv').config();
const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const userSchema = require('../model/userModel');

module.exports = {
    loadWallet: async (req, res) => {
        try {
            const userSession = req.session.user;
            if (!userSession) {
                return res.redirect('/user/login');
            }

            // Get page from query params, default to page 1
            const page = parseInt(req.query.page) || 1;
            const limit = 10; // Number of transactions per page

            const [userData, wallet] = await Promise.all([
                userSchema.findOne({ email: userSession.email }),
                Wallet.findOne({ userId: userSession._id })
            ]);

            // Sort transactions if wallet exists
            if (wallet && wallet.transactions) {
                wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Calculate pagination values
                const totalTransactions = wallet.transactions.length;
                const totalPages = Math.ceil(totalTransactions / limit);
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;
                
                // Get paginated transactions
                const paginatedTransactions = wallet.transactions.slice(startIndex, endIndex);
                
                res.render('user/wallet', {
                    user: userData,
                    wallet: {
                        ...wallet.toObject(),
                        transactions: paginatedTransactions
                    },
                    pagination: {
                        currentPage: page,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    },
                    razorpayKey: process.env.RAZORPAY_KEY_ID
                });
            } else {
                res.render('user/wallet', {
                    user: userData,
                    wallet: { balance: 0, transactions: [] },
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false
                    },
                    razorpayKey: process.env.RAZORPAY_KEY_ID
                });
            }
        } catch (error) {
            console.error('Error loading wallet:', error);
            res.status(500).render('error', { message: 'Error loading wallet' });
        }
    },

    addMoney: async (req, res) => {
        try {
            const { amount } = req.body;
            
            const options = {
                amount: amount,
                currency: "INR",
                receipt: "wallet_" + Date.now()
            };

            const order = await razorpay.orders.create(options);
            
            res.json({
                success: true,
                key_id: process.env.RAZORPAY_KEY_ID,
                order_id: order.id,
                amount: amount
            });
        } catch (error) {
            console.error('Error creating order:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    verifyPayment: async (req, res) => {
   try {
        const { payment, order } = req.body;
        const userId = req.session.user._id;

       
        console.log('Secret key:', process.env.RAZORPAY_KEY_SECRET);
        console.log('Payment:', payment);
        console.log('Order:', order);

        if (!process.env.RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay secret key not found');
        }

        const signatureString = `${payment.razorpay_order_id}|${payment.razorpay_payment_id}`;
        
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(signatureString)
            .digest('hex');

        if (expectedSignature === payment.razorpay_signature) {
            const amount = order.amount / 100;
            
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: 0,
                    transactions: []
                });
            }

            wallet.balance += amount;
            wallet.transactions.push({
                type: 'credit',
                amount: amount,
                description: 'Added via Razorpay',
                date: new Date(),
                paymentId: payment.razorpay_payment_id
            });

            await wallet.save();
            
            res.json({
                success: true,
                balance: wallet.balance
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid signature'
            });
        }
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
},
};
