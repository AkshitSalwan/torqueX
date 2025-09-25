/**
 * Deal Controller
 * Handles creating and managing special deals
 */

// Get deals admin page
exports.getDealsAdmin = async (req, res) => {
  try {
    const deals = await req.prisma.deal.findMany({
      orderBy: {
        validUntil: 'desc'
      }
    });
    
    res.render('admin/deals', {
      title: 'Manage Deals',
      deals,
      user: req.user,
      successMessage: req.flash('success'),
      errorMessage: req.flash('error')
    });
  } catch (error) {
    console.error('Admin deals error:', error);
    res.status(500).render('error', { 
      message: 'Error loading deals',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
};

// Create a new deal
exports.createDeal = async (req, res) => {
  try {
    const {
      code,
      discount,
      description,
      validFrom,
      validUntil,
      isActive
    } = req.body;

    // Validate required fields
    if (!code || !discount || !validFrom || !validUntil) {
      req.flash('error', 'Missing required fields');
      return res.redirect('/admin/deals');
    }

    const deal = await req.prisma.deal.create({
      data: {
        code,
        discount: Number(discount),
        description,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: isActive === 'on'
      }
    });

    req.flash('success', 'Deal created successfully!');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Error creating deal:', error);
    req.flash('error', `Failed to create deal: ${error.message}`);
    res.redirect('/admin/deals');
  }
};

// Update a deal
exports.updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount,
      description,
      validFrom,
      validUntil,
      isActive
    } = req.body;

    // Validate required fields
    if (!code || !discount || !validFrom || !validUntil) {
      req.flash('error', 'Missing required fields');
      return res.redirect('/admin/deals');
    }

    const deal = await req.prisma.deal.update({
      where: { id: Number(id) },
      data: {
        code,
        discount: Number(discount),
        description,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: isActive === 'on'
      }
    });

    req.flash('success', 'Deal updated successfully!');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Error updating deal:', error);
    req.flash('error', `Failed to update deal: ${error.message}`);
    res.redirect('/admin/deals');
  }
};

// Delete a deal
exports.deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    await req.prisma.deal.delete({
      where: { id: Number(id) }
    });

    req.flash('success', 'Deal deleted successfully!');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Error deleting deal:', error);
    req.flash('error', `Failed to delete deal: ${error.message}`);
    res.redirect('/admin/deals');
  }
};

// Get active deals
exports.getActiveDeals = async (req, res) => {
  try {
    const activeDeals = await req.prisma.deal.findMany({
      where: {
        validUntil: {
          gte: new Date()
        }
      },
      orderBy: {
        validUntil: 'asc'
      }
    });
    
    res.status(200).json({ 
      success: true, 
      deals: activeDeals 
    });
  } catch (error) {
    console.error('Get active deals error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting active deals' 
    });
  }
};