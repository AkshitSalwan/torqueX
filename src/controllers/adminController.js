const { PrismaClient } = require('@prisma/client');

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Get user count
    const userCount = await req.prisma.user.count({
      where: { role: 'USER' }
    });
    
    // Get vehicle count
    const vehicleCount = await req.prisma.vehicle.count();
    
    // Get vehicle types stats
    const vehicleTypes = await req.prisma.vehicle.groupBy({
      by: ['type'],
      _count: true
    });
    
    const vehicleStats = vehicleTypes.map(vt => ({
      type: vt.type,
      count: vt._count
    }));
    
    // Get active bookings count
    const activeBookingsCount = await req.prisma.booking.count({
      where: {
        status: 'ACTIVE'
      }
    });
    
    // Get total bookings count
    const totalBookingsCount = await req.prisma.booking.count();
    
    // Get recent bookings
    const recentBookings = await req.prisma.booking.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        vehicle: true,
        user: true
      }
    });
    
    // Get recent reviews
    const recentReviews = await req.prisma.review.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true,
        vehicle: true
      }
    });
    
    // Get popular vehicles
    const popularVehicles = await req.prisma.vehicle.findMany({
      take: 5,
      orderBy: {
        bookings: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });
    
    // Get recent vehicle requests
    const recentVehicleRequests = await req.prisma.vehicleRequest.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true
      }
    });
    
    // Get vehicle request stats
    const vehicleRequestStats = await req.prisma.vehicleRequest.groupBy({
      by: ['status'],
      _count: true
    });
    
    // Calculate total revenue
    const totalRevenue = await req.prisma.booking.aggregate({
      _sum: {
        totalPrice: true
      }
    });
    
    // Calculate current month revenue
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentMonthRevenue = await req.prisma.booking.aggregate({
      where: {
        createdAt: {
          gte: firstDayOfMonth
        }
      },
      _sum: {
        totalPrice: true
      }
    });
    
    // Calculate previous month revenue
    const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const previousMonthRevenue = await req.prisma.booking.aggregate({
      where: {
        createdAt: {
          gte: firstDayOfPreviousMonth,
          lte: lastDayOfPreviousMonth
        }
      },
      _sum: {
        totalPrice: true
      }
    });
    
    // Calculate growth rate
    let growthRate = 0;
    // Extract values safely, handling null results
    const currentRev = currentMonthRevenue?._sum?.totalPrice || 0;
    const prevRev = previousMonthRevenue?._sum?.totalPrice || 0;
    
    if (prevRev > 0) {
      growthRate = ((currentRev - prevRev) / prevRev) * 100;
    }

    // Get new users this month
    const newUsers = await req.prisma.user.count({
      where: {
        role: 'USER',
        createdAt: { gte: firstDayOfMonth }
      }
    });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {
        userCount,
        totalUsers: userCount,
        newUsers,
        vehicleCount,
        vehicleStats,
        activeBookingsCount,
        totalBookingsCount,
        totalRevenue: totalRevenue?._sum?.totalPrice || 0,
        monthlyRevenue: currentMonthRevenue?._sum?.totalPrice || 0,
        growthRate,
        vehicleRequestStats
      },
      recentBookings,
      recentReviews,
      popularVehicles,
      recentVehicleRequests,
      user: req.user
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', { 
      message: 'Error loading admin dashboard',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Stats page
