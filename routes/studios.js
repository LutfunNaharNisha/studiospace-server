const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { parseStudio, escapeRegex, toObjectId } = require('../utils/validate');

const router = express.Router();

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { hourlyRate: 1 },
  'price-desc': { hourlyRate: -1 },
  rating: { rating: -1, reviewCount: -1 },
};

async function loadStudio(req, res) {
  const id = toObjectId(req.params.id);
  const studio = id ? await (await getDb()).collection('studios').findOne({ _id: id }) : null;
  if (!studio) {
    res.status(404).json({ message: 'We could not find that studio. It may have been removed.' });
    return null;
  }
  return studio;
}

// GET /api/studios  - search, filter, sort and paginate
router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const { search = '', category, sort = 'newest', maxPrice, minRating } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 9));

    const query = {};
    if (String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
      query.$or = [{ title: rx }, { location: rx }, { category: rx }, { amenities: rx }];
    }
    if (category && category !== 'all') query.category = String(category);
    if (maxPrice && Number(maxPrice) > 0) query.hourlyRate = { $lte: Number(maxPrice) };
    if (minRating && Number(minRating) > 0) query.rating = { $gte: Number(minRating) };

    const col = db.collection('studios');
    const [items, total] = await Promise.all([
      col.find(query).sort(SORTS[sort] || SORTS.newest).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(query),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/studios/featured - six top-rated / newest studios for the home page
router.get('/featured', async (req, res, next) => {
  try {
    const db = await getDb();
    const items = await db
      .collection('studios')
      .find({})
      .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
      .limit(6)
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET /api/studios/categories - live counts per category
router.get('/categories', async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db
      .collection('studios')
      .aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
      .toArray();
    res.json(Object.fromEntries(rows.map((r) => [r._id, r.count])));
  } catch (err) {
    next(err);
  }
});

// GET /api/studios/mine - listings owned by the logged-in host
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const items = await db
      .collection('studios')
      .find({ ownerEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/studios - create a listing (owner details come from the verified JWT)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = parseStudio(req.body);
    if (error) return res.status(400).json({ message: error });
    const db = await getDb();
    const doc = {
      ...data,
      rating: 0,
      reviewCount: 0,
      ownerEmail: req.user.email,
      ownerName: req.user.name,
      ownerImage: req.user.image || '',
      createdAt: new Date(),
    };
    const result = await db.collection('studios').insertOne(doc);
    res.status(201).json({ message: 'Studio listed', _id: result.insertedId });
  } catch (err) {
    next(err);
  }
});

// GET /api/studios/:id
router.get('/:id', async (req, res, next) => {
  try {
    const studio = await loadStudio(req, res);
    if (studio) res.json(studio);
  } catch (err) {
    next(err);
  }
});

// PUT/PATCH /api/studios/:id - owner only
async function updateStudio(req, res, next) {
  try {
    const studio = await loadStudio(req, res);
    if (!studio) return;
    if (studio.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'You can only edit your own listings.' });
    }
    const { data, error } = parseStudio(req.body);
    if (error) return res.status(400).json({ message: error });
    const db = await getDb();
    await db.collection('studios').updateOne({ _id: studio._id }, { $set: { ...data, updatedAt: new Date() } });
    res.json({ message: 'Studio updated', _id: studio._id });
  } catch (err) {
    next(err);
  }
}
router.put('/:id', requireAuth, updateStudio);
router.patch('/:id', requireAuth, updateStudio);

// DELETE /api/studios/:id - owner only, cascades to bookings, wishlist and reviews
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const studio = await loadStudio(req, res);
    if (!studio) return;
    if (studio.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'You can only delete your own listings.' });
    }
    const db = await getDb();
    await Promise.all([
      db.collection('studios').deleteOne({ _id: studio._id }),
      db.collection('bookings').updateMany(
        { studioId: studio._id, status: { $in: ['Pending', 'Confirmed'] } },
        { $set: { status: 'Cancelled', cancelReason: 'Listing removed by host', updatedAt: new Date() } }
      ),
      db.collection('wishlist').deleteMany({ studioId: studio._id }),
      db.collection('reviews').deleteMany({ studioId: studio._id }),
    ]);
    res.json({ message: 'Studio deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/studios/:id/availability?date=YYYY-MM-DD - confirmed (blocked) slots
router.get('/:id/availability', async (req, res, next) => {
  try {
    const studio = await loadStudio(req, res);
    if (!studio) return;
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json([]);
    const db = await getDb();
    const rows = await db
      .collection('bookings')
      .find({ studioId: studio._id, date, status: 'Confirmed' })
      .project({ startTime: 1, endTime: 1, startMin: 1, endMin: 1 })
      .sort({ startMin: 1 })
      .toArray();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/studios/:id/reviews
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const studio = await loadStudio(req, res);
    if (!studio) return;
    const db = await getDb();
    const rows = await db.collection('reviews').find({ studioId: studio._id }).sort({ createdAt: -1 }).limit(50).toArray();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/studios/:id/reviews - one review per guest, editable
router.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const studio = await loadStudio(req, res);
    if (!studio) return;
    if (studio.ownerEmail === req.user.email) {
      return res.status(403).json({ message: 'Hosts cannot review their own studio.' });
    }
    const rating = parseInt(req.body.rating, 10);
    const comment = String(req.body.comment || '').trim();
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: 'Please choose a rating from 1 to 5 stars.' });
    if (comment.length < 5) return res.status(400).json({ message: 'Please write at least a few words about your experience.' });

    const db = await getDb();
    await db.collection('reviews').updateOne(
      { studioId: studio._id, userEmail: req.user.email },
      {
        $set: { rating, comment: comment.slice(0, 600), userName: req.user.name, userImage: req.user.image || '', updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    const [agg] = await db
      .collection('reviews')
      .aggregate([{ $match: { studioId: studio._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
      .toArray();
    const avg = Math.round((agg?.avg || 0) * 10) / 10;
    await db.collection('studios').updateOne({ _id: studio._id }, { $set: { rating: avg, reviewCount: agg?.count || 0 } });
    res.status(201).json({ rating: avg, reviewCount: agg?.count || 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
