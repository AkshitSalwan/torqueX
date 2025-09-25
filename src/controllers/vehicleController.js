/**
 * Vehicle Controller
 * Handles vehicle listings and individual vehicle details
 */

// Get all vehicles with optional filtering
exports.getAllVehicles = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { type, minPrice, maxPrice, available } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerDay.lte = parseFloat(maxPrice);
    }
    
    if (available === 'true') {
      filter.availability = true;
    }
    
    // Get vehicles with filters
    const vehicles = await req.prisma.vehicle.findMany({
      where: filter,
      orderBy: {
        pricePerDay: 'asc'
      }
    });
    
    // Get all available types for filter options
    const types = await req.prisma.vehicle.findMany({
      select: {
        type: true
      },
      distinct: ['type']
    });
    
    res.render('vehicles/index', { 
      title: 'Browse Vehicles',
      vehicles,
      types: types.map(t => t.type),
      filters: req.query,
      user: req.user || null
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Error loading vehicles',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.user || null
    });
  }
};

// Get a single vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get vehicle with reviews
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id },
      include: {
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
    
    // Calculate average rating
    let avgRating = 0;
    if (vehicle.reviews.length > 0) {
      avgRating = vehicle.reviews.reduce((sum, review) => sum + review.rating, 0) / vehicle.reviews.length;
    }
    
    // Check if user has booked this vehicle before
    let userHasBooked = false;
    if (req.user) {
      const booking = await req.prisma.booking.findFirst({
        where: {
          userId: req.user.id,
          vehicleId: id,
          status: 'COMPLETED'
        }
      });
      userHasBooked = !!booking;
    }
    
    res.render('vehicles/detail', { 
      title: vehicle.name,
      vehicle,
      avgRating,
      userHasBooked,
      user: req.user || null
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Error loading vehicle details',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.user || null
    });
  }
};