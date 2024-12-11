const express = require('express');
const router = express.Router();
const userController = require('../controller/userController')
const passport = require('passport');
const auth = require('../middleware/gauth');
const userAuth = require('../middleware/userAuth');
const upload = require('../config/multer');

router.get('/home',userController.loadHome);


router.get('/signup',userController.loadSignup);
router.post('/signup',userController.registerUser);

router.get('/otp',userController.loadOtp);
router.post('/otp', userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);

router.get('/login',userAuth.isLogin,userController.loadLogin);
router.post('/login',userController.login);

router.get('/profile',userAuth.checkSession,userController.loadProfile);
router.patch('/editProfile',upload.single('profilePicture'),userController.editProfile)


router.get('/logout',userAuth.checkSession,userController.logout)

 router.get('/viewProducts/:id',userController.loadViewProducts);


router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));
  

  router.get( '/auth/google/callback', passport.authenticate('google', { failureRedirect: '/admin/signup' }),userController.gUser);
    
    

module.exports = router;