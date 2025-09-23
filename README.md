# torqueX
Task:
Build a full-stack professional car & vehicle renting web app named TorqueX using the following tech stack and requirements.

📦 Tech Stack

Backend: Node.js + Express.js

Frontend: EJS templates with Tailwind CSS

Database: PostgreSQL (via Prisma ORM)

Authentication: Clerk (email/password & social login)

Real-Time: Socket.io (WebSockets) for admin-to-user broadcasts

🏗️ Project Overview

Create a production-ready web app for renting cars and vehicles with two main user roles:

Admin – Manage vehicles, bookings, reviews, deals, and broadcast daily offers.

User – Browse vehicles, book rentals, view history, receive admin broadcasts, and leave reviews after returning a vehicle.

🔑 Core Features

✅ Authentication & Authorization

Integrate Clerk Auth for secure login/signup with role-based access (admin, user).

Use Clerk middleware to protect routes and manage sessions inside Express.

✅ Vehicle Listings

Display all available vehicles with filters for type, location, price, and availability.

Individual vehicle pages with specs, rental price/day, and customer reviews.

✅ Booking System

Users can book vehicles with a start/end date.

Real-time availability check before confirmation.

Booking summary and payment integration (Stripe/Razorpay).

✅ Admin Dashboard

Add/update/delete vehicles.

Manage bookings and approve/cancel requests.

Create “Deal of the Day” offers with discount percentage and expiry.

Broadcast System: Send real-time messages (daily discounts, special offers) to all connected users using Socket.io.

✅ User Dashboard

View current, upcoming, and past bookings.

Download invoices.

Receive live broadcast notifications.

✅ Review System

Users who completed a booking can post reviews with star ratings.

Display average ratings on vehicle pages.

✅ Homepage & Extras

Beautiful landing page with hero section, search bar, and FAQ.

Meaningful footer with links to Instagram and WhatsApp.

About page and Contact page.

🗂️ Database Schema (Prisma + PostgreSQL)

User: id, clerkId, name, email, role, createdAt

Vehicle: id, name, type, specs, pricePerDay, availability, images[], createdAt

Booking: id, userId, vehicleId, startDate, endDate, status, totalPrice

Review: id, bookingId, userId, vehicleId, rating, comment

Deal: id, title, description, discountPercent, validUntil

Broadcast: id, adminId, message, createdAt

🛠️ Implementation Details

Scaffold an Express app with EJS (npx express-generator --view=ejs torqueX).

Add Tailwind CSS for responsive UI.

Integrate Prisma with PostgreSQL and define the schema above.

Implement Clerk middleware for authentication.

Add Socket.io for real-time broadcast from admin dashboard to all users.

Build reusable EJS partials for navbar, footer, and FAQ.

Use environment variables for database credentials, Clerk keys, and Stripe/Razorpay keys.

Follow MVC folder structure (routes/, controllers/, views/, models/).

Seed sample vehicle data for testing.

🎯 Deliverables

Fully functional Express + EJS web app with Tailwind styling.

Role-based dashboards (admin/user).

Secure login & signup with Clerk.

PostgreSQL database with Prisma migrations.

Real-time broadcast notifications using Socket.io.

Responsive, production-quality UI with FAQ and social links in footer.
