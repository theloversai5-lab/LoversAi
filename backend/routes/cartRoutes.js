import express from 'express';
import Cart from '../models/Cart.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's wedding cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate('items.serviceId', 'fullName company_name role');
    
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }
    
    res.json({ success: true, cart });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving cart' });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to wedding cart
// @access  Private
router.post('/add', protect, async (req, res) => {
  try {
    const item = req.body;
    
    let cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [item] });
    } else {
      cart.items.push(item);
      await cart.save();
    }
    
    res.json({ success: true, cart });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, error: 'Server error adding to cart' });
  }
});

// @route   DELETE /api/cart/:itemId
// @desc    Remove item from wedding cart
// @access  Private
router.delete('/:itemId', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    await cart.save();
    
    res.json({ success: true, cart });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, error: 'Server error removing from cart' });
  }
});

// @route   DELETE /api/cart
// @desc    Clear entire wedding cart
// @access  Private
router.delete('/', protect, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ userId: req.user._id });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, error: 'Server error clearing cart' });
  }
});

export default router;
