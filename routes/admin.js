const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const productController = require('../controller/productController');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../config/multer');


router.get('/login',adminAuth.isLogin,adminController.loadLogin);
router.post('/login',adminController.login);


router.get('/dashboard',adminAuth.checkSession,adminController.loadDashboard);

router.get('/customers',adminAuth.checkSession,adminController.loadCustomers);

router.post('/block-user/:id',adminAuth.checkSession, adminController.blockUser);

router.post('/unblock-user/:id', adminAuth.checkSession,adminController.unblockUser);


router.get('/products',adminAuth.checkSession,adminController.loadProducts);
router.get('/products-edit',adminAuth.checkSession,adminController.loadEditProducts);
router.post('/products-edit',adminAuth.checkSession,productController.addProducts);



router.get('/category',adminAuth.checkSession,adminController.loadCategory);

router.get('/logout',adminAuth.checkSession,adminController.logout);


module.exports = router;