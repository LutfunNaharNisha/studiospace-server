const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - numbers for the host / guest dashboard
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const email = req.user.email;
    const [listings, hostBookings, myBookings, saved] = await Promise.all([
      db.collection('studios').countDocuments({ ownerEmail: email }),
      db.collection('bookings').find({ hostEmail: email }).project({ status: 1, subtotal: 1 }).toArray(),
      db.collection('bookings').countDocuments({ guestEmail: email }),
      db.collection('wishlist').countDocuments({ userEmail: email }),
    ]);
    const count = (s) => hostBookings.filter((b) => b.status === s).length;
    const earnings = hostBookings
      .filter((b) => ['Confirmed', 'Completed'].includes(b.status))
      .reduce((sum, b) => sum + (b.subtotal || 0), 0);
    res.json({
      listings,
      requests: hostBookings.length,
      pending: count('Pending'),
      confirmed: count('Confirmed'),
      completed: count('Completed'),
      earnings,
      myBookings,
      saved,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
