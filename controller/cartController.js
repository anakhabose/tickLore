const Cart = require("../model/cartModel");
const Product = require('../model/productModel');
const userSchema = require('../model/userModel')
const Wishlist = require('../model/wishlistModel');


module.exports = {
  loadCart: async (req, res) => {
  try {
    const userId = req.session.user._id; 
    const userData = await userSchema.findOne({ _id: userId }); 

    const cart = await Cart.findOne({ userId: userId })
      .populate({
        path: 'items.productId',
        model: 'products', 
        select: 'productName images price deleted discountedPrice offer',
        populate: [
          {
            path: 'offer',
            model: 'offer',
            select: 'discountValue'
          },
        
        ]
      });

    if (!cart) {
      return res.render('user/cart', { 
        cartItems: [], 
        subtotal: 0,
        deliveryCharges: 0, 
        totalAmount: 0 
      });
    }

    const activeCartItems = cart.items.filter(item => 
      item.productId && !item.productId.deleted
    ).map(item => {
      
      let effectivePrice = item.productId.price;
      let appliedDiscount = 0;

  
      if (item.productId.offer && item.productId.offer.discountValue) {
        appliedDiscount = Math.max(appliedDiscount, item.productId.offer.discountValue);
      }

      
        // if (item.productId.category && item.productId.category.offer && 
        //     item.productId.category.offer.discountValue) {
        //   appliedDiscount = Math.max(appliedDiscount, item.productId.category.offer.discountValue);
        // }

      
        if (appliedDiscount > 0) {
          effectivePrice = item.productId.price - (item.productId.price * (appliedDiscount / 100));
        }

      
        item.salePrice = effectivePrice;
        item.totalPrice = effectivePrice * item.quantity;
        
        return item;
      });

      const subtotal = activeCartItems.reduce((total, item) => {
        return total + item.totalPrice;
      }, 0);

      const calculateDeliveryCharges = (totalAmount) => {
        if (totalAmount >= 2000) return 0;        
        if (totalAmount >= 1000) return 30;      
        return 50;
      };

      const deliveryCharges = calculateDeliveryCharges(subtotal);
      const totalAmount = subtotal + deliveryCharges;

     
      cart.items = activeCartItems;
      cart.totalCartPrice = subtotal;
      cart.deliveryCharges = deliveryCharges;
      cart.finalAmount = totalAmount;
      await cart.save();

    
      const cartCount = cart ? cart.items.length : 0;
      

      const wishlistCount = await Wishlist.countDocuments({ user: userId });
      console.log('User ID:', userId);
      console.log('Wishlist count:', wishlistCount);

      res.render('user/cart', {
        user: req.session.user,
        users: userData,
        cartItems: activeCartItems,
        subtotal: subtotal.toFixed(2), 
        deliveryCharges: deliveryCharges.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        cartCount,
        wishlistCount
      });

  } catch (error) {
    console.error('Error loading cart:', error);
    console.error('Specific error:', error.message);
    res.status(500).render('error', { 
      message: 'Error loading cart', 
      error: error 
    });
  }
},
addToCart: async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
  
    const quantityNum = parseInt(quantity, 10);
    const userId = req.session.user?._id;

      if (!userId) {
        return res.status(401).json({
          message: "User not authenticated",
          redirect: "/user/login",
        });
      }

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check if product is in stock
      if (product.stock === 0) {
        return res.status(400).json({ 
          error: "Product is out of stock" 
        });
      }

      // Check if requested quantity is available
      if (quantityNum > product.stock) {
        return res.status(400).json({ 
          error: `Only ${product.stock} units available in stock` 
        });
      }

      const salePrice = product.price;
      const totalPrice = salePrice * quantityNum;

      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({
          userId,
          items: [],
          totalCartPrice: 0,
          deliveryCharges: 0,
          finalAmount: 0,
        });
      }

      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingItemIndex !== -1) {
        const currentQuantity = parseInt(cart.items[existingItemIndex].quantity, 10);
        const newQuantity = currentQuantity + quantityNum;
        
        if (newQuantity > 4) {
          return res.status(400).json({ 
            message: 'Maximum quantity limit is 4 items'
          });
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].totalPrice = 
          cart.items[existingItemIndex].quantity * salePrice;
      } else {
        cart.items.push({
          productId,
          quantity: quantityNum,
          salePrice,
          totalPrice: salePrice * quantityNum,
        });
      }

      
      cart.totalCartPrice = cart.items.reduce(
        (total, item) => total + item.totalPrice,
        0
      );

      const calculateDeliveryCharges = (totalAmount) => {
    if (totalAmount >= 2000) return 0;        
    if (totalAmount >= 1000) return 30;      
    return 50
      };                              

