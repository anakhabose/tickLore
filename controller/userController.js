const userSchema=require("../model/userModel");
const bcrypt=require("bcrypt");
const userhelper=require('../helpers/userhelper')
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const saltrounds=10;
let otpStore = {};  


module.exports={
    loadHome:(req,res)=>{
        try {
            res.render("user/home")  
            }catch (error) {
            res.status(500).send("page not found")
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
    
            if (!user.password) {
                console.error("User has no password stored:", user);
                return res.render('user/login', { message: 'User has no password set' });
            }
    
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = true;
                return res.redirect('/user/home');
            } else {
                return res.render('user/login', { message: 'Incorrect password' });
            }
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).send("Internal server error");
        }
    },
    
 

   
   
    loginUser:(req,res)=>{
        try {
            const { email, password } = req.body
            console.log(`Email: ${email}, Password: ${password}`);
        } catch (error) {
            res.status(500).send("error occured")
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
   loadDashboard: (req, res) => {
    try {
        res.render('dashboard', { user: req.user });
    } catch (error) {
        res.status(500).send("Error loading dashboard");
    }
},

    
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

