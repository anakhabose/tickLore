const userSchema=require("../model/userModel");
const productSchema=require("../model/productModel");
const bcrypt=require("bcrypt");
const userhelper=require('../helpers/userhelper')
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const saltrounds=10;
let otpStore = {};  


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
                console.error('Google profile does not contain an email.');
                return res.render('user/login', { message: 'Google account has no email associated' });
            }

            
            let user = await userSchema.findOne({ email });
            if (!user) {
               
                user = await userSchema.create({
                    email,
                    name,
                    googleId,
                    status: true, 
                });
            }

            if (user.status === false) {
                console.log("Blocked user attempted Google login.");
                return res.render('user/login', { message: 'User is blocked' });
            }

            
            req.session.user = user;
            res.redirect('/user/home');
        } catch (error) {
            console.error("Google login error:", error);
            res.status(500).send("Internal server error");
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

        
        res.render('user/viewProducts', {
            product: currentProduct,
            recommendedProducts: recommendedProducts
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

            const { name,gender } = req.body;
           
            
            let profilePictureUrl = null;
            if (req.file) {
            
            profilePictureUrl = `/uploads/${req.file.filename}`;

            
            const oldProfilePicture = req.user.profileImage;
            if (oldProfilePicture && oldProfilePicture !== profilePictureUrl) {
                const oldImagePath = path.join(__dirname, '..', 'public', oldProfilePicture);
                if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
                }
            }
            }

        
            user.name = name || user.name;  
            user.gender = gender || user.gender;
        
            if (profilePictureUrl) {
            user.profileImage = profilePictureUrl;  
            }

        
            await user.save();

        
            return res.status(200).json({
            message: 'Profile updated successfully',
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Server error' });
        }
    },

     logout:(req,res)=>{
        try{
            req.session.destroy();
            res.redirect('/user/login');
        }catch{
            res.status(500).send('Error')
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

