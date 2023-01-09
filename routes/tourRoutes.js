const express = require("express");
const tourController = require("./../controller/tourController");
const authController = require("./../controller/authController");
const reviewController = require("../controller/reviewController");
const reviewRouter = require("../routes/reviewRoutes");
const router = express.Router();

// router.param('id', tourController.checkId);
// router.route('/:slug').get(authController.protect, tourController.getTour);
router.route("/filterTours").get(tourController.getTourBasedOnQuery);
router.route("/:slug").get(tourController.getTour);
router.use("/:tourId/reviews", reviewRouter);

router.route("/top-5-cheap").get(tourController.getTop5Tours, tourController.getAllTours);

router.route("/monthly-plan/:year").get(
  authController.protect,
  // authController.restrictTo('admin', 'lead-guide', 'guide'),
  tourController.getMonthlyPlan
);

router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);
// /tours-within/233/center/40,-43/unit/mi
router.route("/distances/latlng/:latlng/unit/:unit").get(tourController.getDistances);
router.route("/tour-stats").get(tourController.getTourStats);

router.route("/").get(tourController.getAllTours).post(
  authController.protect,
  // authController.restrictTo('admin', 'lead-guide'),
  tourController.createTour
);

router
  .route("/:id")
  .get(tourController.getTourById)
  .patch(
    authController.protect,
    // authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    // authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;

// , authController.restrict('admin', 'lead-guide')

// router
//   .route('/:tourId/review')
//   .post(authController.protect, authController.restrictTo('user'), reviewController.createReview);
