const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel');
require('dotenv').config()



// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser((id, done) => {
    User.findById(id)
    .then(user=>{
        done(null,user);
    })
    .catch(err=>{
        done(err,null)
    })
});

// Google Strategy Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:process.env.CALLBACK_URL,
    prompt: 'select_account'
  },
  async (accessToken,refreshToken,profile,done)=>{
    try{
       let user=await User.findOne({googleId:profile.id});
       if(user){
           return done(null,user);
       }
       else{
           user=new User({
               name:profile.displayName,
               email:profile.emails[0].value,
               googleId:profile.id,
           })
           await user.save();
           return done(null,user);
       }
    }
    catch(error){
       if (error.code === 11000 && error.keyPattern.googleId) {
           // Handle the duplicate key error
           return done(null, false, { message: 'A user with this Google account already exists.' });
         } else {
           return done(error, null);
         }
    }
}
));


module.exports = passport;