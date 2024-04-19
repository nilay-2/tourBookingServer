const AppError = require("./../utils/appError");
const dotenv = require("dotenv");
dotenv.config();
const handleCastErrorDB = (err) => {
  // const message = `Invalid ${err.path} hello: ${err.value}`;
  const message = err;
  console.log(message);
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue.name;
  const message = `Duplicate field value: \"${value}\". Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const e = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${e.join(". ")}`;
  return new AppError(message, 400);
};

const handleJwtError = (err) => new AppError("Invalid token, please log in again!", 401);

const handleJWTExpiredError = (err) =>
  new AppError("Your token has expired, please log in again!", 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.log("Error 💥", err);
    res.status(500).json({
      status: "error",
      message: err,
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 404;
  err.status = err.status || "fail";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    if (err.kind === "ObjectId") err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === "ValidationError") err = handleValidationErrorDB(err);
    if (err.name === "JsonWebTokenError") err = handleJwtError(err);
    if (err.name === "TokenExpiredError") err = handleJWTExpiredError(err);
    sendErrorProd(err, res);
  }
};
