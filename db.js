const { MongoClient, ServerApiVersion } = require('mongodb');

// Cache the connection on `global` so serverless invocations (Vercel) reuse it.
const cache = global._studioMongo || (global._studioMongo = { promise: null, indexed: false });

async function ensureIndexes(db) {
  await Promise.all([
    db.collection('studios').createIndex({ ownerEmail: 1 }),
    db.collection('studios').createIndex({ category: 1, rating: -1 }),
    db.collection('bookings').createIndex({ studioId: 1, date: 1, status: 1 }),
    db.collection('bookings').createIndex({ guestEmail: 1 }),
    db.collection('bookings').createIndex({ hostEmail: 1 }),
    db.collection('wishlist').createIndex({ userEmail: 1, studioId: 1 }, { unique: true }),
    db.collection('reviews').createIndex({ studioId: 1, userEmail: 1 }, { unique: true }),
  ]);
}

async function getDb() {
  if (!cache.promise) {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
    });
    cache.promise = client
      .connect()
      .then((c) => c.db(process.env.DB_NAME || 'studiospace'))
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  const db = await cache.promise;
  if (!cache.indexed) {
    cache.indexed = true;
    ensureIndexes(db).catch((e) => console.warn('Index creation skipped:', e.message));
  }
  return db;
}

module.exports = { getDb };
