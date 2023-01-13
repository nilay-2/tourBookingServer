const AppError = require("../utils/appError");
const Tour = require("./../models/tourModel");
const sharp = require("sharp");
const multer = require("multer");
const ApiFeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./handlerFactory");
const getTop5Tours = (req, res, next) => {
  req.query.sort = "price,-ratingsAverage";
  req.query.limit = 5;
  req.query.field = "name,price,ratingsAverage,duration,difficulty";
  next();
};

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

const resizeTourImages = async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();
  // 1) image cover
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );
  next();
};

const getAllTours = factory.getAll(Tour);
// catchAsync(async (req, res, next) => {
//   const features = new ApiFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();
//   const tours = await features.query;
//   res.status(200).json({
//     status: 'success',
//     requestTime: req.requestTime,
//     result: tours.length,
//     data: tours,
//   });
// });

const getTourById = factory.getOne(Tour, "reviews");
// const getTourById = factory.getOne(Tour, {path: 'reviews'});
// catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'Success',
//     tour,
//   });
// });

const createTour = factory.createOne(Tour);
// catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     tour: {
//       newTour,
//     },
//   });
// });

const updateTour = factory.updateOne(Tour);
// catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   console.log(newTour);
//   res.status(200).json({
//     status: 'success',
//     tour,
//   });
// });

const deleteTour = factory.deleteOne(Tour);
// catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     tour: [null],
//   });
// });

const getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.6 } },
    },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        // _id: '$ratingsAverage' ,
        numTour: { $sum: 1 },
        numRating: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: "success",
    stats,
  });
});

const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates",
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          $month: "$startDates",
        },
        numTourStarts: {
          $sum: 1,
        },
        tours: {
          $push: "$name",
        },
      },
    },
    {
      $addFields: { month: "$_id" },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: {
        numTourStarts: -1,
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    data: {
      plan,
    },
  });
});

// router.route('/tours-within/:distance/center/:latlng/unit/:unit', tourController.getToursWithin)
// // /tours-within/233/center/34.139460,-118.136761/unit/mi

const getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");
  if (!lat || !lng) {
    return next(new AppError("Please provide latitude and longitude in the format lat,lng.", 400));
  }

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: "success",
    data: {
      results: tours.length,
      tours,
    },
  });
});

const getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");
  if (!lat || !lng) {
    return next(new AppError("Please provide latitude and longitude in the format lat,lng.", 400));
  }

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  const distance = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [+lng, +lat],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      distance,
    },
  });
});

const getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    select: "user rating review",
  });

  if (!tour) {
    return next(new AppError("There is no tour with that name", 404));
  }
  res.status(200).json({
    status: "success",
    tour,
  });
});

const getTourBasedOnQuery = catchAsync(async (req, res, next) => {
  let { tour } = req.query;
  tour = tour + " ";
  const regex = new RegExp(tour.trim());
  const tourList = await Tour.find({
    "startLocation.description": { $regex: regex, $options: "i" },
  });

  if (tourList.length === 0) {
    return next(new AppError("No Results found!", 404));
  }

  res.status(200).json({
    status: "success",
    tourList,
    query: req.query,
  });
});

module.exports = {
  getAllTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour,
  getTop5Tours,
  getTourStats,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
  getTour,
  uploadTourImages,
  resizeTourImages,
  getTourBasedOnQuery,
};
