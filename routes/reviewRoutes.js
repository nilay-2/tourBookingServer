const express = require('express');
const reviewController = require('../controller/reviewController');
const authController = require('../controller/authController');
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createTourReview
  );
router
  .route('/:id')
  .get(reviewController.getOneReview)
  .patch(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

router.route('/tour/:tourId').patch(authController.protect, reviewController.updateMyReview);
router.route('/tour/:tourId').delete(authController.protect, reviewController.deleteMyReview);
module.exports = router;
