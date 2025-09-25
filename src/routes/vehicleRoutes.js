const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

// Get all vehicles with optional filtering
router.get('/', vehicleController.getAllVehicles);

// Get a single vehicle by ID
router.get('/:id', vehicleController.getVehicleById);

module.exports = router;