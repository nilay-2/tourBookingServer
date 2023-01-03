const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const getOverview = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();
  res.status(200).render('overview', { title: 'All tours', tours });
});

const getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    select: 'user rating review',
  });
  res.status(200).render('tour', { title: `${tour.name} tour`, tour });
});

const login = catchAsync(async (req, res, next) => {
  res.status(200).render('login', { title: 'Log into your account' });
});

module.exports = { getOverview, getTour, login };
