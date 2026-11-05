# StudioSpace API

Express + MongoDB REST API for the StudioSpace marketplace.

[![Live Demo](https://img.shields.io/badge/Live_Demo-StudioSpace-D4FF00?style=for-the-badge&logo=vercel&logoColor=black)](https://studiospace-client-drab.vercel.app/)
[![Live API](https://img.shields.io/badge/Live_API-StudioSpace-D4FF00?style=for-the-badge&logo=vercel&logoColor=black)](https://studiospace-server-ivory.vercel.app/)

## Security

Every mutation requires a JWT in the HTTPOnly `ss_token` cookie (issued by the Next.js client after BetterAuth verifies the session). Missing or invalid tokens receive `401 Unauthorized`. Owners are enforced server-side (`403`) for edit, delete and host actions.

## Endpoints

| Method      | Route                                 | Auth      | Purpose                           |
| ----------- | ------------------------------------- | --------- | --------------------------------- |
| GET         | `/api/studios`                        | no        | Search, filter, sort, paginate    |
| GET         | `/api/studios/featured`               | no        | Six top-rated / newest studios    |
| GET         | `/api/studios/categories`             | no        | Studio count per category         |
| GET         | `/api/studios/mine`                   | yes       | Listings of the logged-in host    |
| POST        | `/api/studios`                        | yes       | Create a listing                  |
| GET         | `/api/studios/:id`                    | no        | Studio details                    |
| PUT / PATCH | `/api/studios/:id`                    | owner     | Update a listing                  |
| DELETE      | `/api/studios/:id`                    | owner     | Delete a listing (cascades)       |
| GET         | `/api/studios/:id/availability?date=` | no        | Confirmed slots for a date        |
| GET / POST  | `/api/studios/:id/reviews`            | POST: yes | Reviews and ratings               |
| POST        | `/api/bookings`                       | yes       | Request a booking (overlap check) |
| GET         | `/api/bookings/mine`                  | yes       | Guest bookings                    |
| GET         | `/api/bookings/host`                  | yes       | Requests on my studios            |
| PATCH       | `/api/bookings/:id/cancel`            | guest     | Cancel a pending booking          |
| PATCH       | `/api/bookings/:id/status`            | host      | Confirm / complete / cancel       |
| GET         | `/api/wishlist`, `/api/wishlist/ids`  | yes       | Saved studios                     |
| POST        | `/api/wishlist/:studioId`             | yes       | Toggle saved state                |
| GET         | `/api/dashboard/stats`                | yes       | Dashboard numbers                 |

### Core Technologies

- **Node.js (18+)** – JavaScript runtime environment
- **Express.js 4.21** – Lightweight framework for building RESTful APIs
- **MongoDB 6.9** – NoSQL database for data storage and management

### Authentication & Security

- **JSON Web Token (JWT)** – Token-based authentication
- **HTTPOnly Cookies** – Secure storage and transmission of authentication tokens
- **Cookie Parser 1.4** – Cookie parsing middleware
- **CORS 2.8** – Cross-origin resource sharing configuration
- **dotenv 16.4** – Environment variable management

## Run locally

```bash
npm install
cp .env.example .env     # fill in MONGODB_URI, JWT_SECRET, CLIENT_URL
npm run dev              # http://localhost:5000
npm run seed             # optional demo studios
```
