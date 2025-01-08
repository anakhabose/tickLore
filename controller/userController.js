const userSchema=require("../model/userModel");
const productSchema=require("../model/productModel");
const addressSchema = require('../model/addressModel');
const bcrypt=require("bcrypt");
const userhelper=require('../helpers/userhelper')
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const saltrounds=10;
let otpStore = {};  
const PDFDocument = require('pdfkit');
const Order = require('../model/orderModel');


module.exports={

    loadHome:async (req,res)=>{
             try {
            const products= await productSchema.find({deleted:false})
            const Obj=products.map((data)=>{
                return{
                    _id: data._id,
                    name:data.productName,
                    description:data.description,
                    category:data.category,
                    brand:data.brand,
                    price:data.price,
                    images:data.images
                }
            })
            const user = req.session.user || null;
            res.render("user/home",{data:Obj,user})
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },
    
     
    registerUser:async (req,res)=>{
        try {
           const{name,email,password}=req.body
           console.log(`Name: ${name} , Email: ${email} , Password: ${password}`)

          
           const existingUser = await userSchema.findOne({ email: email });
           if (existingUser) {
               return res.status(400).json({status:false,message:"User already exists"})
           }

           const otp = crypto.randomInt(1000, 10000);
           otpStore[email] = { otp: otp, time: Date.now(), name, email, password };

          
           sendOtpEmail(email, otp);

         
           return res.status(200).json({status:true,message:"OTP sent successfully",email:email})
           
       } catch (error) {
           console.error("Error during registration:", error);
           res.status(500).json({status:false ,message:"An error occurred during registration"});
       }
   },
   
    loadSignup:(req,res)=>{
        try {
          res.render("user/signup")  
        } catch (error) {
            res.status(500).send("page not found")
        }
    },
    
    loadLogin:(req,res)=>{
        try {
            res.render("user/login")
        } catch (error) {
            res.status(500).send("error occured")
        }
    },
   
    login: async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userSchema.findOne({ email });

        if (!user) {
            return res.render('user/login', { message: 'User does not exist' });
        }

        if (user.status === false) {
            console.log('User is blocked');
            return res.render('user/login', { message: 'User is blocked' });
        }

        if (!user.password) {
            console.log("Google-authenticated user detected:", user);
            req.session.user = user;
            const products = await productSchema.find({deleted:false});
            const Obj = products.map((data) => ({
                _id: data._id,
                name: data.productName,
                description: data.description,
                category: data.category,
                brand: data.brand,
                price: data.price,
                images: data.images,
            }));

            return res.render('user/home', { data: Obj, user: req.session.user });
        }

        
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.user = user;
            const products = await productSchema.find({deleted:false});
            const Obj = products.map((data) => ({
                _id: data._id,
                name: data.productName,
                description: data.description,
                category: data.category,
                brand: data.brand,
                price: data.price,
                images: data.images,
            }));

            return res.render('user/home', { data: Obj, user: req.session.user });
        } else {
            return res.render('user/login', { message: 'Incorrect password' });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Internal server error");
    }
},

   gUser: async (req, res) => {
        try {
            console.log('Google profile:', req.user);
            const { googleId, name, email } = req.user;

            if (!email) {
                return res.redirect('/user/signup?error=No email associated with Google account');
            }

            // Check if user exists
            const existingUser = await userSchema.findOne({ email: email });
            
            if (existingUser) {
                // If user exists, log them in directly
                req.session.user = existingUser;
                return res.redirect('/user/home');
            }

            // If we get here, we know the user doesn't exist, so create new user
            const newUser = new userSchema({
                email,
                name,
                googleId,
                status: true
            });

            await newUser.save();
            req.session.user = newUser;
            return res.redirect('/user/home');

        } catch (error) {
            console.error("Google login error:", error);
            return res.redirect('/user/signup?error=Authentication failed');
        }
    },


  
    loadOtp:(req,res)=>{
        try {
            const {email} = req.query; 
            res.render('user/otp',{email}) 
            
        } catch (error) {
            console.log("otp page not found")
            res.status(500).json({status: false,message: "Error loading OTP verification page"});
            
        }
    },

    verifyOtp: async (req, res) => {
      try{  
        const { email, otp } = req.body;

        console.log("verify otp :" +otp)
        if (!otpStore[email]) {
            return res.status(400).json({ status: false, message: "No OTP request found for this email" });
        }


        if (otpStore[email] && otpStore[email].otp == otp) {
            const timeElapsed = Date.now() - otpStore[email].time;
            if (timeElapsed < 1 * 60 * 1000) {
               
                const { name, password } = otpStore[email];
                const hashedPassword = await bcrypt.hash(password, saltrounds);
                const newUser = new userSchema({ name, email, password: hashedPassword, status: true });
                await newUser.save();

              
                delete otpStore[email];

    
                return res.status(200).json({status:true,message:"OTP verified successfully,user created"});
            } else {
                return res.status(400).json({ status: false, message: "OTP expired. Please request a new one." });
            }
        } else {
            res.status(400).json({ status: false, message: "Invalid OTP" });
        }
     } catch(error){
            console.error("Error during OTP verification:", error);
            res.status(500).json({status:false,message: "An error occurred during OTP verification"});
     }
    },

  
    resendOtp: (req, res) => {
      try{  
        const { email } = req.body;
        const currentTime = Date.now();
        const resendCooldown = 60 * 1000;  

        if (otpStore[email]) {
            const timeElapsed = currentTime - otpStore[email].time;
            if (timeElapsed < resendCooldown) {
                const remainingTime = Math.ceil((resendCooldown - timeElapsed) / 1000);
                res.status(400).json({ status: false, message: `Please wait ${remainingTime} seconds before resending OTP.` });  
            }
        }

        const otp = crypto.randomInt(1000, 10000);
        otpStore[email] = { ...otpStore[email],otp: otp, time: currentTime };
        
        sendOtpEmail(email, otp);

        res.status(200).json({ status: true, message: "OTP resent successfully." });
        } catch (error) {
            console.error("Error resending OTP:", error);
            res.status(500).json({
                status: false,
                message: "Error resending OTP"
            });
        }
    },  
    
    loadViewProducts: async (req, res) => {
        const productId = req.params.id;
        
        const currentProduct = await productSchema.findById(productId);
        
      const recommendedProducts = await productSchema.find({
            _id: { $ne: productId },
            deleted: false
        }).limit(4);

         const user = req.session.user || null;
        
        res.render('user/viewProducts', {
            product: currentProduct,
            recommendedProducts: recommendedProducts,
            user
        });
    },
    loadProfile : async (req, res) => {
        try {
            
            const userSession = req.session.user;

            if (!userSession) {
                return res.redirect('/user/login'); 
            }

        
            const userData = await userSchema.findOne({ email: userSession.email });

            if (!userData) {
                return res.redirect('/user/login'); 
            }

            res.render('user/profile', { users: userData });
        } catch (error) {
            console.error('Error in loadProfile:', error);
            res.status(500).send('Error Occurred');
        }
    },
    editProfile:async(req,res)=>{
            
        try {
            
            const user = await userSchema.findById(req.session.user._id);
            if (!user) {
            return res.status(404).json({ message: 'User not found' });
            }

            const { name,gender,phoneNumber} = req.body;
           
            const profileImage = req.file;
         

            if (req.file) {
                user.profileImage = req.file.path || req.file.url;
            }
            
            user.name = name || user.name;  
            user.gender = gender || user.gender;
            user.phoneNumber = phoneNumber || user.phoneNumber;
    
        
            await user.save();

        
            return res.status(200).json({
            message: 'Profile updated successfully',
              user: {
                name: user.name,
                gender: user.gender,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage
            }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Server error' });
        }
    },
    loadAddress:async(req,res)=>{
          try {
        const userSession = req.session.user;
        
        if (!userSession) {
            return res.redirect('/user/login');
        }
        
        const userData = await userSchema.findOne({ email: userSession.email });
        
        if (!userData) {
            return res.redirect('/user/login');
        }

        
        const userAddresses = await addressSchema.find({ userId: userData._id });
        
        res.render('user/address', {
            users: userData,
            currentPath: '/user/address',
            addresses: userAddresses  
        });
    } catch (error) {
        console.error('Error in loading address page:', error);
        res.status(500).send('Error Occurred');
    }
    },
    loadCart:async(req,res)=>{
        try {
     
        const productId = req.params.id;

        const productDetails = await productSchema.findById(productId);
            
      
        if (!productDetails) {
            return res.status(404).send('Product not found');
        }

        
        res.render('user/cart', { product: productDetails });
    } catch (error) {
        console.error('Error in loading Cart:', error);
        res.status(500).send('Error Occurred');
    }
    },
     loadChangePassword : async (req, res) => {
        try {
            
            const userSession = req.session.user;

            if (!userSession) {
                return res.redirect('/user/login'); 
            }

        
            const userData = await userSchema.findOne({ email: userSession.email });

            if (!userData) {
                return res.redirect('/user/login'); 
            }

            res.render('user/changePassword', { users: userData });
        } catch (error) {
            console.error('Error in loadProfile:', error);
            res.status(500).send('Error Occurred');
        }
    },
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            
         
            const userId = req.session.user._id;
            
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

          
            const user = await userSchema.findById(userId);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

          
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

          
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await userSchema.findByIdAndUpdate(userId, { password: hashedPassword });

            res.status(200).json({ message: 'Password updated successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

     logout:(req,res)=>{
        try{
            req.session.destroy();
            res.redirect('/user/login');
        }catch{
            res.status(500).send('Error')
        }
       
    },

    downloadInvoice: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const order = await Order.findById(orderId)
                .populate('items.product')
                .populate('address');
            
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
            doc.pipe(res);

            // Add styled header
            doc.rect(0, 0, doc.page.width, 150).fill('#f8f9fa');
            
            // Company logo
            doc.image('public/images/logo.png', 50, 45, { width: 50 });
            
            // Company details
            doc.font('Helvetica-Bold')
                .fontSize(20)
                .fillColor('#2d3748')
                .text('INVOICE', 50, 45, { align: 'right' });
            
            doc.fontSize(10)
                .fillColor('#4a5568')
                .text('tickLore', 50, 70, { align: 'right' })
                .text('123 Business Street', 50, 85, { align: 'right' })
                .text('Kochi, Kerala, India', 50, 100, { align: 'right' })
                .text('Phone: +91 1234567890', 50, 115, { align: 'right' });

            // Invoice details
            doc.font('Helvetica')
                .fontSize(10)
                .text(`Invoice Number: INV-${orderId.slice(-6)}`, 50, 180)
                .text(`Date: ${new Date().toLocaleDateString()}`, 50, 195)
                .text(`Order ID: ${order._id}`, 50, 210);

            // Billing details
            doc.font('Helvetica-Bold')
                .fontSize(14)
                .text('Bill To:', 50, 250);
            
            doc.font('Helvetica')
                .fontSize(10)
                .text(order.address.name, 50, 270)
                .text(order.address.addressLine1, 50, 285)
                .text(`${order.address.city}, ${order.address.state}, ${order.address.pincode}`, 50, 300)
                .text(`Phone: ${order.address.phoneNumber}`, 50, 315);

            // Items table header
            const tableTop = 380;
            doc.font('Helvetica-Bold')
                .rect(50, tableTop, 500, 20)
                .fill('#f1f5f9')
                .fillColor('#000')
                .text('Item', 60, tableTop + 5)
                .text('Qty', 280, tableTop + 5)
                .text('Price', 350, tableTop + 5)
                .text('Total', 420, tableTop + 5);

            // Items
            let position = tableTop + 30;
            order.items.forEach(item => {
                doc.font('Helvetica')
                    .text(item.product.name, 60, position)
                    .text(item.quantity.toString(), 280, position)
                    .text(`₹${item.product.price}`, 350, position)
                    .text(`₹${item.subtotal}`, 420, position);
                position += 20;
            });

            // Draw line
            doc.strokeColor('#e2e8f0')
                .lineWidth(1)
                .moveTo(50, position + 10)
                .lineTo(550, position + 10)
                .stroke();

            // Total amount
            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text('Total Amount:', 350, position + 30)
                .text(`₹${order.total}`, 420, position + 30);

            // Payment details
            doc.font('Helvetica')
                .fontSize(10)
                .text(`Payment Method: ${order.paymentMethod}`, 50, position + 60)
                .text(`Payment Status: Paid`, 50, position + 75);

            // Footer
            const footerTop = doc.page.height - 100;
            doc.rect(0, footerTop, doc.page.width, 100).fill('#f8f9fa');
            
            doc.fillColor('#4a5568')
                .fontSize(8)
                .text('Thank you for shopping with us!', 50, footerTop + 20, { align: 'center' })
                .text('For any queries, please contact support@ticklore.com', 50, footerTop + 35, { align: 'center' })
                .text('This is a computer generated invoice and does not require a signature.', 50, footerTop + 50, { align: 'center' });

            doc.end();

        } catch (error) {
            console.error('Error generating invoice:', error);
            res.status(500).json({ message: 'Failed to generate invoice' });
        }
    },

    loadForgotPassword: (req, res) => {
        try {
            res.render('user/forgotEmail');
        } catch (error) {
            res.status(500).send("Error occurred");
        }
    },

    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            
           
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    status: false, 
                    message: "Please enter a valid email address" 
                });
            }

            
            const user = await userSchema.findOne({ email });
            if (!user) {
                return res.status(404).json({ 
                    status: false, 
                    message: "No account found with this email address" 
                });
            }

          
            const otp = crypto.randomInt(1000, 10000);
            otpStore[email] = { 
                otp: otp, 
                time: Date.now(), 
                for: 'password-reset' 
            };

       
            sendOtpEmail(email, otp);

            return res.status(200).json({
                status: true,
                message: "OTP sent successfully",
                email: email
            });

        } catch (error) {
            console.error("Error in forgot password:", error);
            res.status(500).json({
                status: false,
                message: "An error occurred"
            });
        }
    },

    loadResetPassword: (req, res) => {
        try {
            const { email } = req.query;
            if (!email) {
                return res.redirect('/user/forgotEmail');
            }
            res.render('user/newPassword', { email });
        } catch (error) {
            console.error('Error loading reset password page:', error);
            res.status(500).send("Error occurred");
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { email, newPassword } = req.body;
            
            const user = await userSchema.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "User not found"
                });
            }

          
            const hashedPassword = await bcrypt.hash(newPassword, saltrounds);
            
          
            await userSchema.updateOne(
                { email: email },
                { $set: { password: hashedPassword } }
            );

            return res.status(200).json({
                status: true,
                message: "Password updated successfully"
            });

        } catch (error) {
            console.error("Error in reset password:", error);
            res.status(500).json({
                status: false,
                message: "An error occurred"
            });
        }
    },

    loadForgotOtp: async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) {
                return res.redirect('/user/forgotEmail');
            }
            res.render('user/forgotOtp', { email });
        } catch (error) {
            console.error('Error loading forgot OTP page:', error);
            res.status(500).send("Error occurred");
        }
    },

    verifyForgotOtp: async (req, res) => {
        try {
            const { email, otp } = req.body;

            
            if (!otpStore[email]) {
                return res.status(400).json({
                    status: false,
                    message: "No OTP request found for this email"
                });
            }

            
            if (otpStore[email].otp == otp) {
                const timeElapsed = Date.now() - otpStore[email].time;
                
               
                if (timeElapsed > 1 * 60 * 1000) {
                    return res.status(400).json({
                        status: false,
                        message: "OTP has expired. Please request a new one."
                    });
                }

               
                otpStore[email].verified = true;

                return res.status(200).json({
                    status: true,
                    message: "OTP verified successfully"
                });
            } else {
                return res.status(400).json({
                    status: false,
                    message: "Invalid OTP"
                });
            }
        } catch (error) {
            console.error('Error verifying forgot password OTP:', error);
            return res.status(500).json({
                status: false,
                message: "An error occurred while verifying OTP"
            });
        }
    }
};


function sendOtpEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL, 
            pass: process.env.PASS,
        }
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP code is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("error sending email: ",error);
        } else {
            console.log('OTP sent: ', otp );
        }
    });
    
}

