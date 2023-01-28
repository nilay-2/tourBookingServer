const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const ApiFeatures = require("../utils/apiFeatures");
const deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      doc: [null],
    });
  });
};

const updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findOneAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      doc,
    });
  });
};

const createOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: "success",
      tour: {
        doc,
      },
    });
  });
};

const getOne = (Model, populateOptions) => {
  return catchAsync(async (req, res, next) => {
    const query = Model.findById(req.params.id);
    if (populateOptions) query.populate(populateOptions);
    const doc = await query;
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "Success",
      doc,
    });
  });
};

const getAll = (Model) => {
  return catchAsync(async (req, res, next) => {
    // let filter = {};
    // if (req.params.tourId) filter = { tour: req.params.tourId };
    // const features = new ApiFeatures(Model.find(filter), req.query)
    //   .filter()
    //   .sort()
    //   .limitFields()
    //   .paginate();
    // const doc = await features.query;
    const doc = await Model.find({}).select({
      name: 1,
      slug: 1,
      guides: 0,
      imageCover: 1,
      "startLocation.description": 1,
      difficulty: 1,
      duration: 1,
      summary: 1,
      startDates: 1,
      locations: 1,
      maxGroupSize: 1,
      price: 1,
      ratingsAverage: 1,
      ratingsQuantity: 1,
    });
    // .limit(9);
    // const doc = await features.query.explain();
    console.log("new doc: ", doc);
    res.status(200).json({
      status: "success",
      requestTime: req.requestTime,
      result: doc.length,
      data: doc,
    });
  });
};

module.exports = { deleteOne, updateOne, createOne, getOne, getAll };