exports.getStats = async (req, res) => {
  try {
    // Get comprehensive stats for the stats page
    const [
      userCount,
      vehicleCount,
      totalBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      dealsCount,
      reviewsCount
    ] = await Promise.all([
      req.prisma.user.count({ where: { role: 'USER' } }),
      req.prisma.vehicle.count(),
      req.prisma.booking.count(),
      req.prisma.booking.count({ where: { status: 'ACTIVE' } }),
      req.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      req.prisma.booking.count({ where: { status: 'CANCELLED' } }),
      req.prisma.deal.count(),
      req.prisma.review.count()
    ]);

    // Revenue calculations
    const totalRevenue = await req.prisma.booking.aggregate({
      _sum: { totalPrice: true }
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyRevenue = await req.prisma.booking.aggregate({
      where: { createdAt: { gte: firstDayOfMonth } },
      _sum: { totalPrice: true }
    });

    // Get recent bookings for activity
    const recentBookings = await req.prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        vehicle: { select: { name: true, type: true } }
      }
    });

    // Vehicle type distribution
    const vehicleTypes = await req.prisma.vehicle.groupBy({
      by: ['type'],
      _count: true
    });

    // Top performing vehicles
    const topVehicles = await req.prisma.vehicle.findMany({
      take: 5,
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          select: { totalPrice: true }
        }
      },
      orderBy: {
        bookings: { _count: 'desc' }
      }
    });

    res.render('admin/stats', {
      title: 'Statistics Dashboard',
      stats: {
        userCount,
        vehicleCount,
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        dealsCount,
        reviewsCount,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
        monthlyRevenue: monthlyRevenue._sum.totalPrice || 0,
        vehicleTypes: vehicleTypes.map(vt => ({
          type: vt.type,
          count: vt._count
        }))
      },
      recentBookings,
      topVehicles,
      user: req.user
    });
  } catch (error) {
    console.error('Stats page error:', error);
    res.status(500).render('error', { 
      message: 'Error loading statistics',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Get all vehicles for admin
exports.getVehiclesAdmin = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalVehicles = await req.prisma.vehicle.count();
    
    // Get vehicles with pagination
    const vehicles = await req.prisma.vehicle.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.render('admin/vehicles', {
      title: 'Manage Vehicles',
      vehicles,
      user: req.user,
      page,
      limit,
      totalVehicles,
      successMessages: req.flash('success'),
      errorMessages: req.flash('error')
    });
  } catch (error) {
    console.error('Admin vehicles error:', error);
    res.status(500).render('error', { 
      message: 'Error loading vehicles',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Get vehicle detail for admin
exports.getVehicleDetailAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        reviews: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Vehicle not found',
        error: { status: 404 },
        user: req.user || null
      });
    }

    res.render('admin/vehicle-detail', {
      title: `${vehicle.name} - Admin`,
      vehicle,
      user: req.user
    });
  } catch (error) {
    console.error('Admin vehicle detail error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Error loading vehicle details',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.user || null
    });
  }
};

// Create a new vehicle
exports.createVehicle = async (req, res) => {
  try {
    console.log('Form submission received:', req.body);
    console.log('Content type:', req.headers['content-type']);
    
    const { make, model, year, type, pricePerDay, seats, transmission, fuelType, images, features, availability, description } = req.body;
    
    // Validate input
    if (!make || !model || !type || !pricePerDay) {
      const errorMsg = 'Make, model, type, and price are required';
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/admin/vehicles/new');
    }
    
    // Validate additional parameters
    if (!seats || !transmission || !fuelType) {
      const errorMsg = 'All vehicle details are required';
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/admin/vehicles/new');
    }
    
    // Convert values to appropriate types
    const pricePerDayFloat = parseFloat(pricePerDay);
    if (isNaN(pricePerDayFloat) || pricePerDayFloat <= 0) {
      const errorMsg = 'Price per day must be a valid positive number';
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/admin/vehicles/new');
    }
    
    // Construct specs object from form fields
    const specs = {
      make,
      model,
      year: parseInt(year),
      seats: parseInt(seats || 0),
      transmission: transmission || 'Automatic',
      fuelType: fuelType || 'Petrol'
    };
    
    // Process features (could be array or single value)
    let featuresArray = [];
    if (features) {
      featuresArray = Array.isArray(features) ? features : [features];
    }
    
    // Parse images from textarea (split by newlines)
    let imagesArray;
    if (images && typeof images === 'string') {
      // Split by newlines and filter out empty strings
      imagesArray = images
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      if (imagesArray.length === 0) {
        imagesArray = ['/images/placeholder-car.jpg'];
      }
    } else if (Array.isArray(images)) {
      imagesArray = images.filter(url => url && url.trim().length > 0);
      if (imagesArray.length === 0) {
        imagesArray = ['/images/placeholder-car.jpg'];
      }
    } else {
      imagesArray = ['/images/placeholder-car.jpg'];
    }
    
    // Create vehicle
    const vehicle = await req.prisma.vehicle.create({
      data: {
        name: `${make} ${model}`,
        type,
        pricePerDay: pricePerDayFloat,
        specs,
        description: description || `${make} ${model} ${year} - ${transmission} ${fuelType}`,
        images: imagesArray,
        features: featuresArray,
        availability: availability === 'on' || availability === true
      }
    });
    
    console.log('Vehicle created successfully:', vehicle);
    
    // Handle different response types
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ 
        success: true, 
        message: `Vehicle ${make} ${model} has been added successfully.`,
        vehicle: vehicle,
        redirectUrl: '/admin/vehicles'
      });
    }
    
    // Add success flash message for form submission
    req.flash('success', `Vehicle ${make} ${model} has been added successfully.`);
    
    // Redirect to vehicles list
    res.redirect('/admin/vehicles');
  } catch (error) {
    console.error('Create vehicle error:', error);
    
    // Handle different response types
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ 
        success: false, 
        message: `Error creating vehicle: ${error.message}`
      });
    }
    
    req.flash('error', `Error creating vehicle: ${error.message}`);
    res.redirect('/admin/vehicles/new');
  }
};

