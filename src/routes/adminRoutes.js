const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Apply middleware to all routes
router.use(requireAuth, requireAdmin);

// Admin dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/stats', adminController.getStats);

// Vehicle management
router.get('/vehicles', adminController.getVehiclesAdmin);
router.get('/vehicles/new', adminController.getVehicleForm);
router.get('/vehicles/:id', adminController.getVehicleDetailAdmin);
router.post('/vehicles', adminController.createVehicle);
router.put('/vehicles/:id', adminController.updateVehicle);
router.delete('/vehicles/:id', adminController.deleteVehicle);

// Booking management
router.get('/bookings', adminController.getBookingsAdmin);
router.put('/bookings/:id/status', adminController.updateBookingStatus);

// Broadcast management
router.get('/broadcasts', adminController.getBroadcastsAdmin);
router.post('/broadcasts', adminController.createBroadcast);

// Vehicle request management
router.get('/vehicle-requests', adminController.getVehicleRequests);
router.put('/vehicle-requests/:id/status', adminController.updateVehicleRequestStatus);

module.exports = router;