cart.deliveryCharges = calculateDeliveryCharges(cart.totalCartPrice);
cart.finalAmount = cart.totalCartPrice + cart.deliveryCharges;

      await cart.save();
      res.status(200).json({ 
        message: "Product added to cart", 
        cart,
        breakup: {
          items: cart.totalCartPrice,
          delivery: cart.deliveryCharges,
          total: cart.finalAmount
        }
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  updateCart: async (req, res) => {
      try {
          const { productId, quantity } = req.body;
          const userId = req.session.user._id;

          // Validate quantity
          if (quantity < 1) {
              return res.status(400).json({ 
                  success: false,
                  message: 'Quantity cannot be less than 1' 
              });
          }

          // Check product existence and stock
          const product = await Product.findById(productId);
          if (!product) {
              return res.status(400).json({ 
                  success: false,
                  message: 'Product not found' 
              });
          }

          // Stock validation
          if (quantity > product.stock) {
              return res.status(400).json({ 
                  success: false,
                  message: `Only ${product.stock} items available in stock`,
                  availableStock: product.stock
              });
          }

          
          if (product.stock === 0) {
              return res.status(400).json({ message: 'Product is out of stock' });
          }

          if (quantity > product.stock) {
              return res.status(400).json({ 
                  message: `Only ${product.quantity} items available in stock`
              });
          }

          
          if (quantity > 4) {
              return res.status(400).json({ 
                  success: false,
                  message: 'Maximum quantity limit is 4 items'
              });
          }

          const cart = await Cart.findOne({ userId });
          if (!cart) {
              return res.status(404).json({ message: 'Cart not found' });
          }

          const itemIndex = cart.items.findIndex(item => 
              item.productId.toString() === productId
          );

          if (itemIndex === -1) {
              return res.status(404).json({ message: 'Product not in cart' });
          }

          
          cart.items[itemIndex].quantity = quantity;
          cart.items[itemIndex].totalPrice = cart.items[itemIndex].salePrice * quantity;

          
          cart.totalCartPrice = cart.items.reduce((total, item) => 
              total + (item.salePrice * item.quantity), 0
          );

          const calculateDeliveryCharges = (totalAmount) => {
              if (totalAmount >= 2000) return 0;        
              if (totalAmount >= 1000) return 30;      
              return 50;
          };
          
          cart.deliveryCharges = calculateDeliveryCharges(cart.totalCartPrice);
          cart.finalAmount = cart.totalCartPrice + cart.deliveryCharges;

          await cart.save();

          res.status(200).json({ 
              success: true,
              message: 'Cart updated successfully',
              cart: {
                  items: cart.totalCartPrice,
                  delivery: cart.deliveryCharges,
                  total: cart.finalAmount
              }
          });
      } catch (error) {
          console.error('Error updating cart quantity:', error);
          res.status(500).json({ 
              success: false,
              message: 'Error updating cart' 
          });
      }
  },
  removeFromCart : async (req, res) => {
    try {
      const { productId } = req.params;

      if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ message: 'User not authenticated', redirect: "/login" });
      }


      let cart = await Cart.findOne({ userId: req.session.user._id });

      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }

      cart.items = cart.items.filter(item => item.productId.toString() !== productId);
      await cart.save();

      res.status(200).json({ message: 'Item removed from cart successfully' });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({ message: 'Error removing item from cart', error: error.message });
    }
  },
  verifyStock : async (req, res) => {
      try {
          const { items } = req.body;
          
      
          for (const item of items) {
              const product = await Product.findById(item.productId);
              if (!product) {
                  return res.json({
                      success: false,
                      message: 'One or more products not found'
                  });
              }
              
          if (product.stock === 0) {
              return res.status(400).json({ message: `Product ${product.productName} is out of stock` });
          }
              
              if (product.stock < item.quantity) {
                  return res.json({
                      success: false,
                      message: `Only ${product.stock} units available for ${product.productName}`
                  });
              }
          }
          
        
          res.json({
              success: true
          });
      } catch (error) {
          console.error('Stock verification error:', error);
          res.json({
              success: false,
              message: 'Error verifying stock availability'
          });
      }
  },

}

