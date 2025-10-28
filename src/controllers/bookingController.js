/**
 * Booking Controller
 * Handles booking creation, status updates, and viewing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const validators = require('../utils/validators');
const logger = require('../utils/logger');
const crypto = require('../utils/crypto');

// Show booking form
exports.getBookingForm = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    
    if (!vehicleId) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'Vehicle ID is required',
        error: { status: 400 },
        user: req.user || null
      });
    }
    
    // Get vehicle details
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });
    
    if (!vehicle) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Vehicle not found',
        error: { status: 404 },
        user: req.user || null
      });
    }
    
    if (!vehicle.availability) {
      return res.status(400).render('error', {
        title: 'Not Available',
        message: 'Vehicle is not available for booking',
        error: { status: 400 },
        user: req.user || null
      });
    }
    
    res.render('bookings/form', {
      title: 'Book Vehicle',
      vehicle,
      vehicleId,
      csrfToken: req.session.csrfToken,
      user: req.user || null
    });
  } catch (error) {
    console.error('Get booking form error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading booking form',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.user || null
    });
  }
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { vehicleId, startDate, endDate } = req.body;
    const userId = req.user.id;
    
    // Validate booking data
    const validation = validators.validateBookingData({
      vehicleId,
      startDate,
      endDate
    });
    
    if (!validation.valid) {
      logger.warn('Booking validation failed', {
        userId,
        vehicleId,
        errors: validation.errors
      });
      return res.status(400).json({ 
        success: false, 
        message: validation.errors.join(', ') 
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get vehicle details
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });
    
    if (!vehicle) {
      logger.warn('Vehicle not found', { vehicleId });
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found' 
      });
    }
    
    if (!vehicle.availability) {
      logger.info('Vehicle unavailable', { vehicleId });
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle is not available for booking' 
      });
    }
    
    // Check for overlapping bookings
    const overlappingBooking = await req.prisma.booking.findFirst({
      where: {
        vehicleId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        },
        OR: [
          {
            startDate: {
              lte: end
            },
            endDate: {
              gte: start
            }
          }
        ]
      }
    });
    
    if (overlappingBooking) {
      logger.info('Overlapping booking found', {
        vehicleId,
        requestedStart: startDate,
        requestedEnd: endDate
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle is already booked for the selected dates' 
      });
    }
    
    // Calculate rental duration in days
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Calculate total price
    const totalPrice = vehicle.pricePerDay * duration;
    
    // Create booking
    const booking = await req.prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'PENDING'
      }
    });
    
    logger.logBookingCreated(booking.id, userId, vehicleId);
    
    // Redirect to payment page or booking summary
    res.status(200).json({ 
      success: true, 
      booking, 
      redirectUrl: `/bookings/${booking.id}/payment` 
    });
  } catch (error) {
    logger.logError('createBooking', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating booking' 
    });
  }
};

// Get booking payment page
exports.getBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await req.prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: true
      }
    });
    
    if (!booking) {
      return res.status(404).render('error', { 
        message: 'Booking not found',
        error: { status: 404 }
      });
    }
    
    if (booking.userId !== req.user.id) {
      return res.status(403).render('error', { 
        message: 'Unauthorized',
        error: { status: 403 }
      });
    }
    
    // Calculate rental duration in days
    const duration = Math.ceil(
      (new Date(booking.endDate) - new Date(booking.startDate)) / 
      (1000 * 60 * 60 * 24)
    );
    
    res.render('bookings/payment', { 
      title: 'Complete Your Booking',
      booking,
      duration,
      user: req.user
    });
  } catch (error) {
    console.error('Get booking payment error:', error);
    res.status(500).render('error', { 
      message: 'Error loading payment page',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Process booking payment
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethodId } = req.body;
    
    const booking = await req.prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: true
      }
    });
    
    if (!booking) {
      logger.warn('Booking not found for payment', { bookingId: id });
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }
    
    if (booking.userId !== req.user.id) {
      logger.warn('Unauthorized payment attempt', {
        bookingId: id,
        userId: req.user.id,
        bookingUserId: booking.userId
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    try {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.totalPrice * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        metadata: {
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
          userId: booking.userId,
          vehicleName: booking.vehicle.name
        },
        description: `Booking for ${booking.vehicle.name} - ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}`
      });

      if (paymentIntent.status === 'succeeded') {
        // Encrypt sensitive payment method details
        const encryptedPaymentMethod = crypto.encryptField(paymentMethodId);
        
        // Update booking status to CONFIRMED with encrypted payment method
        const updatedBooking = await req.prisma.booking.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            paymentIntentId: paymentIntent.id,
            paymentMethod: encryptedPaymentMethod
          }
        });

        logger.logPaymentProcessed(id, booking.totalPrice, 'succeeded');

        // TODO: Send confirmation email

        return res.status(200).json({ 
          success: true, 
          booking: updatedBooking, 
          redirectUrl: `/bookings/${id}/confirmation`,
          paymentIntentId: paymentIntent.id
        });
      } else if (paymentIntent.status === 'requires_action') {
        logger.info('Payment requires additional action', { bookingId: id });
        return res.status(400).json({ 
          success: false, 
          message: 'Payment requires additional action',
          client_secret: paymentIntent.client_secret
        });
      } else {
        logger.warn('Payment failed', {
          bookingId: id,
          status: paymentIntent.status
        });
        return res.status(400).json({ 
          success: false, 
          message: `Payment failed with status: ${paymentIntent.status}`
        });
      }
    } catch (stripeError) {
      logger.logPaymentFailed(id, stripeError);
      return res.status(400).json({ 
        success: false, 
        message: stripeError.message || 'Payment processing failed'
      });
    }
  } catch (error) {
    logger.logError('processPayment', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing payment' 
    });
  }
};

// Get booking confirmation page
exports.getBookingConfirmation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await req.prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: true
      }
    });
    
    if (!booking) {
      return res.status(404).render('error', { 
        message: 'Booking not found',
        error: { status: 404 }
      });
    }
    
    if (booking.userId !== req.user.id) {
      return res.status(403).render('error', { 
        message: 'Unauthorized',
        error: { status: 403 }
      });
    }
    
    res.render('bookings/confirmation', { 
      title: 'Booking Confirmation',
      booking,
      user: req.user
    });
  } catch (error) {
    console.error('Get booking confirmation error:', error);
    res.status(500).render('error', { 
      message: 'Error loading confirmation page',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Get user bookings
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bookings = await req.prisma.booking.findMany({
      where: { userId },
      include: {
        vehicle: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    // Separate bookings by status
    const currentDate = new Date();
    
    const upcomingBookings = bookings.filter(
      booking => 
        (booking.status === 'CONFIRMED' || booking.status === 'PENDING') && 
        new Date(booking.startDate) > currentDate
    );
    
    const activeBookings = bookings.filter(
      booking => 
        booking.status === 'CONFIRMED' && 
        new Date(booking.startDate) <= currentDate && 
        new Date(booking.endDate) >= currentDate
    );
    
    const pastBookings = bookings.filter(
      booking => 
        booking.status === 'COMPLETED' || 
        (booking.status === 'CONFIRMED' && new Date(booking.endDate) < currentDate)
    );
    
    res.render('user/bookings', { 
      title: 'My Bookings',
      upcomingBookings,
      activeBookings,
      pastBookings,
      user: req.user
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).render('error', { 
      message: 'Error loading bookings',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await req.prisma.booking.findUnique({
      where: { id }
    });
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }
    
    if (booking.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    // Only allow cancellation of pending or confirmed bookings
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel booking with current status' 
      });
    }
    
    // Check if cancellation is allowed (e.g., not too close to start date)
    const startDate = new Date(booking.startDate);
    const currentDate = new Date();
    const daysDifference = Math.ceil((startDate - currentDate) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cancellation is not allowed less than 24 hours before start date' 
      });
    }
    
    // Update booking status
    const updatedBooking = await req.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    });
    
    res.status(200).json({ 
      success: true, 
      booking: updatedBooking 
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error cancelling booking' 
    });
  }
};