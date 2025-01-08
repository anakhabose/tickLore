const bcrypt = require('bcrypt');
const userModel = require('../model/userModel')
const adminModel = require('../model/adminModel');
const productModel = require('../model/productModel');
const categoryModel = require('../model/categoryModel');
const orderModel = require('../model/orderModel');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

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
    loadDashboard: async (req, res) => {
        try {
            const admin = req.session.admin;
            if (!admin) {
                return res.redirect('/admin/login');
            }

        
            const orders = await orderModel.find({
                status: { $nin: ['Cancelled', 'Returned'] }
            }).populate('userId', 'name')
              .populate('items.product', 'productName price');

    
            const totalOrders = orders.length;
            
     
            const processedOrders = orders.map(order => {
            
                const originalTotal = order.items.reduce((sum, item) => {
                    return sum + (item.product.price * item.quantity);
                }, 0);

             
                const discountAmount = originalTotal - order.total;

                return {
                    ...order.toObject(),
                    originalAmount: originalTotal,
                    offerDiscount: discountAmount,
                    couponDiscount: 0,
                    finalAmount: order.total
                };
            });

           const summary = processedOrders.reduce((acc, order) => ({
                totalOriginal: acc.totalOriginal + order.originalAmount,
                totalOfferDiscount: acc.totalOfferDiscount + order.offerDiscount,
                totalCouponDiscount: acc.totalCouponDiscount + order.couponDiscount,
                totalNet: acc.totalNet + order.finalAmount
            }), {
                totalOriginal: 0,
                totalOfferDiscount: 0,
                totalCouponDiscount: 0,
                totalNet: 0
            });

     
            const totalRevenue = summary.totalOriginal; 
            const totalDiscount = summary.totalOfferDiscount + summary.totalCouponDiscount;
            const netRevenue = summary.totalNet;

      
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayOrders = processedOrders.filter(order => order.createdAt >= today);

           
            const statusCounts = processedOrders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {});

            console.log('Final statistics:', {
                totalOrders,
                totalRevenue,
                todayOrders: todayOrders.length,
                statusCounts
            });

            res.render('admin/dashboard', { 
                currentPath: '/admin/dashboard',
                orders: processedOrders,
                summary,
                statistics: {
                    totalOrders,
                    totalRevenue,    
                    totalDiscount,   
                    netRevenue,      
                    todayOrders: todayOrders.length,
                    statusCounts
                }
            });
        } catch (error) {
            console.error('Dashboard Error:', error);
            res.status(500).send('Error loading dashboard');
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

        const page = parseInt(req.query.page) || 1;
        const limit = 6; 
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

       
        const searchQuery = {
            deleted: false,
            productName: { $regex: search, $options: 'i' }
        };

   
        const totalProducts = await productModel.countDocuments(searchQuery);
        
     
        const productDetails = await productModel.find(searchQuery)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const products = productDetails.map((product) => ({
            _id: product._id,
            name: product.productName,
            price: product.price,
            stock: product.stock,
            category: product.category,
            description: product.description,
            images: product.images
        }));

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('admin/products', { 
            products,
            search,
            currentPage: page,
            prevPage: page - 1,
            nextPage: page + 1,
            hasPrevPage: page > 1,
            hasNextPage: skip + limit < totalProducts,
            totalProducts,
            totalPages,
            startIndex: skip + 1,
            endIndex: Math.min(skip + limit, totalProducts),
            currentPath: '/admin/products'
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
loadOrders: async (req, res) => {
    try {
        const admin = req.session.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }

        // Pagination setup
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of orders per page
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalOrders = await orderModel.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        // Generate array of page numbers (show 5 pages around current page)
        const pages = [];
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Fetch orders with pagination
        const orders = await orderModel.find()
            .populate({
                path: 'userId',
                select: 'name email'
            })
            .populate({
                path: 'items.product',
                select: 'productName price images'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log('Orders data:', JSON.stringify(orders, null, 2));

        res.render('admin/orders', {
            currentPath: '/admin/orders',
            orders,
            pagination: {
                page,
                totalPages,
                pages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                prevPage: page - 1,
                nextPage: page + 1,
                startIndex: skip + 1,
                endIndex: Math.min(skip + limit, totalOrders),
                totalOrders
            }
        });
    } catch (error) {
        console.error('Error loading orders:', error.stack);
        res.status(500).send('Error loading orders');
    }
},
loadViewDetailAdmin: async (req, res) => {
    try {
        const admin = req.session.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }

        const orderId = req.params.id;
        const order = await orderModel.findById(orderId)
            .populate({
                path: 'items.product',
                select: 'productName price images'
            });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        console.log('Order details:', JSON.stringify(order, null, 2));

        res.render('admin/viewDetailAdmin', {
            order,
            currentPath: '/admin/orders'
        });
    } catch (error) {
        console.error('Error loading order details:', error.stack);
        res.status(500).send('Error loading order details');
    }
},
    logout:(req,res)=>{
        try{
           req.session.destroy();
            res.redirect('/admin/login');
        }catch{
            res.status(500).send('Error')
        }
       
    },
    updateOrderStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            const updateData = {
                status,
                [`${status.toLowerCase()}At`]: new Date()
            };

            const order = await orderModel.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            );

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            res.json({ 
                success: true, 
                message: `Order marked as ${status}`,
                order 
            });

        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error updating order status',
                error: error.message
            });
        }
    },
   

    filterOrders: async (req, res) => {
        try {
            const { filterType, startDate, endDate } = req.body;
            let query = {
                status: { $nin: ['Cancelled', 'Returned'] }
            };

            
            if (filterType) {
                const now = new Date();
                switch (filterType) {
                    case 'day':
                        query.createdAt = {
                            $gte: new Date(now.setHours(0,0,0,0)),
                            $lt: new Date(now.setHours(23,59,59,999))
                        };
                        break;
                    case 'week':
                        const weekStart = new Date(now);
                        weekStart.setDate(now.getDate() - now.getDay());
                        query.createdAt = {
                            $gte: new Date(weekStart.setHours(0,0,0,0)),
                            $lt: new Date()
                        };
                        break;
                    case 'month':
                        query.createdAt = {
                            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                        };
                        break;
                }
            } else if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lt: new Date(new Date(endDate).setHours(23,59,59,999))
                };
            }

            const orders = await orderModel.find(query)
                .populate('userId', 'name')
                .populate('items.product', 'productName price')
                .sort({ createdAt: -1 });

            const processedOrders = orders.map(order => {
                const originalAmount = order.items.reduce((sum, item) => 
                    sum + (item.product ? item.product.price * item.quantity : 0), 0);
                const totalDiscount = originalAmount - order.total;

                return {
                    _id: order._id,
                    createdAt: order.createdAt,
                    userId: order.userId,
                    originalAmount,
                    offerDiscount: totalDiscount,
                    couponDiscount: 0, 
                    finalAmount: order.total
                };
            });

           
            const summary = processedOrders.reduce((acc, order) => ({
                totalOriginal: acc.totalOriginal + order.originalAmount,
                totalOfferDiscount: acc.totalOfferDiscount + order.offerDiscount,
                totalCouponDiscount: acc.totalCouponDiscount + order.couponDiscount,
                totalNet: acc.totalNet + order.finalAmount
            }), {
                totalOriginal: 0,
                totalOfferDiscount: 0,
                totalCouponDiscount: 0,
                totalNet: 0
            });

            res.json({ orders: processedOrders, summary });
        } catch (error) {
            console.error("Filter Error:", error);
            res.status(500).json({ error: "Error occurred while filtering orders" });
        }
    },

    getSalesData: async (req, res) => {
        try {
            const { period = 'weekly' } = req.query;
            const currentDate = new Date();
            let startDate;
            let dateFormat;

         
            switch (period) {
                case 'weekly':
                    startDate = new Date(currentDate);
                    startDate.setDate(currentDate.getDate() - 6); 
                    dateFormat = { weekday: 'short' };
                    break;
                case 'monthly':
                    startDate = new Date(currentDate);
                    startDate.setDate(1);
                    dateFormat = { day: 'numeric' };
                    break;
                case 'yearly':
                    startDate = new Date(currentDate);
                    startDate.setMonth(currentDate.getMonth() - 11); 
                    dateFormat = { month: 'short' };
                    break;
            }

           
            const orders = await orderModel.find({
                createdAt: { $gte: startDate, $lte: currentDate },
                status: { $nin: ['Cancelled', 'Returned'] }  
            }).sort('createdAt');

            
            const salesData = processOrdersForChart(orders, period, startDate, currentDate);
            
            console.log('Processed sales data:', salesData); 
            res.json(salesData);

        } catch (error) {
            console.error('Error in getSalesData:', error);
            res.status(500).json({ error: 'Failed to fetch sales data' });
        }
    },

    exportSalesReportPDF: async (req, res) => {
        try {
            console.log('Starting PDF generation...');
            
           
            const doc = new PDFDocument();
            console.log('PDF document created');
            
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
            
           
            doc.pipe(res);
            
         
            console.log('Fetching orders...');
            const orders = await orderModel.find({
                status: { $nin: ['Cancelled', 'Returned'] }
            })
            .populate('userId', 'name')
            .populate('items.product', 'productName price')
            .lean();
            
            console.log(`Found ${orders.length} orders`);

            doc.fontSize(20)
               .text('Sales Report', { align: 'center' })
               .moveDown();

          
            doc.fontSize(12);
            let y = 150;
            
          
            doc.text('Date', 50, y);
            doc.text('Order ID', 150, y);
            doc.text('Customer', 250, y);
            doc.text('Amount', 400, y);
            
            y += 20;

         
            let totalAmount = 0;
            
            orders.forEach(order => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                
                const date = new Date(order.createdAt).toLocaleDateString();
                const orderId = order._id.toString().slice(-6);
                const customerName = order.userId ? order.userId.name : 'N/A';
                const amount = order.total || 0;
                
                doc.text(date, 50, y);
                doc.text(orderId, 150, y);
                doc.text(customerName, 250, y);
                doc.text(`₹${amount.toFixed(2)}`, 400, y);
                
                totalAmount += amount;
                y += 20;
            });

          
            doc.moveDown()
               .fontSize(14)
               .text(`Total Revenue: ₹${totalAmount.toFixed(2)}`, { align: 'right' });

            console.log('Finalizing PDF...');
            doc.end();
            console.log('PDF generation completed');

        } catch (error) {
            console.error('PDF Generation Error:', error);
            return res.status(500).json({ 
                error: 'Failed to generate PDF',
                details: error.message,
                stack: error.stack
            });
        }
    },

    exportSalesReportExcel: async (req, res) => {
        try {
            const orders = await orderModel.find({
                status: { $nin: ['Cancelled', 'Returned'] }
            }).populate('userId', 'name')
              .populate('items.product', 'productName price');

            const processedOrders = orders.map(order => {
               
                const originalAmount = order.items.reduce((sum, item) => {
                    return sum + (item.product ? (item.product.price * item.quantity) : 0);
                }, 0);

                
                const totalDiscount = Math.max(0, originalAmount - order.total);

                return {
                    ...order.toObject(),
                    originalAmount,   
                    totalDiscount,     
                    finalAmount: order.total 
                };
            });

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

   
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Order ID', key: 'orderId', width: 30 },
                { header: 'Customer', key: 'customer', width: 20 },
                { header: 'Original Price (₹)', key: 'original', width: 15 },
                { header: 'Discount (₹)', key: 'discount', width: 15 },
                { header: 'Net Amount (₹)', key: 'net', width: 15 }
            ];

            processedOrders.forEach(order => {
                worksheet.addRow({
                    date: new Date(order.createdAt).toLocaleDateString(),
                    orderId: order._id.toString(),
                    customer: order.userId?.name || 'N/A',
                    original: order.originalAmount,    
                    discount: order.totalDiscount,    
                    net: order.finalAmount            
                });
            });

           
            const dataEndRow = processedOrders.length + 1;
            worksheet.addRow([]); 
       
            const summaryRow = worksheet.addRow({
                customer: 'TOTAL',
                original: {
                    formula: `SUM(D2:D${dataEndRow})`
                },
                discount: {
                    formula: `SUM(E2:E${dataEndRow})`
                },
                net: {
                    formula: `SUM(F2:F${dataEndRow})`
                }
            });

            worksheet.getColumn('original').numFmt = '₹#,##0.00';
            worksheet.getColumn('discount').numFmt = '₹#,##0.00';
            worksheet.getColumn('net').numFmt = '₹#,##0.00';

          
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Excel Export Error:', error);
            res.status(500).send('Error generating Excel file');
        }
    }
}