// Get vehicle form
exports.getVehicleForm = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    let vehicle = null;
    
    if (vehicleId) {
      vehicle = await req.prisma.vehicle.findUnique({
        where: { id: vehicleId }
      });
      
      if (!vehicle) {
        return res.status(404).render('error', { 
          message: 'Vehicle not found',
          error: { status: 404 }
        });
      }
    }
    
    res.render('admin/vehicle-form', { 
      title: vehicle ? 'Edit Vehicle' : 'Add New Vehicle',
      vehicle,
      user: req.user,
      successMessages: req.flash('success'),
      errorMessages: req.flash('error')
    });
  } catch (error) {
    console.error('Get vehicle form error:', error);
    res.status(500).render('error', { 
      message: 'Error loading vehicle form',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Update a vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, year, type, pricePerDay, seats, transmission, fuelType, images, features, availability, description } = req.body;
    
    // Validate input
    if (!make || !model || !type || !pricePerDay) {
      return res.status(400).json({ 
        success: false, 
        message: 'Make, model, type, and price are required' 
      });
    }
    
    // Construct specs object from form fields
    const specs = {
      make,
      model,
      year: parseInt(year),
      seats: parseInt(seats || 0),
      transmission: transmission || 'Automatic',
      fuelType: fuelType || 'Petrol'
    };
    
    // Parse images as array if it's a string
    let imagesArray = images;
    if (typeof images === 'string') {
      try {
        imagesArray = JSON.parse(images);
      } catch (e) {
        imagesArray = [images]; // Treat as single image
      }
    } else if (!images) {
      imagesArray = ['/images/placeholder-car.jpg'];
    }
    
    // Update vehicle
    await req.prisma.vehicle.update({
      where: { id },
      data: {
        name: `${make} ${model}`,
        type,
        pricePerDay: parseFloat(pricePerDay),
        specs,
        description: description || `${make} ${model} ${year} - ${transmission} ${fuelType}`,
        images: imagesArray,
        features: Array.isArray(features) ? features : features ? [features] : [],
        availability: availability === 'on' || availability === true
      }
    });
    
    req.flash('success', `Vehicle ${make} ${model} has been updated successfully.`);
    res.redirect('/admin/vehicles');
  } catch (error) {
    console.error('Update vehicle error:', error);
    req.flash('error', `Error updating vehicle: ${error.message}`);
    res.redirect(`/admin/vehicles/${req.params.id}/edit`);
  }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if vehicle exists
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id }
    });
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found' 
      });
    }
    
    // Delete vehicle
    await req.prisma.vehicle.delete({
      where: { id }
    });
    
    req.flash('success', 'Vehicle has been deleted successfully.');
    res.redirect('/admin/vehicles');
  } catch (error) {
    console.error('Delete vehicle error:', error);
    
    // Check if error is due to foreign key constraint
    if (error.code === 'P2003') {
      req.flash('error', 'Cannot delete vehicle because it has associated bookings or reviews.');
    } else {
      req.flash('error', `Error deleting vehicle: ${error.message}`);
    }
    
    res.redirect('/admin/vehicles');
  }
};

