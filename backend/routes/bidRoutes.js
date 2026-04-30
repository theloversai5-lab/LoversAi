import express from 'express';
import Bid from '../models/Bid.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/bids
// @desc    Create a new Bid (Couple only)
// @access  Private (couple)
router.post('/', protect, authorize('couple'), async (req, res) => {
  try {
    const { title, description, budget, location, guestCount, eventDate, aiImages } = req.body;

    const newBid = new Bid({
      coupleId: req.user._id,
      title,
      description,
      budget,
      location,
      guestCount,
      eventDate,
      aiImages: aiImages || []
    });

    const savedBid = await newBid.save();
    
    // Notify all planners via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("new_bid", { bid: savedBid });
      console.log(`📢 Broadcasted new bid ${savedBid._id} to all planners`);
    }

    res.status(201).json({ success: true, bid: savedBid });
  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ success: false, error: 'Server error creating bid' });
  }
});

// @route   GET /api/bids
// @desc    Get bids (Couples see theirs, Planners/Vendors see active network bids)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let bids;
    if (req.user.role === 'couple') {
      bids = await Bid.find({ coupleId: req.user._id }).sort({ createdAt: -1 });
    } else if (req.user.role === 'planner' || req.user.role === 'vendor') {
      // Planners see all pending/reviewing bids that haven't been completed
      bids = await Bid.find({ status: { $in: ['pending', 'reviewing', 'quoted'] } })
                      .populate('coupleId', 'fullName email')
                      .sort({ createdAt: -1 });
    } else {
      bids = await Bid.find().sort({ createdAt: -1 }); // Admin sees all
    }
    res.json({ success: true, bids });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving bids' });
  }
});

// @route   GET /api/bids/:id
// @desc    Get a specific bid by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id)
      .populate('coupleId', 'fullName email')
      .populate('plannerResponses.plannerId', 'profile.businessName email fullName');

    if (!bid) {
      return res.status(404).json({ success: false, error: 'Bid not found' });
    }

    // Security check: If couple, ensure they own it
    if (req.user.role === 'couple' && bid.coupleId._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized to view this bid' });
    }

    res.json({ success: true, bid });
  } catch (error) {
    console.error('Get bid error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving bid' });
  }
});

// @route   POST /api/bids/:id/quote
// @desc    Submit a quote on a Bid (Planner/Vendor only)
// @access  Private (planner/vendor)
router.post('/:id/quote', protect, authorize('planner', 'vendor'), async (req, res) => {
  try {
    const { quoteAmount, message } = req.body;
    const bid = await Bid.findById(req.params.id);

    if (!bid) return res.status(404).json({ success: false, error: 'Bid not found' });
    if (bid.status === 'completed' || bid.status === 'accepted') {
      return res.status(400).json({ success: false, error: 'This bid is no longer accepting quotes' });
    }

    // Check if planner already quoted
    const existingIndex = bid.plannerResponses.findIndex(
      r => r.plannerId.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      // Update existing response
      bid.plannerResponses[existingIndex].quoteAmount = quoteAmount;
      bid.plannerResponses[existingIndex].message = message;
      bid.plannerResponses[existingIndex].status = 'quoted';
    } else {
      // Create new response
      bid.plannerResponses.push({
        plannerId: req.user._id,
        quoteAmount,
        message,
        status: 'quoted'
      });
    }

    if (bid.status === 'pending') {
      bid.status = 'reviewing'; // Shift status as planners interact
    }

    await bid.save();
    
    // Return populated
    const updatedBid = await Bid.findById(req.params.id).populate('plannerResponses.plannerId', 'profile.businessName');
    res.json({ success: true, bid: updatedBid });
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ success: false, error: 'Server error submitting quote' });
  }
});

// @route   PUT /api/bids/:id/status
// @desc    Accept/Reject a quote on a Bid (Couple only)
// @access  Private (couple)
router.put('/:id/accept', protect, authorize('couple'), async (req, res) => {
  try {
    const { plannerId } = req.body; // the planner they are hiring
    const bid = await Bid.findById(req.params.id);

    if (!bid) return res.status(404).json({ success: false, error: 'Bid not found' });
    if (bid.coupleId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    bid.hiredPlannerId = plannerId;
    bid.status = 'accepted';

    // Mark specific planner response as accepted
    const responseIndex = bid.plannerResponses.findIndex(r => r.plannerId.toString() === plannerId);
    if(responseIndex > -1){
        const rest = bid.plannerResponses.splice(responseIndex, 1)[0];
        bid.plannerResponses = [rest]; // delete all other bids to commit to this one
    }

    await bid.save();
    res.json({ success: true, bid });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: 'Server error updating bid status' });
  }
});

export default router;
