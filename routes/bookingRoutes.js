const express = require('express');
const bookingController = require('../controller/bookingController');
const authController = require('../controller/authController');
const router = express.Router();

router
  .route('/checkout-session/:tourId/slot/:slotId')
  .get(authController.protect, bookingController.getCheckoutSession);

router.route('/').get(authController.protect, bookingController.createBookingCheckout);

router.route('/myTourBookings').get(authController.protect, bookingController.getMyTours);

router.route('/cancelBooking').post(authController.protect, bookingController.cancelBooking);
module.exports = router;
