// Run with: npm run seed
// Inserts realistic demo studios + reviews, owned by SEED_OWNER_EMAIL.
require("dotenv").config();
const { getDb } = require("./db");

const U = (id) =>
	`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
const POOL = {
	"Photo Studio": [
		"photo-1516035069371-29a1b244cc32",
		"photo-1492691527719-9d1e07e534b4",
		"photo-1471341971476-ae15ff5dd4ea",
	],
	"Film & Sound Stage": [
		"photo-1485846234645-a62644f84728",
		"photo-1536440136628-849c177e76a1",
		"photo-1478720568477-152d9b164e26",
	],
	"Podcast Lounge": [
		"photo-1478737270239-2f02b77fc618",
		"photo-1590602847861-f357a9332bbc",
		"photo-1589903308904-1010c2294adc",
	],
	"Music Suite": [
		"photo-1598488035139-bdbb2231ce04",
		"photo-1511671782779-c97d3d27a1d4",
		"photo-1519892300165-cb5542fb47c7",
	],
	"Art Workshop": [
		"photo-1513364776144-60967b0f800f",
		"photo-1460661419201-fd4cecdf8a8b",
		"photo-1452860606245-08befc0ff44b",
	],
};

const STUDIOS = [
	{
		title: "Northlight Cyc Wall Studio",
		category: "Photo Studio",
		hourlyRate: 65,
		securityDeposit: 150,
		capacity: 12,
		location: "214 Atlantic Ave, Brooklyn, NY",
		amenities: [
			"Cyc Wall",
			"Lighting Kit",
			"Backdrop Rolls",
			"Makeup Station",
			"Wi-Fi",
			"Air Conditioning",
		],
		overview:
			"A 1,400 sq ft white cyclorama wall with north-facing windows and a full strobe kit on site. Popular with e-commerce teams, lookbook shoots and portrait photographers who need clean, repeatable results.",
	},
	{
		title: "Daylight Loft Photography",
		category: "Photo Studio",
		hourlyRate: 48,
		securityDeposit: 100,
		capacity: 8,
		location: "House 12, Road 27, Dhanmondi, Dhaka",
		amenities: [
			"Natural Light",
			"Props Library",
			"Backdrop Rolls",
			"Wi-Fi",
			"Kitchenette",
		],
		overview:
			"A bright corner loft with floor-to-ceiling windows, linen drapes and a small props library. Ideal for lifestyle, food and maternity shoots that rely on soft daylight.",
	},
	{
		title: "Stage 9 Sound Stage",
		category: "Film & Sound Stage",
		hourlyRate: 240,
		securityDeposit: 800,
		capacity: 40,
		location: "1180 Cahuenga Blvd, Los Angeles, CA",
		amenities: [
			"Soundproofing",
			"Green Screen",
			"Lighting Grid",
			"Loading Dock",
			"Green Room",
			"Parking",
		],
		overview:
			"A 4,000 sq ft soundproofed stage with a 16 ft lighting grid, built-in green screen and drive-in loading dock. Handles commercials, short films and music videos with full crews.",
	},
	{
		title: "The Black Box Film Stage",
		category: "Film & Sound Stage",
		hourlyRate: 135,
		securityDeposit: 400,
		capacity: 25,
		location: "Unit 4, 22 Hackney Wick, London",
		amenities: [
			"Blackout Curtains",
			"Monitor Wall",
			"Lighting Kit",
			"Green Room",
			"Wi-Fi",
			"Air Conditioning",
		],
		overview:
			"A fully blacked-out studio with a motorised rail system for backdrops and a client monitor wall. Great for short-form content, fashion films and interview setups.",
	},
	{
		title: "Soft Spoken Podcast Lounge",
		category: "Podcast Lounge",
		hourlyRate: 35,
		securityDeposit: 60,
		capacity: 5,
		location: "88 South Congress Ave, Austin, TX",
		amenities: [
			"Acoustic Treatment",
			"Broadcast Mics",
			"Video Recording",
			"Wi-Fi",
			"Air Conditioning",
		],
		overview:
			"A cosy treated room with four Shure broadcast mics, a mixer and a three-camera video setup. Your episode is ready to publish when you leave, with files delivered to your drive.",
	},
	{
		title: "Talkback Studios",
		category: "Podcast Lounge",
		hourlyRate: 42,
		securityDeposit: 80,
		capacity: 6,
		location: "Oranienstrasse 14, Kreuzberg, Berlin",
		amenities: [
			"Acoustic Treatment",
			"Broadcast Mics",
			"Guest Lounge",
			"Wi-Fi",
			"Kitchenette",
		],
		overview:
			"Two connected rooms let hosts and remote guests record side by side. Includes an engineer on request, a guest lounge and fast uploads for same-day releases.",
	},
	{
		title: "Reverb Room Recording Suite",
		category: "Music Suite",
		hourlyRate: 75,
		securityDeposit: 200,
		capacity: 10,
		location: "420 Broadway, Nashville, TN",
		amenities: [
			"Mixing Console",
			"Instruments",
			"Soundproofing",
			"Isolation Booth",
			"Wi-Fi",
			"24/7 Access",
		],
		overview:
			"A tracking room, isolation booth and control room built around an analog console. Backline guitars, keys and a drum kit are included, so bands can arrive with just their ideas.",
	},
	{
		title: "Velvet Tone Production Suite",
		category: "Music Suite",
		hourlyRate: 95,
		securityDeposit: 250,
		capacity: 12,
		location: "17 Rue Oberkampf, Paris",
		amenities: [
			"Mixing Console",
			"Acoustic Treatment",
			"Vocal Booth",
			"Instruments",
			"Green Room",
			"Air Conditioning",
		],
		overview:
			"A producer-focused suite with Genelec monitoring, a vocal booth and a deep outboard collection. Suited to mixing sessions, vocal tracking and beat-making workshops.",
	},
	{
		title: "Clay & Canvas Workshop",
		category: "Art Workshop",
		hourlyRate: 30,
		securityDeposit: 50,
		capacity: 15,
		location: "112 Gertrude St, Fitzroy, Melbourne",
		amenities: [
			"Easels",
			"Pottery Wheels",
			"Kiln Access",
			"Sink Stations",
			"Wi-Fi",
			"Wheelchair Access",
		],
		overview:
			"A spill-friendly studio with eight pottery wheels, a shared kiln and easels for up to fifteen people. Book it for classes, brand workshops or a private creative evening.",
	},
	{
		title: "Inkwell Print & Paint Atelier",
		category: "Art Workshop",
		hourlyRate: 38,
		securityDeposit: 70,
		capacity: 12,
		location: "Road 11, Banani, Dhaka",
		amenities: [
			"Printing Press",
			"Easels",
			"Natural Light",
			"Sink Stations",
			"Kitchenette",
			"Air Conditioning",
		],
		overview:
			"A tall-ceilinged atelier with a tabletop etching press, screen-print frames and generous natural light. Used by illustrators, art teachers and small makers who need room to work large.",
	},
];

const REVIEWERS = [
	["Maya Rahman", "maya.rahman@example.com"],
	["Daniel Ortiz", "daniel.ortiz@example.com"],
	["Priya Nair", "priya.nair@example.com"],
	["Tom Becker", "tom.becker@example.com"],
	["Sara Lindqvist", "sara.lindqvist@example.com"],
];
const REVIEW_TEXT = {
	"Photo Studio": [
		"Clean white wall, lights were already set up, and the host answered every question before we arrived.",
		"Great natural light and plenty of room for our whole crew. Easy booking and easy load-in.",
		"Exactly as pictured. We finished a full catalogue shoot in four hours without any surprises.",
	],
	"Film & Sound Stage": [
		"The stage was quiet, the grid was ready and the host helped with power. Smooth day of shooting.",
		"Spacious and professional. Loading in gear was simple and the green room kept talent comfortable.",
		"Good value for a full crew day. We will book again for our next campaign.",
	],
	"Podcast Lounge": [
		"Audio was crisp from the first minute. The video setup saved us hours of editing.",
		"Comfortable for guests and very quiet. Files were delivered straight after the session.",
		"Perfect for a weekly show. Booking the same slot each week has been painless.",
	],
	"Music Suite": [
		"The console sounds fantastic and the room is dead quiet. We tracked three songs in one session.",
		"Great monitoring and a friendly host who knows the gear. Vocals came out beautifully.",
		"Backline gear was in great shape, so we travelled light. Highly recommended.",
	],
	"Art Workshop": [
		"Lots of space, great light and the host had everything ready. Our class loved it.",
		"Easy to clean up and well equipped. A lovely room to teach in.",
		"Perfect for our team workshop. Everyone found a spot to work comfortably.",
	],
};

(async () => {
	const db = await getDb();
	const ownerEmail = process.env.SEED_OWNER_EMAIL || "nisha@studiospace.dev";
	const ownerName = process.env.SEED_OWNER_NAME || "Lutfun Nahar Nisha";

	const old = await db
		.collection("studios")
		.find({ seeded: true })
		.project({ _id: 1 })
		.toArray();
	const oldIds = old.map((s) => s._id);
	if (oldIds.length) {
		await Promise.all([
			db.collection("studios").deleteMany({ _id: { $in: oldIds } }),
			db.collection("reviews").deleteMany({ studioId: { $in: oldIds } }),
			db.collection("wishlist").deleteMany({ studioId: { $in: oldIds } }),
			db.collection("bookings").deleteMany({ studioId: { $in: oldIds } }),
		]);
	}

	let n = 0;
	for (const [i, s] of STUDIOS.entries()) {
		const imgs = POOL[s.category].map(U);
		const texts = REVIEW_TEXT[s.category];
		const stars = [5, 4, 5].map((v, k) => (i % 3 === 2 && k === 1 ? 5 : v));
		const rating =
			Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) /
			10;
		const created = new Date(Date.now() - i * 86400000 * 3);
		const { insertedId } = await db.collection("studios").insertOne({
			...s,
			image: imgs[0],
			gallery: imgs.slice(1),
			rating,
			reviewCount: stars.length,
			ownerEmail,
			ownerName,
			ownerImage: "",
			seeded: true,
			createdAt: created,
		});
		await db.collection("reviews").insertMany(
			stars.map((rating_, k) => ({
				studioId: insertedId,
				userEmail: REVIEWERS[(i + k) % REVIEWERS.length][1],
				userName: REVIEWERS[(i + k) % REVIEWERS.length][0],
				userImage: "",
				rating: rating_,
				comment: texts[k],
				createdAt: new Date(created.getTime() + (k + 1) * 86400000),
			})),
		);
		n += 1;
	}
	console.log(`Seeded ${n} studios for ${ownerEmail}`);
	process.exit(0);
})().catch((e) => {
	console.error("Seed failed:", e.message);
	process.exit(1);
});
