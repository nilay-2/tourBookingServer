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
dotenv.config();

const app = express();

app.use(express.json());
// app.use(express.json({ limit: "10kb" }));

app.use(cookieParser());

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://touradventurer.netlify.app"
        : "http://127.0.0.1:5173",
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

app.use((req, res, next) => {
  // console.log(req.headers);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production"
      ? "https://touradventurer.netlify.app"
      : "http://127.0.0.1:5173"
  );
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  next();
});
app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// error middleware
app.use(globalErrorHandler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Environment: ", process.env.NODE_ENV);
  console.log(`App running on port ${port}`);
});