// Get all bookings for admin
exports.getBookingsAdmin = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalBookings = await req.prisma.booking.count();
    
    // Get bookings with pagination
    const bookings = await req.prisma.booking.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true,
        vehicle: true
      }
    });
    
    res.render('admin/bookings', {
      title: 'Manage Bookings',
      bookings,
      user: req.user,
      page,
      limit,
      totalBookings,
      successMessages: req.flash('success'),
      errorMessages: req.flash('error')
    });
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).render('error', { 
      message: 'Error loading bookings',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }
    
    const booking = await req.prisma.booking.update({
      where: { id },
      data: { status }
    });
    
    res.status(200).json({
      success: true,
      booking,
      message: `Booking ${status.toLowerCase()}`
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating booking status' 
    });
  }
};

// Get broadcasts for admin
exports.getBroadcastsAdmin = async (req, res) => {
  try {
    // Get all broadcasts
    const broadcasts = await req.prisma.broadcast.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.render('admin/broadcasts', {
      title: 'Manage Broadcasts',
      broadcasts,
      user: req.user,
      successMessages: req.flash('success'),
      errorMessages: req.flash('error')
    });
  } catch (error) {
    console.error('Admin broadcasts error:', error);
    res.status(500).render('error', { 
      message: 'Error loading broadcasts',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Create a new broadcast
exports.createBroadcast = async (req, res) => {
  try {
    const { title, message, userTarget } = req.body;
    
    // Validate input
    if (!title && !message) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ success: false, error: 'Title and message are required' });
      }
      req.flash('error', 'Title and message are required');
      return res.redirect('/admin/broadcasts');
    }
    
    // Create broadcast
    const broadcast = await req.prisma.broadcast.create({
      data: {
        title: title || 'Admin Broadcast',
        message: message || title,
        userTarget: userTarget || 'ALL'
      }
    });
    
    // Socket.io notification would go here if socket is available
    if (req.app.get('io')) {
      req.app.get('io').emit('broadcast', {
        id: broadcast.id,
        title: broadcast.title,
        message: broadcast.message,
        timestamp: broadcast.createdAt
      });
    }
    
    // Return JSON for API calls, redirect for form submissions
    if (req.headers['content-type'] === 'application/json') {
      return res.json({ 
        success: true, 
        message: 'Broadcast sent successfully',
        broadcast: broadcast
      });
    }
    
    req.flash('success', 'Broadcast has been sent successfully.');
    res.redirect('/admin/broadcasts');
  } catch (error) {
    console.error('Create broadcast error:', error);
    
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ success: false, error: error.message });
    }
    
    req.flash('error', `Error creating broadcast: ${error.message}`);
    res.redirect('/admin/broadcasts');
  }
};

// Get all vehicle requests for admin
exports.getVehicleRequests = async (req, res) => {
  try {
    // Get vehicle requests
    const vehicleRequests = await req.prisma.vehicleRequest.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true
      }
    });
    
    res.render('admin/vehicle-requests', {
      title: 'Vehicle Requests',
      vehicleRequests,
      user: req.user,
      successMessages: req.flash('success'),
      errorMessages: req.flash('error')
    });
  } catch (error) {
    console.error('Admin vehicle requests error:', error);
    res.status(500).render('error', { 
      message: 'Error loading vehicle requests',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Update vehicle request status
exports.updateVehicleRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status'
      });
    }
    
    const vehicleRequest = await req.prisma.vehicleRequest.update({
      where: { id },
      data: { 
        status 
      }
    });
    
    // If the request is approved, we can optionally create a new vehicle
    if (status === 'APPROVED') {
      // You could implement auto-creation of the vehicle here
    }
    
    res.status(200).json({
      success: true,
      vehicleRequest,
      message: `Request ${status.toLowerCase()}`
    });
  } catch (error) {
    console.error('Update vehicle request status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating request status' 
    });
  }
};