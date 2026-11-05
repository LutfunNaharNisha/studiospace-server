const { ObjectId } = require('mongodb');

const CATEGORIES = [
  'Photo Studio',
  'Film & Sound Stage',
  'Podcast Lounge',
  'Music Suite',
  'Art Workshop',
];

const isUrl = (v) => {
  try {
    const u = new URL(v);
    return ['http:', 'https:'].includes(u.protocol);
  } catch (e) {
    return false;
  }
};

const toObjectId = (id) => {
  if (!id || !ObjectId.isValid(id)) return null;
  const oid = new ObjectId(id);
  return String(oid) === String(id) ? oid : null;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};
const fmtMin = (m) =>
  m === 1440 ? '24:00' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function parseStudio(b = {}) {
  const data = {
    title: str(b.title),
    category: str(b.category),
    hourlyRate: Number(b.hourlyRate),
    securityDeposit: Number(b.securityDeposit || 0),
    capacity: parseInt(b.capacity, 10),
    location: str(b.location),
    image: str(b.image),
    gallery: Array.isArray(b.gallery) ? b.gallery.map(str).filter(isUrl).slice(0, 8) : [],
    amenities: Array.isArray(b.amenities)
      ? [...new Set(b.amenities.map(str).filter(Boolean))].slice(0, 24)
      : [],
    overview: str(b.overview),
  };
  if (data.title.length < 3) return { error: 'Please enter a studio title of at least 3 characters.' };
  if (!CATEGORIES.includes(data.category)) return { error: 'Please choose a valid category.' };
  if (!(data.hourlyRate > 0)) return { error: 'Hourly rate must be greater than $0.' };
  if (!(data.securityDeposit >= 0)) return { error: 'Security deposit cannot be negative.' };
  if (!(data.capacity >= 1)) return { error: 'Capacity must be at least 1 person.' };
  if (data.location.length < 5) return { error: 'Please enter the studio address.' };
  if (!isUrl(data.image)) return { error: 'Please provide a valid image URL.' };
  if (data.overview.length < 30) return { error: 'The overview needs at least 30 characters.' };
  return { data };
}

module.exports = { CATEGORIES, isUrl, toObjectId, escapeRegex, toMin, fmtMin, parseStudio };
