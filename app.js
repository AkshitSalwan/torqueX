require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { PrismaClient } = require('@prisma/client');
const { createClerkClient, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const flash = require('connect-flash');
const session = require('express-session');
const methodOverride = require('method-override');

// Import security middleware
const securityMiddleware = require('./src/middleware/securityMiddleware');

// Import routes
const indexRouter = require('./src/routes/indexRoutes');
const authRouter = require('./src/routes/authRoutes');
const vehicleRouter = require('./src/routes/vehicleRoutes');
const bookingRouter = require('./src/routes/bookingRoutes');
const reviewRouter = require('./src/routes/reviewRoutes');
const adminRouter = require('./src/routes/adminRoutes');
const dealRouter = require('./src/routes/dealRoutes');
const testRouter = require('./src/routes/testRoutes');
const userRouter = require('./src/routes/userRoutes');
const webhookRouter = require('./src/routes/webhookRoutes');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Clerk
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');

// ===== Security Middleware (apply first for maximum protection) =====
app.use(securityMiddleware.securityHeaders);           // Set security headers
app.use(securityMiddleware.preventSQLInjection);       // Prevent SQL injection
app.use(securityMiddleware.requestLogging);            // Log all requests

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method')); // Add support for PUT/DELETE in forms
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session and flash middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'torquex-secret',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(flash());

// ===== Additional Security Middleware =====
app.use(securityMiddleware.sanitizeInput);             // Sanitize user input
app.use(securityMiddleware.csrfProtection);            // CSRF protection
app.use(securityMiddleware.verifyDataIntegrity);       // Verify data integrity

// Make Prisma and Clerk available in all routes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.clerk = clerk;
  
  // Add flash messages to response locals
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  
  // We'll be handling Clerk initialization directly in the header template
  // to avoid any issues with environment variables not being properly passed
  
  next();
});

// Add Clerk authentication to all routes
app.use(ClerkExpressWithAuth());

// Add populateUser middleware to add user to all requests
const { populateUser } = require('./src/middleware/authMiddleware');
app.use(populateUser);

// Routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/vehicles', vehicleRouter);
app.use('/bookings', bookingRouter);
app.use('/reviews', reviewRouter);
app.use('/admin', adminRouter);
app.use('/deals', dealRouter);
app.use('/test', testRouter);
app.use('/user', userRouter);
app.use('/webhooks', webhookRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { 
    title: 'Error',
    user: req.user || null
  });
});

module.exports = app;