# TorqueX - Car Rental Application

A full-stack car rental application built with Node.js, Express.js, EJS templates, Tailwind CSS, PostgreSQL (via Prisma ORM), and Clerk for authentication.

## Features

- **Authentication & Authorization**: Secure login/signup with Clerk and role-based access (admin, user)
- **Vehicle Listings**: Browse vehicles with filters for type, price, and availability
- **Booking System**: Book vehicles for specific dates with automatic price calculation
- **User Dashboard**: View bookings, leave reviews, and manage profile
- **Admin Dashboard**: Manage vehicles, bookings, and send broadcasts to users
- **Real-time Notifications**: Socket.io integration for admin broadcasts
- **Reviews & Ratings**: Users can rate and review vehicles after rental completion

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templates, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Real-time Communication**: Socket.io
- **Payments**: Stripe (integration ready)

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