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
            const userId = req.session.user;
            
            console.log("2. User ID:", userId);
            let user = null;
            if (userId) {
                user = await userSchema.findById(userId);
                console.log("3. Found user:", user ? "yes" : "no");
            }

            // Get all categories
            const categories = await Category.find({status:true})
                .sort({ categoryName: 1 });

            // Build query
            let query = { deleted: false };
            if (selectedCategory) {
                // Find the category document first
                const category = await Category.findOne({ 
                    categoryName: selectedCategory ,
                    status:true
                     // Match exact category name
                });
                
                console.log("Selected category:", category); // Debug log

                if (category) {
                    query.category = category._id;  // Use the category's _id in the product query
                }
            }

            console.log("Product query:", query); // Debug log

            // Define sort criteria
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

            // Fetch products
            console.log("7. Fetching products...");
            const products = await Product
                .find(query)
                .populate('category')  // First populate all categories
                .sort(sortOption === "default" ? {} : sortCriteria);

            // Filter products to only include those with active categories
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
                selectedCategory 
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
                errorMessage: "An error occurred while loading the shop"
            });
        }
    },
    searchProduct: async(req, res) => {
        try {
            const searchQuery = req.query.query;
            const selectedCategory = req.query.category;
            const userId = req.session.user;
            
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
                user: userId,
                categories: categories.map(cat => cat.categoryName),
                selectedCategory
            });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).render('user/shop', { 
                data: [], 
                searchQuery: '',
                user: null,
                categories: [],
                errorMessage: 'Error processing search'
            });
        }
    }
};

