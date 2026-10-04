# Wayfarer — South & North India Tour & Travel Booking Web App

An end-to-end travel booking platform featuring multi-step tour reservations, separate payment processing with official UPI & card methods, Google authentication, traveler accounts, printable itinerary slips, and an administrative management dashboard.

---

## Key Features

1. **New 5-Step Booking Flow**:
   - **Step 1 (Select Package)**: View selected package details, high-resolution imagery, destination, season, inclusions, and transparent pricing.
   - **Step 2 (Enter Travel Details)**: Capture full name, email, phone, travel dates, guests (adults, children, rooms), pickup and drop-off transit points, pickup time, and special requests.
   - **Step 3 (Booking Summary & Price Breakdown)**: Itemized base fare, child fare, and 5% GST calculation with instant breakdown before payment.
   - **Step 4 (Dedicated Payment Page)**: Select preferred payment application with official logos and genuine gateway verification.
   - **Step 5 (Booking Confirmation & Itinerary Voucher)**: Unique booking reference generation (`WF-2026-XXXX`), transaction ID, payment receipt, and official booking slip.

2. **Dedicated Payment Processing (`payment.html`)**:
   - Official, watermark-free vector application logos:
     - Google Pay (GPay)
     - PhonePe
     - Paytm
     - BHIM UPI
     - Amazon Pay
     - Other UPI apps & Dynamic QR
     - Credit / Debit Cards (Visa, Mastercard, RuPay)
     - Net Banking (50+ Indian banks)
   - Payment gateway integration:
     - Official **Razorpay Checkout** integration (`checkout.razorpay.com`).
     - Ready-to-use **Verified Sandbox / Demo Gateway Simulator** for testing without needing live API keys immediately.
     - Server-side cryptographic HMAC-SHA256 signature verification before booking confirmation.

3. **User & Admin Authentication**:
   - **Traveler Portal (`login.html`)**:
     - User registration with name, email, phone, and password.
     - Email & password sign-in with salted PBKDF2 encryption.
     - **Google Sign-In** via Google Identity Services (with fallback demo mode).
     - **Traveler Account (`my-bookings.html`)**: Track upcoming and past bookings, view payment status, and download confirmation slips.
   - **Dedicated Admin Login (`admin-login.html`)**:
     - Separate portal restricted strictly to administrators.
     - Role-based session control (`role: 'admin'`). Regular travelers cannot access admin features.

4. **Enhanced Admin Dashboard (`admin.html`)**:
   - Summary statistics cards: Total Bookings, Packages Booked, Confirmed Bookings, Pending Bookings, Total Verified Revenue (₹).
   - **Package Popularity Breakdown**: Visual popularity progress meters and revenue metrics showing how many travelers booked each package.
   - **Bookings Management**: Real-time search by customer name, email, or booking ID; filter by status (Confirmed, Pending, Cancelled).
   - **Individual Booking Detail Modal**: Comprehensive breakdown of guest counts, transit points, notes, payment info, and action buttons.
   - **Payment Records Tab**: Full audit log of verified transactions from the `payments` table.
   - **Packages & Destinations CRUD**: Add, edit, and delete travel packages (with child price, travel hours, pickup/drop locations, accommodation, and day-wise itinerary) and destinations (with South/North India region support).

5. **Official Booking Slip & Day-Wise Travel Itinerary (`booking-slip.html`)**:
   - Printable travel voucher containing:
     - Customer name, contact number, and email.
     - Unique Booking ID (`WF-2026-XXXX`).
     - Package name, destination, and category.
     - Travel start date and return date.
     - Number of travelers (adults, children, rooms).
     - Total amount paid, payment method, and transaction ID.
     - Pickup point and preferred pickup time.
     - Drop-off point and estimated arrival time.
     - Total travel duration in hours.
     - Day-wise itinerary and sightseeing schedule.
     - Hotel and accommodation details.
     - 24x7 agency contact assistance details.
   - Features:
     - One-click **Print / Download PDF** (via optimized `@media print` layout).
     - **Email Confirmation Slip** dispatch via Nodemailer SMTP or verified delivery simulation.

6. **Expanded Travel Destinations & Packages**:
   - **South India**: Munnar, Alleppey, Wayanad, Kochi, Ooty, Kodaikanal, Coorg, Mysore, Hampi, Pondicherry, Rameswaram, Madurai, Goa, Gokarna, Varkala.
   - **North India**: Varanasi, Jaipur, Manali.
   - Authentic, high-resolution imagery and detailed day-by-day itineraries.

7. **Database Persistence**:
   - SQLite backed by `better-sqlite3` stored in `data/wayfarer.db`.
   - Automatic migrations ensure tables (`users`, `admin_users`, `packages`, `destinations`, `bookings`, `payments`, `messages`) persist across server restarts.

---

## Getting Started

### 1. Requirements
- Node.js version 18 or higher.

### 2. Installation
Open your terminal in the `wayfarer` project folder:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` (or customize the existing `.env` file):
```bash
cp .env.example .env
```

Configuration parameters:
```env
PORT=3000
SESSION_SECRET=your-secret-session-key

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=wayfarer123

# Razorpay (Leave blank for verified Sandbox / Demo simulator)
# RAZORPAY_KEY_ID=rzp_test_YourKey
# RAZORPAY_KEY_SECRET=YourSecret

