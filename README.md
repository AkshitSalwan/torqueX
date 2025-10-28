````markdown
# TorqueX - Premium Car Rental Platform

A modern, full-featured car rental web application built with Node.js, Express.js, PostgreSQL, Stripe payment integration, and Clerk authentication.

## ✨ Features Implemented

- ✅ **Authentication & Authorization**: Secure login/signup with Clerk and role-based access (admin, user)
- ✅ **Vehicle Listings**: Browse vehicles with advanced filters for type, price, and availability
- ✅ **Booking System**: Complete booking workflow with date selection and automatic price calculation
- ✅ **Payment Processing**: Stripe integration for secure credit card payments
- ✅ **User Dashboard**: View bookings, leave reviews, and manage profile
- ✅ **Admin Dashboard**: Manage vehicles, bookings, and send broadcasts to users
- ✅ **Real-time Notifications**: Socket.io integration for instant updates
- ✅ **Customer Support**: Built-in chatbot for 24/7 support
- ✅ **Input Validation**: Comprehensive server and client-side validation
- ✅ **Error Logging**: Centralized logging system for debugging
- ✅ **Mobile Responsive**: Full mobile support with Tailwind CSS

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templates, Tailwind CSS, Alpine.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk (with fallback session auth)
- **Payments**: Stripe integration
- **Real-time**: Socket.io
- **Validation**: Custom validators & loggers
- **Development**: Nodemon, Morgan logging

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/torqueX.git
   cd torqueX
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy the `.env.example` file to `.env`
   - Update the variables with your own values:
     - Database connection string
     - Clerk API keys (get from [clerk.com](https://clerk.com))
     - Stripe keys (if implementing payments)

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Create test users and admin accounts**
   ```bash
   # Create admin user
   npm run create:admin
   
   # Create test users (includes admin and regular user accounts)
   npm run create:test-users
   
   # Or create all accounts at once
   npm run setup:demo
   ```
   
7. **Build CSS (in a separate terminal)**
   ```bash
   npm run build:css
   ```

8. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - Use the credentials in `CREDENTIALS.md` to log in

## 🔐 Security Features

### Cryptography & Hashing
- **Password Hashing**: PBKDF2-SHA512 with 100,000 iterations and unique salt
- **Data Encryption**: AES-256-GCM for sensitive user data (phone, address, payment methods)
- **Promo Code Hashing**: SHA-256 with timing-safe comparison
- **Token Generation**: Cryptographically secure tokens for reset/verification
- **HMAC Signatures**: Data integrity verification for sensitive operations

### Security Middleware
- **Security Headers**: Prevents clickjacking, MIME sniffing, XSS attacks
- **CSRF Protection**: Token-based CSRF protection on all forms
- **Input Sanitization**: HTML tag removal and XSS prevention
- **Rate Limiting**: Prevents brute force attacks
- **SQL Injection Prevention**: Query validation and sanitization
- **Audit Logging**: Tracks sensitive operations for security audits

### Data Protection
- Sensitive user data encrypted at rest
- Payment information encrypted and not stored directly (Stripe tokens)
- Secure session handling with HTTPOnly cookies
- Password verification using timing-safe comparison

### Compliance
- ✅ PCI DSS compliant payment processing
- ✅ OWASP Top 10 protections
- ✅ GDPR personal data encryption
- ✅ SOC 2 security standards

For detailed security documentation, see [SECURITY.md](./SECURITY.md).

### Environment Variables for Security
```env
# Encryption key (64 hex characters)
ENCRYPTION_KEY=your-64-hex-char-encryption-key

# Session secret (min 32 characters)
SESSION_SECRET=your-session-secret-min-32-chars
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔐 New Features

### Stripe Payment Integration
- Secure payment processing with Stripe
- PCI-DSS compliant
- Support for test cards
- Webhook handling for payment confirmations
- Payment logging and error tracking

### Input Validation System
- Comprehensive validation utilities (`src/utils/validators.js`)
- Email, phone, date, price, credit card validation
- Booking, review, user profile validation
- Prevents SQL injection and XSS attacks
- Client and server-side validation

### Logging System
- Centralized logging (`src/utils/logger.js`)
- Error, warning, info, and debug levels
- File-based log storage with daily rotation
- Colorized console output in development
- Specific logging functions for bookings, payments, authentication

### Booking Views
- Professional booking form with price calculation
- Secure payment page with Stripe integration
- Confirmation page with booking details
- Special requests and promo code support
- Responsive design for all devices

## Clerk Authentication Setup

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Configure your application settings:
   - Enable Email/Password authentication
   - Set up social providers (optional)
   - Configure the redirect URLs:
     - Sign-in redirect: `/auth/callback`
     - Sign-up redirect: `/auth/callback`
4. Copy your API keys to your `.env` file:
   ```
   CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key
   ```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models include:

- **User**: User accounts with role-based access
- **Vehicle**: Car/vehicle listings with details and availability
- **Booking**: Rental reservations with dates and status
- **Review**: User reviews for vehicles after rental
- **Deal**: Special offers and discounts
- **Broadcast**: Admin messages to users

## Project Structure

- `/bin` - Server startup scripts
- `/prisma` - Database schema and migrations
- `/public` - Static assets (CSS, JavaScript, images)
- `/src` 
  - `/controllers` - Route handlers
  - `/middleware` - Custom middleware functions
  - `/routes` - API routes
  - `/utils` - Helper functions
  - `/views` - EJS templates
    - `/partials` - Reusable template components
    - `/admin` - Admin-specific views
    - `/auth` - Authentication views
    - `/user` - User-specific views
    - `/vehicles` - Vehicle listing views

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.