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
hbs.registerHelper('multiply', (a, b) => (a * b).toFixed(2)); 
hbs.registerHelper('multiply', function(a, b) {
    return a * b;
}); 

hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});
hbs.registerHelper('getFirstImage', (images) => {
    return images && images.length > 0 ? images[0] : ''; 
});  
hbs.registerHelper('gte', function (value1, value2) {
    return value1 >= value2;
});
hbs.registerHelper('lte', function (value1, value2) {
    return value1 <= value2;
});
hbs.registerHelper('formatDate', function(date) {
    if (!date) return '--';
    return new Date(date).toLocaleDateString();
});

hbs.registerHelper('eq', function(a, b) {
    return a === b;
});
hbs.handlebars.registerHelper('add', function(value1, value2) {
    return value1 + value2;
});
hbs.handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});
hbs.registerHelper('calculateDiscount', function(originalPrice, discountedPrice) {
    if (!originalPrice || !discountedPrice) return 0;
    const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
    return Math.round(discount); // Rounds to nearest integer
});
hbs.registerHelper('add', function(a, b) {
    return a + b;
});
hbs.registerHelper('subtract', (a, b) => a - b);
hbs.registerHelper('divide', (a, b) => a / b);
hbs.registerHelper('multiply', (a, b) => a * b);
hbs.registerHelper('round', (num) => Math.round(num));
hbs.registerHelper('range', function(start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
        result.push(i);
    }
    return result;
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

app.use((req, res, next) => {
    res.status(404).render('404', { msg: 'Page Not Found' });
});



app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
}).on('error', (error) => {
  console.error('Server start error:', error);
});