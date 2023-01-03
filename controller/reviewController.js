const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('../controller/handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user;
  if (!req.body.tour) req.body.tour = req.params.tourId;
  next();
};

exports.createReview = factory.createOne(Review);
// catchAsync(async (req, res, next) => {
//   const review = await Review.create(req.body);
//   res.status(200).json({
//     status: 'sucess',
//     review,
//   });
// });

exports.getAllReviews = factory.getAll(Review);
// catchAsync(async (req, res, next) => {
//   // let filter = {};
//   // if (req.params.tourId) filter = { tour: req.params.tourId };
//   const reviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     reviews,
//   });
// });

exports.updateMyReview = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;
  const userId = req.user.id;
  console.log('tour', tourId, 'user', userId);
  const review = await Review.findOneAndUpdate({ user: userId, tour: tourId }, req.body, {
    new: true,
    runValidators: false,
  });
  if (!review) {
    return next(new AppError('The review on this tour is not found', 404));
  }
  res.status(200).json({
    status: 'success',
    review,
  });
});

exports.deleteMyReview = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;
  const userId = req.user.id;

  await Review.findOneAndDelete({ user: userId, tour: tourId });

  res.status(200).json({
    status: 'success',
    message: 'Review deleted successfully',
    data: {
      tourId,
      userId,
    },
  });
});

exports.getOneReview = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.createTourReview = catchAsync(async (req, res, next) => {
  if (req.user.id) {
    req.body.user = req.user.id;
  }
  req.body.tour = req.params.tourId;
  const review = await Review.create(req.body);
  res.status(200).json({
    status: 'success',
    review,
  });
});
