const express = require('express');
const router = express.Router();
const userController = require('../controller/userController')
const passport = require('passport');
const auth = require('../middleware/gauth')

router.get('/home',userController.loadHome)

router.get('/signup',userController.loadSignup);
router.post('/signup',userController.registerUser);

router.get('/otp', userController.loadOtp);
router.post('/otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);

router.get('/login',userController.loadLogin);
router.post('/login',userController.login)

router.get('/dashboard', auth.ensureAuthenticated, (req, res) => {
  console.log('Dashboard route accessed');
  console.log('User:', req.user);
  res.render('dashboard', { 
      user: req.user,
      title: 'Dashboard'
  });
});



router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));
  

  router.get( '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
     
      res.redirect('/user/dashboard');
    });

module.exports = router;