const path = require("path");
const cors = require("cors");
const pug = require("pug");
const express = require("express");
const morgan = require("morgan");
const rateLimiter = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controller/errorController");
const viewRouter = require("./routes/viewRoutes");
const compression = require("compression");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const app = express();
app.use(cookieParser());

app.use(
  cors({
    origin: "https://touradventurer.netlify.app",
    credentials: true,
  })
);
// https://touradventurer.netlify.app
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, "public")));

// sanitize data for NoSql injection
app.use(mongoSanitize());
// prevention against XSS attack
app.use(xss());
// security headers
app.use(helmet());
// http parameter pollution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

app.use(compression());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// const limiter = rateLimiter({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests, please try after one hour',
// });

// app.use('/api', limiter);
app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

const DB = process.env.DATABASE.replace("<password>", process.env.DATABASE_PASSWORD);
// connecting to database
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Database connected successfully"));

app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

app.all("*", (req, res, next) => {
  // const err = new Error(`Cannot find ${req.originalUrl} on this server`);
  // err.statusCode = 404;
  // err.status = 'fail';
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// error middleware
app.use(globalErrorHandler);

const port = process.env.PORT || 3000;

app.listen(port, "127.0.0.1", () => {
  console.log(`App running on port ${port}`);
});

module.exports = app;
