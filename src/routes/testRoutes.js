/**
 * Error Testing Routes
 * Routes to test various error handling scenarios
 */

const express = require('express');
const router = express.Router();

// Test hello endpoint
router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from TorqueX API' });
});

// Test 404 error
router.get('/test-404', (req, res) => {
  const err = new Error('Test 404 Error');
  err.status = 404;
  throw err;
});

// Test 500 error
router.get('/test-500', (req, res) => {
  throw new Error('Test 500 Error');
});

// Test controller error handling
router.get('/test-controller-error', (req, res) => {
  try {
    // Intentionally cause an error
    const nonExistentObject = undefined;
    nonExistentObject.someProperty;
  } catch (error) {
    console.error('Test controller error:', error);
    res.status(500).render('error', { 
      message: 'Test controller error',
      error: req.app.get('env') === 'development' ? error : {}
      // Intentionally omit title to test fallback
    });
  }
});

module.exports = router;