function processOrdersForChart(orders, period, startDate, currentDate) {
    const salesMap = new Map();
    
    
    let currentDatePointer = new Date(startDate);
    while (currentDatePointer <= currentDate) {
        let key;
        switch (period) {
            case 'weekly':
                key = currentDatePointer.toLocaleDateString('en-US', { weekday: 'short' });
                break;
            case 'monthly':
                key = currentDatePointer.getDate().toString();
                break;
            case 'yearly':
                key = currentDatePointer.toLocaleDateString('en-US', { month: 'short' });
                break;
        }
        salesMap.set(key, 0);
        
     
        switch (period) {
            case 'weekly':
            case 'monthly':
                currentDatePointer.setDate(currentDatePointer.getDate() + 1);
                break;
            case 'yearly':
                currentDatePointer.setMonth(currentDatePointer.getMonth() + 1);
                break;
        }
    }

    orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        let key;
        switch (period) {
            case 'weekly':
                key = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
                break;
            case 'monthly':
                key = orderDate.getDate().toString();
                break;
            case 'yearly':
                key = orderDate.toLocaleDateString('en-US', { month: 'short' });
                break;
        }
        
        if (salesMap.has(key)) {
            salesMap.set(key, salesMap.get(key) + order.total);
        }
    });

   
    const labels = Array.from(salesMap.keys());
    const values = Array.from(salesMap.values());

    return { labels, values };
}

