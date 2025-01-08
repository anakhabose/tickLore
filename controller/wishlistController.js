const Wishlist = require('../model/wishlistModel');
const Product = require('../model/productModel');
const User = require('../model/userModel');
const Cart = require('../model/cartModel');

module.exports = {
    getWishlist: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ error: 'Please login to continue' });
            }

            const userId = req.session.user._id;
            console.log('Fetching wishlist for user:', userId);

             const page = parseInt(req.query.page) || 1;
        const limit = 6; 
        const skip = (page - 1) * limit;
        
        const totalItems = await Wishlist.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalItems / limit);

            
            const wishlistItems = await Wishlist.find({ user: userId })
                .populate({
                    path: 'product',
                    model: 'products',
                    select: 'productName price images description category stock'
                })
                .populate({
                    path: 'user',
                    model: 'user',
                    select: 'name email'
                })
                 .skip(skip)
            .limit(limit)
                .lean();

            console.log('Populated wishlist items:', JSON.stringify(wishlistItems, null, 2));

            const validWishlistItems = wishlistItems.filter(item => item.product != null);
            const wishlistCount = validWishlistItems.length;

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ 
                    success: true, 
                wishlistItems: validWishlistItems,
                wishlistCount,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
                });
            }

            res.render('user/wishlist', { 
                wishlistItems: validWishlistItems,
                wishlistCount,
                pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
                user: req.session.user,
                debug: {
                    itemCount: validWishlistItems.length,
                    firstItem: validWishlistItems[0]
                }
            });
            
        } catch (error) {
            console.error('Get wishlist error:', error);
            res.status(500).json({ 
                error: 'Failed to fetch wishlist',
                details: error.message 
            });
        }
    },

    addToWishlist: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ error: 'Please login to continue' });
            }

            const { productId } = req.body;
            const userId = req.session.user._id;

            
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

          
            const existingItem = await Wishlist.findOne({ 
                user: userId, 
                product: productId 
            });

            if (existingItem) {
                return res.status(400).json({ 
                    error: 'Product already in wishlist' 
                });
            }

           
            const wishlistItem = new Wishlist({
                user: userId,
                product: productId
            });

            await wishlistItem.save();

         
            const populatedItem = await Wishlist.findById(wishlistItem._id)
                .populate({
                    path: 'product',
                    select: 'productName price images'
                })
                .lean();

            res.json({ 
                success: true, 
                message: 'Product added to wishlist',
                item: populatedItem
            });

        } catch (error) {
            console.error('Add to wishlist error:', error);
            res.status(500).json({ 
                error: 'Failed to add product to wishlist',
                details: error.message 
            });
        }
    },

    removeFromWishlist: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ error: 'Please login to continue' });
            }

            const { productId } = req.params;
            const userId = req.session.user._id;

            const result = await Wishlist.findOneAndDelete({
                user: userId,
                product: productId
            });

            if (!result) {
                return res.status(404).json({ error: 'Item not found in wishlist' });
            }

            res.json({ 
                success: true, 
                message: 'Item removed from wishlist' 
            });

        } catch (error) {
            console.error('Remove from wishlist error:', error);
            res.status(500).json({ 
                error: 'Failed to remove item from wishlist',
                details: error.message 
            });
        }
    },

}


