const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'images', 'vehicles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Set up multer with storage configuration
const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Apply middleware to all routes
router.use(requireAuth, requireAdmin);

// Admin dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/stats', adminController.getStats);

// Vehicle management
router.get('/vehicles', adminController.getVehiclesAdmin);
router.get('/vehicles/new', adminController.getVehicleForm);
router.get('/vehicles/:id', adminController.getVehicleDetailAdmin);
router.post('/vehicles', upload.single('image'), adminController.createVehicle);
router.put('/vehicles/:id', upload.single('image'), adminController.updateVehicle);
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

// Deal management
router.get('/deals', adminController.getDealsAdmin);
router.get('/deals/new', adminController.getNewDealForm);
router.get('/deals/:id/edit', adminController.getEditDealForm);
router.post('/deals', express.json(), adminController.createDeal);
// Use method-override for PUT and DELETE
router.post('/deals/:id', express.json(), adminController.updateDeal); // Method-override will convert to PUT
// Also add direct routes for API calls
router.put('/deals/:id', express.json(), adminController.updateDeal);
router.delete('/deals/:id', adminController.deleteDeal);

module.exports = router;