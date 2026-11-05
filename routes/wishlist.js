const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { toObjectId } = require('../utils/validate');

const router = express.Router();

// GET /api/wishlist/ids - ids only, used to paint the heart icons
router.get('/ids', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.collection('wishlist').find({ userEmail: req.user.email }).toArray();
    res.json(rows.map((r) => String(r.studioId)));
  } catch (err) {
    next(err);
  }
});

// GET /api/wishlist - saved studios with full details
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.collection('wishlist').find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    const studios = await db.collection('studios').find({ _id: { $in: rows.map((r) => r.studioId) } }).toArray();
    const byId = new Map(studios.map((s) => [String(s._id), s]));
    res.json(rows.map((r) => byId.get(String(r.studioId))).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

// POST /api/wishlist/:studioId - toggle saved state
router.post('/:studioId', requireAuth, async (req, res, next) => {
  try {
    const sid = toObjectId(req.params.studioId);
    const db = await getDb();
    const studio = sid ? await db.collection('studios').findOne({ _id: sid }, { projection: { _id: 1 } }) : null;
    if (!studio) return res.status(404).json({ message: 'We could not find that studio.' });
    const filter = { userEmail: req.user.email, studioId: sid };
    const removed = await db.collection('wishlist').deleteOne(filter);
    if (removed.deletedCount) return res.json({ saved: false });
    await db.collection('wishlist').insertOne({ ...filter, createdAt: new Date() });
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
