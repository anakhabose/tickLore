const offerSchema = require('../model/offerModel');
const Product = require('../model/productModel');
const Category = require('../model/categoryModel');
const mongoose = require('mongoose');

module.exports = {
    loadOffers: async (req, res) => {
        try {
          
            const admin = req.session.admin;
            if (!admin) {
                return res.redirect('/admin/login');
            }

            const search = req.query.search || '';

            const searchQuery = {
                offerTitle: { $regex: search, $options: 'i' }
            };

         
            const offers = await offerSchema.find(searchQuery)
                .populate('productId', 'name')
                .populate('categoryId', 'name')
                .sort({ createdAt: -1 });

            res.render('admin/offers', { 
                offers,
                search,
                currentPath: '/admin/offers'
            });

        } catch (error) {
            console.error('Error loading offers:', error);
            res.status(500).send('Error loading offers');
        }
    },
    addOfferPage: async (req, res) => {
        try {
   
            const admin = req.session.admin;
            if (!admin) {
                return res.redirect('/admin/login');
            }

       
            const products = await Product.find({ deleted: false })
                .select('productName price');
            
           
            const categories = await Category.find({ status: true })
                .select('categoryName'); 
            
            console.log('Products:', products); 
            console.log('Categories:', categories); 
            
            res.render('admin/addOffer', {
                admin: true,
                products,
                categories,
                currentPath: '/admin/offers'
            });

        } catch (error) {
            console.error('Error loading add offer page:', error);
            res.status(500).send('Server Error');
        }
    },
    addOffer: async (req, res) => {
        try {
            const {
                offerTitle,
                offerType,
                productId,
                categoryId,
                discountValue,
                minimumPrice,
                startDate,
                endDate
            } = req.body;

           
            if (!offerTitle || !offerType || !discountValue || !startDate || !endDate) {
                return res.status(400).json({
                    status: false,
                    message: "All required fields must be filled"
                });
            }

            
            if (new Date(startDate) >= new Date(endDate)) {
                return res.status(400).json({
                    status: false,
                    message: "End date must be after start date"
                });
            }

            const offer = new offerSchema({
                offerTitle,
                offerType,
                ...(offerType === 'product' ? { productId } : { categoryId }),
                discountValue: Number(discountValue),
                minimumPrice: Number(minimumPrice) || 0,
                startDate,
                endDate,
                isActive: true
            });

            await offer.save();

            if (offerType === 'product') {
              
                const product = await Product.findById(productId);
                if (!product) {
                    return res.status(404).json({
                        status: false,
                        message: "Product not found"
                    });
                }

                const discount = (product.price * Number(discountValue)) / 100;
                const discountedPrice = product.price - discount;

               
                await Product.findByIdAndUpdate(
                    productId,
                    { 
                        offer: offer._id,
                        discountedPrice: discountedPrice
                    }
                );

            } else if (offerType === 'category') {
           
                const category = await Category.findById(categoryId);
                if (!category) {
                    return res.status(404).json({
                        status: false,
                        message: "Category not found"
                    });
                }

                await Category.findByIdAndUpdate(
                    categoryId,
                    { offer: offer._id }
                );

                const products = await Product.find({ category: categoryId });
                
                for (const product of products) {
                    const discount = (product.price * Number(discountValue)) / 100;
                    const discountedPrice = product.price - discount;
                    
                    await Product.findByIdAndUpdate(
                        product._id,
                        { 
                            offer: offer._id,
                            discountedPrice: discountedPrice 
                        }
                    );
                }
            }

            res.status(200).json({
                status: true,
                message: "Offer added successfully"
            });

        } catch (error) {
            console.error('Error adding offer:', error);
            res.status(500).json({
                status: false,
                message: "Error occurred while adding offer"
            });
        }
    },
    loadEditOffer: async (req, res) => {
        try {
            const offerId = req.params.id;
        
            const offer = await offerSchema.findById(offerId)
                .populate('productId')
                .populate('categoryId');

            if (!offer) {
                return res.status(404).send('Offer not found');
            }

            const products = await Product.find({ deleted: false })
                .select('productName price');
            
            const categories = await Category.find({ status: true })
                .select('categoryName');

            const formattedOffer = {
                _id: offer._id,
                offerTitle: offer.offerTitle,
                offerType: offer.offerType,
                productId: offer.productId?._id,
                categoryId: offer.categoryId?._id,
                discountValue: offer.discountValue,
                startDate: new Date(offer.startDate).toISOString().slice(0, 10),
                endDate: new Date(offer.endDate).toISOString().slice(0, 10)
            };

            console.log('Formatted Offer:', formattedOffer); 

            res.render('admin/editOffers', {
                offer: formattedOffer,
                products,
                categories,
                admin: true,
                currentPath: '/admin/offers'
            });

        } catch (error) {
            console.error('Error in loadEditOffer:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    editOffer: async (req, res) => {
        try {
            const offerId = req.params.id;
            const {
                offerTitle,
                offerType,
                productId,
                categoryId,
                discountValue,
                minimumPrice,
                startDate,
                endDate
            } = req.body;

            if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid offer ID"
                });
            }

         
            if (!offerTitle || !offerType || !discountValue || !startDate || !endDate) {
                return res.status(400).json({
                    status: false,
                    message: "All required fields must be filled"
                });
            }

         
            if (offerType === 'product' && !mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid product ID"
                });
            }

            if (offerType === 'category' && !mongoose.Types.ObjectId.isValid(categoryId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid category ID"
                });
            }

       
            const updatedOffer = await offerSchema.findByIdAndUpdate(
                offerId,
                {
                    offerTitle,
                    offerType,
                    ...(offerType === 'product' ? { productId: mongoose.Types.ObjectId(productId) } : { categoryId: mongoose.Types.ObjectId(categoryId) }),
                    discountValue: Number(discountValue),
                    minimumPrice: Number(minimumPrice) || 0,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                },
                { new: true }
            );

            if (!updatedOffer) {
                return res.status(404).json({
                    status: false,
                    message: "Offer not found"
                });
            }

        
            if (offerType === 'product') {
                await Product.findByIdAndUpdate(
                    productId,
                    { 
                        offer: offerId,
                        discountedPrice: calculateDiscountedPrice(product.price, discountValue)
                    }
                );
            } else if (offerType === 'category') {
                await Category.findByIdAndUpdate(
                    categoryId,
                    { offer: offerId }
                );

                const products = await Product.find({ category: categoryId });
                for (const product of products) {
                    await Product.findByIdAndUpdate(
                        product._id,
                        { 
                            offer: offerId,
                            discountedPrice: calculateDiscountedPrice(product.price, discountValue)
                        }
                    );
                }
            }

            res.status(200).json({
                status: true,
                message: "Offer updated successfully"
            });

        } catch (error) {
            console.error('Error updating offer:', error);
            res.status(500).json({
                status: false,
                message: "Error occurred while updating offer"
            });
        }
    },
    blockOffer: async (req, res) => {
        try {
            const offerId = req.params.id;
            const offer = await offerSchema.findById(offerId);
            
            if (!offer) {
                return res.status(404).json({
                    status: false,
                    message: "Offer not found"
                });
            }

           
            offer.isActive = false;
            await offer.save();

            
            if (offer.offerType === 'product' && offer.productId) {
                await Product.findByIdAndUpdate(offer.productId, {
                    $unset: { offer: 1, discountedPrice: 1 }
                });
            }

         
            if (offer.offerType === 'category' && offer.categoryId) {
                await Category.findByIdAndUpdate(offer.categoryId, {
                    $unset: { offer: 1 }
                });

                await Product.updateMany(
                    { category: offer.categoryId },
                    { $unset: { offer: 1, discountedPrice: 1 } }
                );
            }

            res.status(200).json({
                status: true,
                message: "Offer blocked successfully"
            });

        } catch (error) {
            console.error('Error blocking offer:', error);
            res.status(500).json({
                status: false,
                message: "Error occurred while blocking offer"
            });
        }
    },
    unblockOffer: async (req, res) => {
        try {
            const offerId = req.params.id;
            const offer = await offerSchema.findById(offerId);
            
            if (!offer) {
                return res.status(404).json({
                    status: false,
                    message: "Offer not found"
                });
            }

            offer.isActive = true;
            await offer.save();

            
            if (offer.offerType === 'product' && offer.productId) {
                const product = await Product.findById(offer.productId);
                if (product) {
                    const discountedPrice = calculateDiscountedPrice(product.price, offer.discountValue);
                    await Product.findByIdAndUpdate(offer.productId, {
                        offer: offerId,
                        discountedPrice: discountedPrice
                    });
                }
            }

      
            if (offer.offerType === 'category' && offer.categoryId) {
                await Category.findByIdAndUpdate(offer.categoryId, {
                    offer: offerId
                });

                const products = await Product.find({ category: offer.categoryId });
                for (const product of products) {
                    const discountedPrice = calculateDiscountedPrice(product.price, offer.discountValue);
                    await Product.findByIdAndUpdate(product._id, {
                        offer: offerId,
                        discountedPrice: discountedPrice
                    });
                }
            }

            res.status(200).json({
                status: true,
                message: "Offer unblocked successfully"
            });

        } catch (error) {
            console.error('Error unblocking offer:', error);
            res.status(500).json({
                status: false,
                message: "Error occurred while unblocking offer"
            });
        }
    }
}


function calculateDiscountedPrice(originalPrice, discountValue) {
    const discount = (originalPrice * Number(discountValue)) / 100;
    return originalPrice - discount;
}