const Product = require('../model/productModel');
const userSchema = require('../model/userModel');
const Wishlist = require('../model/wishlistModel');
const Cart = require('../model/cartModel');
const Category = require('../model/categoryModel');

module.exports = {
    loadShop: async (req, res) => {
        try {
            console.log("1. Starting shop load...");
            const sortOption = req.query.sort || "default"; 
            const selectedCategory = req.query.category;
            const userId = req.session.user._id;
            
            console.log("2. User ID:", userId);
            let user = null;
            let wishlistCount = 0;
            let cartCount = 0;

            if (userId) {
                const cartItems = await Cart.find({ 
                    userId: userId,
                    status: { $ne: 'placed' }
                });
                console.log("Cart items found:", cartItems);

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

                console.log("3. Detailed cart information:");
                console.log("- Raw cart items:", cartItems);
                console.log("- Cart count:", cartCount);
                console.log("- Cart items length:", cartItems.length);
            }

            const categories = await Category.find({status:true})
                .sort({ categoryName: 1 });

            let query = { deleted: false };
            if (selectedCategory) {
                const category = await Category.findOne({ 
                    categoryName: selectedCategory ,
                    status:true
                });
                
                console.log("Selected category:", category); 

                if (category) {
                    query.category = category._id;  
                }
            }

            console.log("Product query:", query); 

            let sortCriteria = {};
            if (sortOption === "priceAsc") {
                sortCriteria = { price: 1 };
            } else if (sortOption === "priceDesc") {
                sortCriteria = { price: -1 };
            } else if (sortOption === "newArrivals") {
                sortCriteria = { createdAt: -1 };
            } else if (sortOption === "aToZ") {
                sortCriteria = { productName: 1 };
            } else if (sortOption === "zToA") {
                sortCriteria = { productName: -1 };
            }

     
            console.log("7. Fetching products...");
            const products = await Product
                .find(query)
                .populate('category') 
                .sort(sortOption === "default" ? {} : sortCriteria);

            const filteredProducts = products.filter(product => 
                product.category && product.category.status === true
            );
            
            console.log("8. Products found:", filteredProducts.length);

            let wishlistItems = [];
            let cartItems = [];
            if (userId) {
                console.log("9. Fetching wishlist and cart...");
                [wishlistItems, cartItems] = await Promise.all([
                    Wishlist.find({ user: userId }),
                    Cart.find({ user: userId })
                ]);
            }

            console.log("10. Mapping products...");
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

            console.log("11. Rendering shop page...");
            res.render("user/shop", { 
                data: Obj, 
                user, 
                sortOption, 
                categories: categories.map(cat => cat.categoryName),
                selectedCategory,
                wishlistCount,
                cartCount
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
            
            // Get user, wishlist count, and cart count
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

            // Get all categories
            const categories = await Category.find({ status: true })
                .sort({ categoryName: 1 });

            // Build search query
            let query = {
                deleted: false,
                $or: [
                    { productName: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } }
                ]
            };

            // Add category filter if selected
            if (selectedCategory) {
                const category = await Category.findOne({ 
                    categoryName: selectedCategory,
                    status: true
                });
                if (category) {
                    query.category = category._id;
                }
            }

            // Get wishlist and cart items if user is logged in
            let [wishlistItems, cartItems] = [[], []];
            if (userId) {
                [wishlistItems, cartItems] = await Promise.all([
                    Wishlist.find({ user: userId }),
                    Cart.find({ user: userId })
                ]);
            }

            // Fetch and map products
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

