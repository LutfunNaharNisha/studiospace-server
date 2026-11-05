const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { toObjectId, toMin, fmtMin } = require('../utils/validate');

const router = express.Router();

// Challenge 2: look for a CONFIRMED booking that overlaps the requested window.
function findClash(db, studioId, date, startMin, endMin, excludeId) {
  const query = { studioId, date, status: 'Confirmed', startMin: { $lt: endMin }, endMin: { $gt: startMin } };
  if (excludeId) query._id = { $ne: excludeId };
  return db.collection('bookings').findOne(query);
}

// POST /api/bookings - request a slot (status starts as Pending)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { studioId, date, startTime, hours, guests, notes } = req.body || {};
    const sid = toObjectId(studioId);
    const studio = sid ? await db.collection('studios').findOne({ _id: sid }) : null;
    if (!studio) return res.status(404).json({ message: 'We could not find that studio.' });
    if (studio.ownerEmail === req.user.email) {
      return res.status(403).json({ message: 'You cannot book your own studio.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date))) {
      return res.status(400).json({ message: 'Please choose a valid booking date.' });
    }
    const earliest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (date < earliest) return res.status(400).json({ message: 'The booking date cannot be in the past.' });
    if (!/^\d{2}:00$/.test(startTime || '')) return res.status(400).json({ message: 'Please choose a start time on the hour.' });

    const startMin = toMin(startTime);
    const h = parseInt(hours, 10);
    if (startMin < 360 || startMin > 1320) return res.status(400).json({ message: 'Sessions can start between 06:00 and 22:00.' });
    if (!(h >= 1 && h <= 12)) return res.status(400).json({ message: 'Choose a session length between 1 and 12 hours.' });
    const endMin = startMin + h * 60;
    if (endMin > 1440) return res.status(400).json({ message: 'Sessions must finish by midnight.' });
    const g = parseInt(guests, 10);
    if (!(g >= 1 && g <= studio.capacity)) {
      return res.status(400).json({ message: `This space fits up to ${studio.capacity} people.` });
    }

    const clash = await findClash(db, sid, date, startMin, endMin);
    if (clash) {
      return res.status(409).json({
        message: `${studio.title} is already booked from ${fmtMin(clash.startMin)} to ${fmtMin(clash.endMin)} on ${date}. Please pick another time.`,
      });
    }

    const subtotal = studio.hourlyRate * h;
    const doc = {
      studioId: sid,
      studioTitle: studio.title,
      studioImage: studio.image,
      studioLocation: studio.location,
      category: studio.category,
      hostEmail: studio.ownerEmail,
      hostName: studio.ownerName,
      guestEmail: req.user.email,
      guestName: req.user.name,
      date,
      startTime,
      endTime: fmtMin(endMin),
      startMin,
      endMin,
      hours: h,
      guests: g,
      notes: String(notes || '').trim().slice(0, 500),
      hourlyRate: studio.hourlyRate,
      subtotal,
      securityDeposit: studio.securityDeposit || 0,
      total: subtotal + (studio.securityDeposit || 0),
      status: 'Pending',
      createdAt: new Date(),
    };
    const result = await db.collection('bookings').insertOne(doc);
    res.status(201).json({ message: 'Booking requested', _id: result.insertedId });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/mine - reservations made by the logged-in guest
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(await db.collection('bookings').find({ guestEmail: req.user.email }).sort({ createdAt: -1 }).toArray());
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/host - requests received on the host's studios
router.get('/host', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(await db.collection('bookings').find({ hostEmail: req.user.email }).sort({ createdAt: -1 }).toArray());
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/cancel - guests may cancel Pending bookings only
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id);
    const db = await getDb();
    const booking = id ? await db.collection('bookings').findOne({ _id: id }) : null;
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.guestEmail !== req.user.email) return res.status(403).json({ message: 'This booking belongs to another account.' });
    if (booking.status !== 'Pending') return res.status(400).json({ message: 'Only pending bookings can be cancelled.' });
    await db.collection('bookings').updateOne({ _id: id }, { $set: { status: 'Cancelled', updatedAt: new Date() } });
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/status - host moves a booking through its lifecycle
const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
};
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id);
    const next_ = String((req.body || {}).status || '');
    const db = await getDb();
    const booking = id ? await db.collection('bookings').findOne({ _id: id }) : null;
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.hostEmail !== req.user.email) return res.status(403).json({ message: 'Only the studio host can update this booking.' });
    if (!(TRANSITIONS[booking.status] || []).includes(next_)) {
      return res.status(400).json({ message: `A ${booking.status.toLowerCase()} booking cannot be marked ${next_.toLowerCase()}.` });
    }
    if (next_ === 'Confirmed') {
      const clash = await findClash(db, booking.studioId, booking.date, booking.startMin, booking.endMin, id);
      if (clash) {
        return res.status(409).json({
          message: `Another booking is already confirmed from ${fmtMin(clash.startMin)} to ${fmtMin(clash.endMin)} on ${booking.date}. Decline this request or ask the guest to rebook.`,
        });
      }
    }
    await db.collection('bookings').updateOne({ _id: id }, { $set: { status: next_, updatedAt: new Date() } });
    res.json({ message: `Booking ${next_.toLowerCase()}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
