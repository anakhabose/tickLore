const express = require('express');
const passport = require('passport');
const session = require('express-session');
const hbs = require('hbs');
const nocache = require('nocache');
const cloudinary = require('cloudinary').v2;

const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('./config/passport');
require('dotenv').config();


const app = express();
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const path = require('path');
const connectDB = require('./db/connectDB');
const port = process.env.PORT || 3001;



app.set('views',path.join(__dirname,'views'));
app.set('view engine','hbs');
const partialsPath = path.join(__dirname, 'views', 'partials');
hbs.registerPartials(partialsPath);
hbs.registerHelper('eq', (a, b) => a === b);   
hbs.registerHelper('getFirstImage', (images) => {
    return images && images.length > 0 ? images[0] : ''; 
});  

hbs.registerHelper('gte', function (value1, value2) {
    return value1 >= value2;
});
hbs.registerHelper('lte', function (value1, value2) {
    return value1 <= value2;
});                                                                                                                                                                
app.use(express.static(path.join(__dirname, 'public')));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();



app.use(nocache());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
      maxAge: 24 * 60 * 60 * 1000 
  }
}));


app.use(passport.initialize());
app.use(passport.session());


app.use('/user',userRoutes);
app.use('/admin',adminRoutes);



app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
}).on('error', (error) => {
  console.error('Server start error:', error);
});