const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const productController = require('../controller/productController');
const categoryController = require('../controller/categoryController');
const couponController = require('../controller/couponController');
const offerController = require('../controller/offerController');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../config/multer');


router.get('/login',adminAuth.isLogin,adminController.loadLogin);
router.post('/login',adminController.login);


router.get('/dashboard',adminAuth.checkSession,adminController.loadDashboard);

router.get('/customers',adminAuth.checkSession,adminController.loadCustomers);

router.post('/block-user/:id',adminAuth.checkSession, adminController.blockUser);
router.post('/unblock-user/:id', adminAuth.checkSession,adminController.unblockUser);


router.get('/products',adminAuth.checkSession,adminController.loadProducts);
router.get('/products-add',adminAuth.checkSession,adminController.loadAddProducts);
router.post('/products-add',adminAuth.checkSession,upload.array('images', 4), productController.addProducts);

router.get('/editProducts/:id',adminAuth.checkSession,adminController.loadEditProducts);
router.post('/editProducts/:id',upload.array('images'),adminAuth.checkSession,productController.editProducts);

router.post('/deleteProduct/:id',adminAuth.checkSession,productController.deleteProduct);


router.get('/category',adminAuth.checkSession,adminController.loadCategory);

router.get('/addCategory',adminAuth.checkSession,adminController.loadAddCategory)
router.post('/addCategory', upload.single('images'),categoryController.addCategory);

router.get('/editCategory/:id',adminAuth.checkSession,adminController.loadEditCategory);
router.post('/editCategory/:id',upload.single('images'),categoryController.editCategory);

router.post('/blockCategory/:id',adminAuth.checkSession, categoryController.blockCategory);
router.post('/unblockCategory/:id', adminAuth.checkSession,categoryController.unblockCategory);

router.get('/orders',adminAuth.checkSession,adminController.loadOrders);
router.get('/viewDetailAdmin/:id',adminAuth.checkSession,adminController.loadViewDetailAdmin);
router.patch('/orderDetail/:id/status', adminController.updateOrderStatus);

router.get('/coupons',adminAuth.checkSession, couponController.loadCoupons);
router.get('/addCoupons', adminAuth.checkSession,couponController.addCouponsPage);
router.post('/addCoupons',adminAuth.checkSession, couponController.addCoupons);
router.patch('/blockCoupon/:id',adminAuth.checkSession, couponController.blockCoupon);
router.patch('/unblockCoupon/:id', adminAuth.checkSession,couponController.unblockCoupon);
router.get('/editCoupons/:id',adminAuth.checkSession,couponController.loadEditCoupons);
router.post('/editCoupons/:id',adminAuth.checkSession,couponController.editCoupons);

router.get('/offers',adminAuth.checkSession, offerController.loadOffers);
router.get('/addOffer',adminAuth.checkSession,offerController.addOfferPage);
router.post('/addOffer',adminAuth.checkSession,offerController.addOffer);
router.get('/editOffers/:id',adminAuth.checkSession,offerController.loadEditOffer);
router.post('/editOffers/:id',adminAuth.checkSession,offerController.editOffer);
router.patch('/blockOffer/:id', adminAuth.checkSession, offerController.blockOffer);
router.patch('/unblockOffer/:id',adminAuth.checkSession, offerController.unblockOffer);

router.post('/filter-orders', adminAuth.checkSession, adminController.filterOrders);
router.get('/sales-data', adminAuth.checkSession, adminController.getSalesData);

router.get('/export-sales-pdf', adminController.exportSalesReportPDF);
router.get('/export-sales-excel', adminController.exportSalesReportExcel);


router.get('/logout',adminAuth.checkSession,adminController.logout);

router.patch('/orderDetail/:id/status', adminController.updateOrderStatus);

router.post('/orders/:id/status', adminController.updateOrderStatus);


module.exports = router;