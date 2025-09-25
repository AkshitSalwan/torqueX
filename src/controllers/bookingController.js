/**
 * Booking Controller
 * Handles booking creation, status updates, and viewing
 */

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { vehicleId, startDate, endDate } = req.body;
    const userId = req.user.id;
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date must be after start date' 
      });
    }
    
    if (start < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date cannot be in the past' 
      });
    }
    
    // Calculate rental duration in days
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Get vehicle details
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found' 
      });
    }
    
    if (!vehicle.availability) {
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
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle is already booked for the selected dates' 
      });
    }
    
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
    
    // Redirect to payment page or booking summary
    res.status(200).json({ 
      success: true, 
      booking, 
      redirectUrl: `/bookings/${booking.id}/payment` 
    });
  } catch (error) {
    console.error('Create booking error:', error);
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
        vehicle: true
      }
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
    
    // In a real app, process payment with Stripe here
    // For demo purposes, just mark as confirmed
    
    // Update booking status
    const updatedBooking = await req.prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED'
      }
    });
    
    res.status(200).json({ 
      success: true, 
      booking: updatedBooking, 
      redirectUrl: `/bookings/${id}/confirmation` 
    });
  } catch (error) {
    console.error('Process payment error:', error);
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