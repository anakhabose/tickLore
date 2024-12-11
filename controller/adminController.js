const bcrypt = require('bcrypt');
const userModel = require('../model/userModel')
const adminModel = require('../model/adminModel');
const productModel = require('../model/productModel');
const categoryModel = require('../model/categoryModel');

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
            const admin = req.session.admin;
            if(!admin){
                return res.redirect('/admin/login')
            }
            res.render('admin/dashboard', { currentPath: '/admin/dashboard' });
        }catch{
            res.status(500).send('Error');
        }
    },
   
    loadCustomers: async (req, res) => {
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
        );

        
        const users = userDetails.map((detail) => ({
            name: detail.name,
            email: detail.email,
            _id: detail._id,
            status: detail.status,
        }));

       
        res.render('admin/customers', {
            users,
            currentPath: '/admin/customers', 
            search, 
        });
    } catch (error) {
        console.error('Error loading customers:', error);
        res.status(500).send('Server Error');
    }
},

    blockUser:async (req, res) => {
       const userId = req.params.id;

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


loadProducts: async (req, res) => {
   try {
        const admin = req.session.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }

        const search = req.query.search || ''; 

        const productDetails = await productModel.find(
            {
                deleted: false,
                productName: { $regex: search, $options: 'i' }, 
            }
        );

        const products = productDetails.map((product) => ({
            _id: product._id,
            name: product.productName,
            price: product.price,
            stock: product.stock,
            category: product.category,
            description: product.description,
            images: product.images
        }));

        res.render('admin/products', { 
            products: products, 
            currentPath: '/admin/products', 
            search 
        });
    } catch (error) {
        console.error('Error loading products:', error);
        res.status(500).send('Error loading products');
    }
},
    loadAddProducts:async(req,res)=>{
        try{
            const admin = req.session.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }
        const category = await categoryModel.find({status:true});
        res.render('admin/products-add',{category});
            
        }catch{
            res.status(500).send('Server Error');
        }
    },
    loadEditProducts:async(req,res)=>{
         try {
            const admin = req.session.admin;
            if (!admin) {
            return res.redirect('/admin/login');
            }
            const productId=req.params.id;
            const products= await productModel.findById(productId);

            if(!products){
                return res.status(404).send("Product not found")
            }
            res.render('admin/editProducts',{products});
        } catch (error) {
            console.error(error);
            res.status(500).send("Error Occured")
        }
    },
    
   loadCategory: async (req, res) => {
    try {
        const admin = req.session.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }

        const search = req.query.search || ''; 

        const categoryDetails = await categoryModel.find(
            {
                categoryName: { $regex: search, $options: 'i' },
            }
        );

        const category = categoryDetails.map((category) => ({
            _id: category._id,
            name: category.categoryName,
            status: category.status,
            images: category.images
        }));

        res.render('admin/category', { 
            category, 
            currentPath: '/admin/category',
            search 
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.status(500).send('Error loading category');
    }
},
     loadAddCategory:(req,res)=>{
        try{
            const admin = req.session.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }
            res.render('admin/addCategory');
            
        }catch{
            res.status(500).send('Server Error');
        }
    },
    loadEditCategory:async(req,res)=>{
         try {
            const admin = req.session.admin;
            if (!admin) {
            return res.redirect('/admin/login');
            }
            const categoryId=req.params.id;
           
            const category= await categoryModel.findById(categoryId);

            if(!category){
                return res.status(404).send("Category not found")
            }
            res.render('admin/editCategory',{category});
        } catch (error) {
            console.error(error);
            res.status(500).send("Error Occured")
        }
    },
    
     
    logout:(req,res)=>{
        try{
           req.session.destroy();
            res.redirect('/admin/login');
        }catch{
            res.status(500).send('Error')
        }
       
    }
}