# Google Sign-In (Leave blank for Demo Google Sign-In)
# GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com

# Email Notifications (Optional SMTP)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=notifications@wayfarer.travel
# SMTP_PASS=your-app-password
```

### 4. Running the Server
```bash
npm start
# or for development:
npm run dev
```

The application will be accessible at **http://localhost:3000**.

---

## Default Access & Credentials

- **Traveler Portal**: [http://localhost:3000/login.html](http://localhost:3000/login.html)
  - Demo Account: `traveler@wayfarer.travel` / Password: `travel123`
  - Or click **Create Account** to register a new traveler account.
  - Or click **Continue with Google** for one-tap Google login.
- **Admin Portal**: [http://localhost:3000/admin-login.html](http://localhost:3000/admin-login.html)
  - Admin ID: `admin` / Password: `wayfarer123`
- **Multi-Step Booking**: [http://localhost:3000/book.html](http://localhost:3000/book.html)
- **My Bookings**: [http://localhost:3000/my-bookings.html](http://localhost:3000/my-bookings.html)
- **Admin Dashboard**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## Complete Booking & Payment Flow Walkthrough

```
Home / Packages / Destinations
            │
            ▼
    [Click "Book Now"]
            │
            ▼
   Step 1: Select Package (book.html)
            │
            ▼
   Step 2: Enter Travel & Guest Details
            │
            ▼
   Step 3: Review Booking Summary & Price Breakdown
            │
            ▼
   Step 4: Dedicated Payment Page (payment.html)
           - Select Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, Cards, or Net Banking
           - Initiate Checkout (Razorpay Live or Verified Sandbox)
           - Server-side verification via POST /api/payments/verify
            │
            ▼
   Step 5: Verified Confirmation (confirmation.html)
            │
            ▼
   Official Booking Slip & Itinerary Voucher (booking-slip.html)
           - View all booking, transit, and day-wise schedule details
           - One-click Print or Save as PDF
           - Send Confirmation Email to traveler & notify admin
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register traveler account
- `POST /api/auth/login` — Sign in traveler
- `POST /api/auth/google` — Google Sign-In verification
- `GET /api/auth/me` — Current session status
- `POST /api/auth/logout` — End session
- `GET /api/auth/config` — Public client configuration (Google Client ID, Razorpay Key)

### Admin
- `POST /api/admin/login` — Dedicated admin authentication
- `GET /api/admin/me` — Check admin authorization
- `POST /api/admin/logout` — Admin sign out
- `GET /api/admin/stats` — Metrics, counts, revenue, and package popularity
- `GET /api/admin/payments` — Verified payment transactions log
- `POST /api/admin/change-password` — Change admin password

### Bookings
- `POST /api/bookings` — Create a new multi-step booking
- `GET /api/bookings/my-bookings` — Logged-in traveler's reservations
- `GET /api/bookings/:id` — Single booking details by ID or reference code
- `GET /api/bookings` — All bookings (Admin only)
- `PUT /api/bookings/:id` — Update status (Admin only)
- `DELETE /api/bookings/:id` — Delete booking (Admin only)
- `POST /api/bookings/:id/email-confirmation` — Email confirmation slip to customer

### Payments
- `POST /api/payments/create-order` — Create Razorpay or verified test order
- `POST /api/payments/verify` — Cryptographically verify payment and confirm booking

### MongoDB Database Integration
- `GET /api/admin/mongo-status` — Check MongoDB connection state, cluster info, and collection document counts
- `POST /api/admin/mongo-sync` — Trigger immediate synchronization from SQLite to MongoDB collections
- CLI Command: `npm run sync:mongo` — Standalone synchronization utility for local or Atlas MongoDB

---

## MongoDB Integration & Schemas

Wayfarer now features native **MongoDB** integration with **Mongoose**:

- **Location**: [`db/mongo.js`](file:///c:/Users/Lenovo/Downloads/wayfarer-travel-site-updated/wayfarer/db/mongo.js) and [`db.js`](file:///c:/Users/Lenovo/Downloads/wayfarer-travel-site-updated/wayfarer/db.js).
- **Environment Variable**: Configure `MONGODB_URI` in `.env` (e.g. `mongodb+srv://...` or `mongodb://127.0.0.1:27017/wayfarer`).
- **Mongoose Models**:
  - `Package`: Full tour packages with parsed itinerary, highlights, and transit points.
  - `Destination`: Scenic South & North India destinations.
  - `User`: Traveler accounts with PBKDF2 hashed credentials.
  - `AdminUser`: Administrative user accounts.
  - `Booking`: Reservation records linked with references (`WF-2026-XXXX`).
  - `Payment`: Verified payment transactions, gateway order IDs, and signatures.
  - `Guide`: Tour guides with languages, experience, and ratings.
  - `Message`: Contact inquiries.
  - `Suggestion`: Traveler feedback and category complaints.
  - `OtpCode`: Time-limited OTP codes.
- **Dual-Database Architecture**:
  - Real-time dual-write: New bookings, payments, inquiries, feedback, and user registrations are mirrored to MongoDB automatically when connected.
  - Graceful fallback: If MongoDB is offline, SQLite continues handling requests without downtime.
  - Live Admin Monitor: View connection status and trigger one-click sync directly from the Admin Dashboard.

