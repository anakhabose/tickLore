const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const productController = require('../controller/productController');
const categoryController = require('../controller/categoryController');
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

router.get('/logout',adminAuth.checkSession,adminController.logout);


module.exports = router;