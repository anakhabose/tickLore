const Product = require('../model/productModel');
const userSchema = require('../model/userModel');
const Wishlist = require('../model/wishlistModel');
const Cart = require('../model/cartModel');

module.exports = {
    loadShop: async (req, res) => {
         try {
        const sortOption = req.query.sort || "default"; 
        const selectedCategory = req.query.category;
        const userId = req.session.user;
        const user = await userSchema.findById(userId);

          let wishlistItems = [];
            if (userId) {
                wishlistItems = await Wishlist.find({ user: userId });
            }
            let cartItems = [];
            if (userId) {
                cartItems = await Cart.find({ user: userId });
            }

  
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
  
        let categories = await Product.distinct('category');
        categories = [...new Set(categories.map(cat => 
            cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()
        ))].sort();
  
        let query = { deleted: false };
        if (selectedCategory) {
            query.category = new RegExp('^' + selectedCategory + '$', 'i');
        }
  
        const products = await Product
          .find(query)
          .populate({ path: "category", match: { isBlock: false } })
          .sort(sortCriteria) 
          .exec();
  
        const filterProduct = products.filter((product) => product.category !== null);
  
        const Obj = filterProduct.map((data) => {
           const isInWishlist = wishlistItems.some(item => 
                    item.product.toString() === data._id.toString()
                );
        const isInCart = cartItems.some(item => 
            item.product.toString() === data._id.toString()
        );
          return {
            _id: data._id,
            name: data.productName,
            description: data.description,
            category: data.category,
            brand: data.brand,
            price: data.price,
            images: data.images,
             isInWishlist: isInWishlist,
             isInCart: isInCart
          };
        });
  
       
        res.render("user/shop", { data: Obj, user, sortOption, categories, selectedCategory });
      } catch (error) {
        console.log(error);
        res.status(500).send("Error occurred");
      }
    },
    searchProduct: async(req,res)=>{
        try {
            const searchQuery = req.query.query;
              const userId = req.session.user; 

    
             let wishlistItems = [];
            if (userId) {
                wishlistItems = await Wishlist.find({ user: userId });
            }
            
            const products = await Product.find({
                $or: [
                    { productName: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } }
                ]
            });

            const Obj = products.map((data) => {
              const isInWishlist = wishlistItems.some(item => 
                    item.product.toString() === data._id.toString()
                );
                return {
                    _id: data._id,
                    name: data.productName,
                    description: data.description,
                    category: data.category,
                    brand: data.brand,
                    price: data.price,
                    images: data.images,
                    isInWishlist: isInWishlist
                };
            });

            res.render('user/shop', {
                data: Obj,
                searchQuery: searchQuery,
                user: userId
            });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).render('error', { message: 'Error processing search' });
        }
    }
};

