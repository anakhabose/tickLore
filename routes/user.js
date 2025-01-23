const express = require('express');
const router = express.Router();
const userController = require('../controller/userController')
const passport = require('passport');
const auth = require('../middleware/gauth');
const userAuth = require('../middleware/userAuth');
const upload = require('../config/multer');
const addressController = require('../controller/addressController');
const cartController = require('../controller/cartController');
const checkoutController = require('../controller/checkoutController');
const orderController = require('../controller/orderController');
const shopController = require('../controller/shopController');
const wishlistController = require('../controller/wishlistController');
const walletController = require('../controller/walletController');



router.get('/home',userController.loadHome);


router.get('/signup',userController.loadSignup);
router.post('/signup',userController.registerUser);

router.get('/otp',userController.loadOtp);
router.post('/otp', userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);

router.get('/login',userAuth.isLogin,userController.loadLogin);
router.post('/login',userController.login);

router.get('/shop',userAuth.checkSession, shopController.loadShop);
router.get('/shop/search',userAuth.checkSession, shopController.searchProduct);

router.get('/viewProducts/:id',userAuth.checkSession,userController.loadViewProducts);

router.get('/profile',userAuth.checkSession,userController.loadProfile);
router.patch('/editProfile',upload.single('profileImage'),userController.editProfile);

router.get('/cart',userAuth.checkSession,cartController.loadCart);
router.post('/addToCart',userAuth.checkSession,cartController.addToCart);
router.post('/updateCart',userAuth.checkSession, cartController.updateCart);
router.delete('/removeFromCart/:productId',userAuth.checkSession,cartController.removeFromCart);
router.post('/verify-stock', cartController.verifyStock);

router.get('/address',userAuth.checkSession,userController.loadAddress);
router.post('/addAddress',userAuth.checkSession,addressController.addAddress);
router.post('/editAddress/:id',userAuth.checkSession,addressController.editAddress);
router.delete("/deleteAddress/:id",userAuth.checkSession,addressController.deleteAddress);

router.get('/orders',userAuth.checkSession,orderController.loadOrders);
router.get('/viewDetail/:id',userAuth.checkSession,orderController.loadViewDetail);



router.get('/checkout', userAuth.checkSession, checkoutController.loadCheckout);
router.post('/checkout',userAuth.checkSession, checkoutController.placeOrder);


router.post('/cancelOrder/:id',userAuth.checkSession,checkoutController.cancelOrder);
router.post('/returnOrder/:orderId',userAuth.checkSession, checkoutController.submitReturnRequest);

router.get('/changePassword', userAuth.checkSession, userController.loadChangePassword);
router.post('/changePassword', userAuth.checkSession, userController.changePassword);

router.post('/create-razorpay-order',userAuth.checkSession, orderController.createRazorpayOrder);
router.post('/verify-razorpay-payment',userAuth.checkSession, orderController.verifyPayment);


router.post('/create-pending-order',userAuth.checkSession, checkoutController.createPendingOrder);
//router.put('/orders/:orderId/payment-status', checkoutController.updatePaymentStatus);
router.post('/repayment/:orderId',userAuth.checkSession, checkoutController.handleRepayment);
router.post('/verify-repayment',userAuth.checkSession, checkoutController.verifyRepayment);

router.get('/download-invoice/:orderId',userAuth.checkSession, userController.downloadInvoice);

router.get('/wishlist',userAuth.checkSession, wishlistController.getWishlist);
router.post('/addToWishlist', userAuth.checkSession, wishlistController.addToWishlist);
router.delete('/removeFromWishlist/:productId', userAuth.checkSession, wishlistController.removeFromWishlist);

router.get('/wallet',userAuth.checkSession,walletController.loadWallet);
router.post('/wallet/add-money', userAuth.checkSession, walletController.addMoney);
router.post('/wallet/verify-payment', userAuth.checkSession, walletController.verifyPayment);

router.post('/apply-coupon', userAuth.checkSession, checkoutController.applyCoupon);


router.get('/logout',userAuth.checkSession,userController.logout);


router.get('/auth/google', 
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account',
        accessType: 'offline'
    })
);

router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/user/login',
        failureMessage: true
    }),
    userController.gUser
);
    
router.get('/forgot-password', userController.loadForgotPassword);
router.post('/forgot-password', userController.forgotPassword);
router.get('/forgot-otp', userController.loadForgotOtp);
router.post('/verify-forgot-otp', userController.verifyForgotOtp);
router.get('/reset-password', userController.loadResetPassword);
router.post('/reset-password', userController.resetPassword);
router.get('/newPassword', userController.loadResetPassword);

module.exports = router;
