const bcrypt = require('bcrypt');
const userModel = require('../model/userModel')
const adminModel = require('../model/adminModel');

module.exports ={
    loadLogin:(req,res)=>{
        try{
            res.render('admin/login');
        }catch{
            res.status(500).send('Server Error');
        }
    },
    login:async(req,res)=>{
        try{
            const {email,password} = req.body;
            console.log({email,password});
            const admin = await adminModel.findOne({email});
            
            if(!admin){
                return res.render('admin/login', {message: 'Invalid Credentials'})
            }

            const isMatch = await bcrypt.compare(password, admin.password);
            if(!isMatch){
                return res.render('admin/login', {message:'Invalid Credentials'})
            }
            req.session.admin = true;
            res.redirect('/admin/dashboard');
        }catch(error){
            console.log(error)
        }
    },
    loadDashboard:(req,res)=>{
        try{
            res.render('admin/dashboard', { currentPath: '/admin/dashboard' });
        }catch{
            res.status(500).send('Error');
        }
    },
   
    loadCustomers : async (req, res) => {
        try {
            const admin = req.session.admin;
            if (!admin) {
                return res.redirect('/admin/login');
            }
            const search = req.query.search || ''; 
            const userDetails = await userModel.find(
            {
                $or: [
                    { name: { $regex: search, $options: 'i' } }, 
                    { email: { $regex: search, $options: 'i' } } 
                ]
            },
            'name email status _id'
        );const users = userDetails.map((detail) => ({
            
                name: detail.name,
                email: detail.email,
                _id: detail._id,
                status: detail.status, 
            }));
            
            res.render('admin/customers', { users, currentPath: '/admin/customers', search}); 
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    },
    blockUser:async (req, res) => {
        try {
            await userModel.findByIdAndUpdate(req.params.id, { status: false });
            res.redirect('/admin/customers');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error blocking user');
        }
    },
    unblockUser:async (req, res) => {
        try {
            await userModel.findByIdAndUpdate(req.params.id, { status: true });
            res.redirect('/admin/customers');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error unblocking user');
        }
    },


    loadProducts:(req,res)=>{
        try{
            res.render('admin/products',{ currentPath: '/admin/products' })
        }catch{
            res.status(500).send('Error')
        }
    },
    loadEditProducts:(req,res)=>{
        try{
            if(req.session.admin){
                res.render('admin/products-edit');
            }
            
        }catch{
            res.status(500).send('Server Error');
        }
    },
    
    loadCategory:(req,res)=>{
        try{
            res.render('admin/category',{ currentPath: '/admin/category' })
        }catch{
            res.status(500).send('Error')
        }
    },
    logout:(req,res)=>{
        try{
            req.session.admin = null;
            res.redirect('/admin/login');
        }catch{
            res.status(500).send('Error')
        }
       
    }
}