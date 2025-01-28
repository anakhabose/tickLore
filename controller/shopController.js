const Product = require('../model/productModel');
const userSchema = require('../model/userModel');
const Wishlist = require('../model/wishlistModel');
const Cart = require('../model/cartModel');
const Category = require('../model/categoryModel');

module.exports = {
    loadShop: async (req, res) => {
        try {
          
            const sortOption = req.query.sort || "default"; 
            const selectedCategory = req.query.category;
            const userId = req.session.user._id;
            
          
            const page = parseInt(req.query.page) || 1;
            const limit = 9; 
            const skip = (page - 1) * limit;
           
            let user = null;
            let wishlistCount = 0;
            let cartCount = 0;

            if (userId) {
                const cartItems = await Cart.find({ 
                    userId: userId,
                    status: { $ne: 'placed' }
                });
        
                [user, wishlistCount, cartCount] = await Promise.all([
                    userSchema.findById(userId),
                    Wishlist.countDocuments({ user: userId }),
                    Cart.countDocuments({ 
                        userId: userId,
                        status: { $ne: 'placed' }
                    })
                ]);

                if (cartItems.length > 0) {
                    cartCount = cartItems.reduce((total, cart) => total + cart.items.length, 0);
                }

             
            }

            const categories = await Category.find({status:true})
                .sort({ categoryName: 1 });

            let query = { deleted: false };
            if (selectedCategory) {
                const category = await Category.findOne({ 
                    categoryName: selectedCategory,
                    status: true
                });
                
                console.log("Selected category:", category); 

                if (category) {
                    query.category = category._id;  
                }
            }

        
            const totalProducts = await Product.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            console.log("Product query:", query); 

            let sortCriteria = {};
            if (sortOption === "priceAsc") {
                sortCriteria = { 
                    $sort: {
                        $cond: {
                            if: { $eq: ["$discountedPrice", null] },
                            then: "$price",
                            else: "$discountedPrice"
                        }
                    }
                };
            } else if (sortOption === "priceDesc") {
                sortCriteria = { 
                    $sort: {
                        $cond: {
                            if: { $eq: ["$discountedPrice", null] },
                            then: "$price",
                            else: "$discountedPrice"
                        }
                    }
                };
            } else if (sortOption === "newArrivals") {
                sortCriteria = { createdAt: -1 };
            } else if (sortOption === "aToZ") {
                sortCriteria = { productName: 1 };
            } else if (sortOption === "zToA") {
                sortCriteria = { productName: -1 };
            }

     
           
            const products = await Product.aggregate([
                { $match: query },
                {
                    $addFields: {
                        effectivePrice: {
                            $ifNull: ["$discountedPrice", "$price"]
                        }
                    }
                },
                {
                    $sort: sortOption === "priceAsc" 
                        ? { effectivePrice: 1 }
                        : sortOption === "priceDesc"
                        ? { effectivePrice: -1 }
                        : sortOption === "newArrivals"
                        ? { createdAt: -1 }
                        : sortOption === "aToZ"
                        ? { productName: 1 }
                        : sortOption === "zToA"
                        ? { productName: -1 }
                        : { createdAt: -1 }
                },
                { $skip: skip },
                { $limit: limit }
            ]);

            // Debug logging
            console.log("Sort Option:", sortOption);
            console.log("Products after sort:", products.map(p => ({
                name: p.productName,
                price: p.price,
                discountedPrice: p.discountedPrice,
                effectivePrice: p.effectivePrice
            })));

            // Since we used aggregate, we need to populate category separately
            await Product.populate(products, { path: 'category' });

            const filteredProducts = products.filter(product => 
                product.category && product.category.status === true
            );
            
         

            let wishlistItems = [];
            let cartItems = [];
            if (userId) {
             
                [wishlistItems, cartItems] = await Promise.all([
                    Wishlist.find({ user: userId }),
                    Cart.find({ user: userId })
                ]);
            }

       
            const Obj = products
                .filter(product => product.category && product.category.status === true)  
                .map((data) => ({
                    _id: data._id,
                    name: data.productName,
                    description: data.description,
                    category: data.category.categoryName,
                    brand: data.brand,
                    price: data.price,
                    discountedPrice: data.discountedPrice,
                    isDiscounted: data.discountedPrice && data.discountedPrice < data.price,
                    images: data.images,
                    isInWishlist: wishlistItems.some(item => 
                        item.product.toString() === data._id.toString()
                    ),
                    isInCart: cartItems.some(item => 
                        item.product.toString() === data._id.toString()
                    )
                }));

       
            res.render("user/shop", { 
                data: Obj, 
                user, 
                sortOption, 
                categories: categories.map(cat => cat.categoryName),
                selectedCategory,
                wishlistCount,
                cartCount,
                pagination: {
                    page,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    nextPage: page + 1,
                    prevPage: page - 1,
                    lastPage: totalPages
                }
            });

        } catch (error) {
            console.error("Shop loading error:", error);
            console.error("Error stack:", error.stack);
            return res.render("user/shop", { 
                data: [], 
                user: null, 
                sortOption: "default", 
                categories: [], 
                selectedCategory: null,
                wishlistCount: 0,
                cartCount: 0,
                errorMessage: "An error occurred while loading the shop"
            });
        }
    },
    searchProduct: async(req, res) => {
        try {
            const searchQuery = req.query.query;
            const selectedCategory = req.query.category;
            const userId = req.session.user;
            
          
            let user = null;
            let wishlistCount = 0;
            let cartCount = 0;

            if (userId) {
                [user, wishlistCount, cartCount] = await Promise.all([
                    userSchema.findById(userId),
                    Wishlist.countDocuments({ user: userId }),
                    Cart.countDocuments({ user: userId })
                ]);
            }

  
            const categories = await Category.find({ status: true })
                .sort({ categoryName: 1 });

       
            let query = {
                deleted: false,
                $or: [
                    { productName: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } }
                ]
            };

   
            if (selectedCategory) {
                const category = await Category.findOne({ 
                    categoryName: selectedCategory,
                    status: true
                });
                if (category) {
                    query.category = category._id;
                }
            }

  
            let [wishlistItems, cartItems] = [[], []];
            if (userId) {
                [wishlistItems, cartItems] = await Promise.all([
                    Wishlist.find({ user: userId }),
                    Cart.find({ user: userId })
                ]);
            }

   
            const products = await Product
                .find(query)
                .populate('category');

            const Obj = products
                .filter(product => product.category && product.category.status === true)
                .map((data) => ({
                    _id: data._id,
                    name: data.productName,
                    description: data.description,
                    category: data.category.categoryName,
                    brand: data.brand,
                    price: data.price,
                    discountedPrice: data.discountedPrice,
                    images: data.images,
                    isInWishlist: wishlistItems.some(item => 
                        item.product.toString() === data._id.toString()
                    ),
                    isInCart: cartItems.some(item => 
                        item.product.toString() === data._id.toString()
                    )
                }));

            res.render('user/shop', {
                data: Obj,
                searchQuery,
                user,
                categories: categories.map(cat => cat.categoryName),
                selectedCategory,
                wishlistCount,
                cartCount
            });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).render('user/shop', { 
                data: [], 
                searchQuery: '',
                user: null,
                categories: [],
                wishlistCount: 0,
                cartCount: 0,
                errorMessage: 'Error processing search'
            });
        }
    }
};

