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
    
    // Get bookings with different statuses
    const pendingBookingsCount = await req.prisma.booking.count({
      where: {
        status: 'PENDING'
      }
    });
    
    const confirmedBookingsCount = await req.prisma.booking.count({
      where: {
        status: 'CONFIRMED'
      }
    });
    
    const completedBookingsCount = await req.prisma.booking.count({
      where: {
        status: 'COMPLETED'
      }
    });
    
    const cancelledBookingsCount = await req.prisma.booking.count({
      where: {
        status: 'CANCELLED'
      }
    });
    
    // Combine pending and confirmed for "active" bookings
    const activeBookingsCount = pendingBookingsCount + confirmedBookingsCount;
    
    // Get total bookings count
    const totalBookingsCount = await req.prisma.booking.count();
    
    // Get recent bookings
    const recentBookings = await req.prisma.booking.findMany({
      take: 5,
      orderBy: {
        id: 'desc'  // Using id as a proxy for creation time since createdAt doesn't exist
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
        id: 'desc'  // Using id as a proxy for creation time
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
    // Since there's no createdAt field in the Booking model, we'll get all bookings
    const currentMonthRevenue = await req.prisma.booking.aggregate({
      _sum: {
        totalPrice: true
      }
    });
    
    // For previous month, we'll also use all bookings
    // In a real app, you would use the booking startDate or endDate instead
    const previousMonthRevenue = await req.prisma.booking.aggregate({
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

    // Get new users this month - since there's no createdAt field, just count all users
    const now = new Date();
    const newUsers = await req.prisma.user.count({
      where: {
        role: 'USER'
      }
    });
    
    // Calculate average booking value
    let avgBookingValue = 0;
    if (totalBookingsCount > 0 && totalRevenue?._sum?.totalPrice) {
      avgBookingValue = totalRevenue._sum.totalPrice / totalBookingsCount;
    }
    
    // Process vehicle request stats
    let requestStats = {};
    if (vehicleRequestStats && vehicleRequestStats.length > 0) {
      vehicleRequestStats.forEach(stat => {
        requestStats[stat.status.toLowerCase()] = stat._count;
      });
    }

    // Format the vehicle stats for the dashboard
    const vehicleStatsFormatted = {
      total: vehicleCount,
      available: vehicleCount || 0, // Replace with actual count if available
      unavailable: 0, // Replace with actual count if available
      byType: vehicleTypes || []
    };
    
    // Format vehicle request stats
    const vehicleRequestStatsFormatted = {
      pending: requestStats?.pending || 0
    };

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {
        users: userCount,
        totalUsers: userCount,
        vehicles: vehicleCount,
        activeBookings: activeBookingsCount,
        totalBookings: totalBookingsCount,
        pendingBookings: pendingBookingsCount,
        confirmedBookings: confirmedBookingsCount,
        completedBookings: completedBookingsCount,
        cancelledBookings: cancelledBookingsCount,
        vehicleStats: vehicleStatsFormatted,
        vehicleRequestStats: vehicleRequestStatsFormatted,
        newUsers: newUsers || 0,
        growthRate: growthRate || 0,
        monthlyRevenue: currentMonthRevenue && currentMonthRevenue._sum ? currentMonthRevenue._sum.totalPrice || 0 : 0
      },
      recentBookings,
      recentReviews,
      popularVehicles,
      recentVehicleRequests,
      requestStats: vehicleRequestStats || [],
      revenue: totalRevenue && totalRevenue._sum ? totalRevenue._sum.totalPrice || 0 : 0,
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
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      reviewsCount
    ] = await Promise.all([
      req.prisma.user.count({ where: { role: 'USER' } }),
      req.prisma.vehicle.count(),
      req.prisma.booking.count(),
      req.prisma.booking.count({ where: { status: 'PENDING' } }),
      req.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      req.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      req.prisma.booking.count({ where: { status: 'CANCELLED' } }),
      req.prisma.review.count()
    ]);
    
    // Combine pending and confirmed for "active" bookings
    const activeBookings = pendingBookings + confirmedBookings;
    
    // Deal count (may not exist in schema)
    let dealsCount = 0;
    try {
      dealsCount = await req.prisma.deal.count();
    } catch (e) {
      console.log('Deals table might not exist:', e.message);
    }

    // Revenue calculations
    const totalRevenue = await req.prisma.booking.aggregate({
      _sum: { totalPrice: true }
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Since there's no createdAt field, we'll get all bookings for now
    const monthlyRevenue = await req.prisma.booking.aggregate({
      _sum: { totalPrice: true }
    });

    // Get recent bookings for activity
    const recentBookings = await req.prisma.booking.findMany({
      take: 10,
      orderBy: { id: 'desc' },  // Using id as a proxy for creation time
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
          select: { 
            totalPrice: true,
            status: true 
          }
        }
      },
      orderBy: {
        bookings: { _count: 'desc' }
      }
    });
    
    // Calculate the total number of vehicles for percentage calculations
    const vehicleTypesTotal = vehicleTypes.reduce((sum, vt) => sum + vt._count, 0);    // Format the vehicle types data and calculate total for percentages
    const formattedVehicleTypes = vehicleTypes.map(vt => ({
      type: vt.type,
      count: vt._count
    }));
    
    // Calculate total bookings revenue for top vehicles
    const processedTopVehicles = topVehicles.map(vehicle => {
      // Calculate the total revenue for this vehicle
      const totalRevenueForVehicle = vehicle.bookings.reduce((sum, booking) => {
        return sum + (booking.totalPrice || 0);
      }, 0);
      
      return {
        ...vehicle,
        totalRevenue: totalRevenueForVehicle,
        bookingCount: vehicle._count.bookings
      };
    });
    
    // Handle potential null values from aggregations
    const safeRevenue = totalRevenue && totalRevenue._sum ? totalRevenue._sum.totalPrice || 0 : 0;
    const safeMonthlyRevenue = monthlyRevenue && monthlyRevenue._sum ? monthlyRevenue._sum.totalPrice || 0 : 0;

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
        totalRevenue: safeRevenue,
        monthlyRevenue: safeMonthlyRevenue,
        vehicleTypes: formattedVehicleTypes
      },
      recentBookings,
      topVehicles: processedTopVehicles,
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
    
    // Form might be coming from multipart/form-data or application/json
    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
    console.log('Is multipart form:', isMultipart);
    
    // Debug the form content
    console.log('Form fields received:', Object.keys(req.body));
    
    // Extract form fields
    const { make, model, year, type, pricePerDay, seats, transmission, fuelType, images, features, availability, description } = req.body;
    
    // Check if file was uploaded
    const uploadedFile = req.file;
    console.log('Uploaded file:', uploadedFile ? uploadedFile.filename : 'None');
    
    console.log('Key fields:', {
      make, 
      model, 
      type, 
      pricePerDay: typeof pricePerDay === 'string' ? pricePerDay.substring(0, 10) : pricePerDay,
      seats: typeof seats === 'string' ? seats.substring(0, 10) : seats
    });
    
    // Collect validation errors
    const validationErrors = [];
    
    // Check required fields with more lenient validation
    // And detailed logging for troubleshooting
    if (!make || make.trim() === '') {
      console.log('Make validation failed:', make);
      validationErrors.push('Make is required');
    }
    
    if (!model || model.trim() === '') {
      console.log('Model validation failed:', model);
      validationErrors.push('Model is required');
    }
    
    if (!type || type.trim() === '') {
      console.log('Type validation failed:', type);
      validationErrors.push('Type is required');
    }
    
    if (!pricePerDay || pricePerDay.toString().trim() === '') {
      console.log('Price validation failed:', pricePerDay);
      validationErrors.push('Price per day is required');
    }
    
    // If we have validation errors, return them
    if (validationErrors.length > 0) {
      const errorMsg = validationErrors.join(', ');
      console.log('Validation errors:', errorMsg);
      
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/admin/vehicles/new');
    }
    
    // Convert values to appropriate types - with careful error handling
    let pricePerDayFloat;
    try {
      pricePerDayFloat = parseFloat(pricePerDay);
      if (isNaN(pricePerDayFloat) || pricePerDayFloat <= 0) {
        const errorMsg = 'Price per day must be a valid positive number';
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.status(400).json({ success: false, message: errorMsg });
        }
        req.flash('error', errorMsg);
        return res.redirect('/admin/vehicles/new');
      }
    } catch (e) {
      const errorMsg = 'Invalid price format';
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/admin/vehicles/new');
    }
    
    // Parse numeric fields safely
    const yearInt = parseInt(year) || new Date().getFullYear();
    const seatsInt = parseInt(seats) || 4;
    
    // Construct specs object from form fields with defaults
    const specs = {
      make: make.trim(),
      model: model.trim(),
      year: yearInt,
      seats: seatsInt,
      transmission: transmission || 'Automatic',
      fuelType: fuelType || 'Petrol'
    };
    
    // Process features (could be array or single value)
    let featuresArray = [];
    if (features) {
      featuresArray = Array.isArray(features) ? features : [features];
    }
    
    // Process uploaded image file and images from textarea
    let imagesArray = [];
    
    // Handle uploaded file
    if (req.file) {
      // Add the path to the uploaded image
      const imageUrl = `/images/vehicles/${req.file.filename}`;
      imagesArray.push(imageUrl);
    }
    
    // Parse additional images from textarea (split by newlines)
    if (images && typeof images === 'string') {
      // Split by newlines and filter out empty strings
      const textImages = images
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      imagesArray = [...imagesArray, ...textImages];
    } else if (Array.isArray(images)) {
      const validImages = images.filter(url => url && url.trim().length > 0);
      imagesArray = [...imagesArray, ...validImages];
    }
    
    // If no images were provided, use placeholder
    if (imagesArray.length === 0) {
      imagesArray = ['/images/placeholder-car.jpg'];
    }
    
    try {
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
          availability: availability === 'on' || availability === true || availability === 'true'
        }
      });
      
      console.log('Vehicle created successfully:', vehicle);
      
      // Handle different response types
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(201).json({ 
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
    } catch (dbError) {
      console.error('Database error creating vehicle:', dbError);
      
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ 
          success: false, 
          message: `Database error: ${dbError.message}` 
        });
      }
      
      req.flash('error', `Error saving vehicle: ${dbError.message}`);
      res.redirect('/admin/vehicles/new');
    }
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
    
    console.log('Update vehicle request received:', { id, body: req.body });
    
    // Collect validation errors
    const validationErrors = [];
    
    // Check required fields
    if (!make) validationErrors.push('Make is required');
    if (!model) validationErrors.push('Model is required');
    if (!type) validationErrors.push('Type is required');
    if (!pricePerDay) validationErrors.push('Price per day is required');
    
    // If we have validation errors, return them
    if (validationErrors.length > 0) {
      const errorMsg = validationErrors.join(', ');
      return res.status(400).json({ 
        success: false, 
        message: errorMsg
      });
    }
    
    // Parse numeric values safely
    let pricePerDayFloat;
    try {
      pricePerDayFloat = parseFloat(pricePerDay);
      if (isNaN(pricePerDayFloat) || pricePerDayFloat <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Price per day must be a valid positive number'
        });
      }
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid price format'
      });
    }
    
    // Parse other numeric fields safely
    const yearInt = parseInt(year) || new Date().getFullYear();
    const seatsInt = parseInt(seats) || 4;
    
    // Construct specs object from form fields with defaults
    const specs = {
      make: make.trim(),
      model: model.trim(),
      year: yearInt,
      seats: seatsInt,
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
    
    try {
      // Update vehicle
      const updatedVehicle = await req.prisma.vehicle.update({
        where: { id },
        data: {
          name: `${make} ${model}`,
          type,
          pricePerDay: pricePerDayFloat,
          specs,
          description: description || `${make} ${model} ${yearInt} - ${transmission} ${fuelType}`,
          images: imagesArray,
          features: Array.isArray(features) ? features : features ? [features] : [],
          availability: availability === 'on' || availability === true || availability === 'true'
        }
      });
      
      console.log('Vehicle updated successfully:', updatedVehicle);
      
      // Check if this is an API request or a regular form submission
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(200).json({ 
          success: true, 
          message: `Vehicle ${make} ${model} has been updated successfully.`,
          vehicle: updatedVehicle,
          redirectUrl: '/admin/vehicles'
        });
      }
      
      req.flash('success', `Vehicle ${make} ${model} has been updated successfully.`);
      res.redirect('/admin/vehicles');
    } catch (dbError) {
      console.error('Database error updating vehicle:', dbError);
      
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ 
          success: false, 
          message: `Error updating vehicle: ${dbError.message}` 
        });
      }
      
      req.flash('error', `Error updating vehicle: ${dbError.message}`);
      res.redirect(`/admin/vehicles/${req.params.id}/edit`);
    }
  } catch (error) {
    console.error('Update vehicle error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ 
        success: false, 
        message: `Error updating vehicle: ${error.message}` 
      });
    }
    
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
        startDate: 'desc'
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
    
    // Enhanced logging for debugging
    console.log('Creating broadcast - Request details:', {
      title,
      message,
      userTarget,
      auth: req.auth ? { userId: req.auth.userId } : null,
      user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : null,
      headers: req.headers['content-type'],
      session: req.session ? { id: req.session.id } : null
    });
    
    // Validate input
    if (!message) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }
      req.flash('error', 'Message is required');
      return res.redirect('/admin/broadcasts');
    }
    
    // Check if user is authenticated properly
    if (!req.user || !req.user.id) {
      console.error('Authentication error: Missing user or user ID');
      
      if (req.headers['content-type'] === 'application/json') {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required. Please login again.',
          debug: { 
            auth: req.auth ? { exists: true, userId: req.auth.userId } : null,
            session: req.session ? { exists: true, id: req.session.id } : null
          }
        });
      }
      
      req.flash('error', 'Authentication error: Please log in again');
      return res.redirect('/auth/login');
    }
    
    // Log admin ID before creating broadcast
    console.log('Admin ID for broadcast creation:', req.user.id);
    
    // Create broadcast with explicit adminId handling
    const adminId = req.user.id;
    if (!adminId) {
      throw new Error('Invalid admin ID');
    }
    
    const broadcast = await req.prisma.broadcast.create({
      data: {
        title: title || 'Admin Broadcast',
        message: message || title,
        userTarget: userTarget || 'ALL',
        adminId: adminId
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

// Get deals for admin
exports.getDealsAdmin = async (req, res) => {
  try {
    let deals = [];
    
    // Check if the deals table exists in the schema
    try {
      deals = await req.prisma.deal.findMany({
        orderBy: {
          id: 'desc'
        }
      });
    } catch (error) {
      console.log('Deals table might not exist:', error.message);
      // Table doesn't exist, we'll return an empty array
    }
    
    res.render('admin/deals', {
      title: 'Manage Deals',
      deals,
      user: req.user
    });
  } catch (error) {
    console.error('Admin deals error:', error);
    res.status(500).render('error', { 
      message: 'Error loading deals',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.user
    });
  }
};

// Show form to create a new deal
exports.getNewDealForm = async (req, res) => {
  try {
    res.render('admin/deal-form', {
      title: 'Create New Deal',
      deal: null,
      user: req.user
    });
  } catch (error) {
    console.error('New deal form error:', error);
    res.status(500).render('error', { 
      message: 'Error loading deal form',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.user
    });
  }
};

// Show form to edit an existing deal
exports.getEditDealForm = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the deal to edit
    const deal = await req.prisma.deal.findUnique({
      where: { id }
    });
    
    if (!deal) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Deal not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    res.render('admin/deal-form', {
      title: 'Edit Deal',
      deal,
      user: req.user
    });
  } catch (error) {
    console.error('Edit deal form error:', error);
    res.status(500).render('error', { 
      message: 'Error loading deal form',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.user
    });
  }
};

// Create a new deal
exports.createDeal = async (req, res) => {
  try {
    console.log('Creating deal - Request body:', req.body);
    
    const { 
      title, 
      code, 
      description, 
      discountType, 
      discountValue, 
      minPurchase, 
      validFrom, 
      validUntil,
      usageLimit, 
      vehicleType, 
      isActive 
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields'
      });
    }
    
    // Generate a random code if not provided
    const dealCode = code || `DEAL${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Parse numeric values
    const discountValueNum = parseFloat(discountValue);
    const minPurchaseNum = minPurchase ? parseFloat(minPurchase) : null;
    const usageLimitNum = usageLimit ? parseInt(usageLimit) : null;
    
    // Create the deal
    const deal = await req.prisma.deal.create({
      data: {
        title,
        code: dealCode,
        description,
        discountType,
        discountValue: discountValueNum,
        minPurchase: minPurchaseNum,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        usageLimit: usageLimitNum,
        vehicleType: vehicleType || null,
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('Deal created successfully:', deal);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(201).json({ 
        success: true, 
        message: 'Deal created successfully',
        deal
      });
    }
    
    req.flash('success', 'Deal created successfully');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Create deal error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ 
        success: false, 
        message: `Error creating deal: ${error.message}`
      });
    }
    
    req.flash('error', `Error creating deal: ${error.message}`);
    res.redirect('/admin/deals/new');
  }
};

// Update an existing deal
exports.updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { 
      title, 
      code, 
      description, 
      discountType, 
      discountValue, 
      minPurchase, 
      validFrom, 
      validUntil,
      usageLimit, 
      vehicleType, 
      isActive 
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields'
      });
    }
    
    // Parse numeric values
    const discountValueNum = parseFloat(discountValue);
    const minPurchaseNum = minPurchase ? parseFloat(minPurchase) : null;
    const usageLimitNum = usageLimit ? parseInt(usageLimit) : null;
    
    // Update the deal
    const deal = await req.prisma.deal.update({
      where: { id },
      data: {
        title,
        code,
        description,
        discountType,
        discountValue: discountValueNum,
        minPurchase: minPurchaseNum,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        usageLimit: usageLimitNum,
        vehicleType: vehicleType || null,
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
        updatedAt: new Date()
      }
    });
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(200).json({ 
        success: true, 
        message: 'Deal updated successfully',
        deal
      });
    }
    
    req.flash('success', 'Deal updated successfully');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Update deal error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ 
        success: false, 
        message: `Error updating deal: ${error.message}`
      });
    }
    
    req.flash('error', `Error updating deal: ${error.message}`);
    res.redirect(`/admin/deals/${req.params.id}/edit`);
  }
};

// Delete a deal
exports.deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete the deal
    await req.prisma.deal.delete({
      where: { id }
    });
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(200).json({ 
        success: true, 
        message: 'Deal deleted successfully'
      });
    }
    
    req.flash('success', 'Deal deleted successfully');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Delete deal error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ 
        success: false, 
        message: `Error deleting deal: ${error.message}`
      });
    }
    
    req.flash('error', `Error deleting deal: ${error.message}`);
    res.redirect('/admin/deals');
  }
};