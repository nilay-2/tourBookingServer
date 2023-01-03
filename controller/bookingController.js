const Tour = require("./../models/tourModel");
const Review = require("./../models/reviewModel");
const AppError = require("../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./handlerFactory");
const Booking = require("../models/bookingModel");
const stripe = require("stripe")(
  "sk_test_51MHiXnSCZbVpf4JFvl42da0J8Zpkm3TJbWy7k8H3ND3PYJZUpsZ7cQiHekb070je3SMD90guP8ZndTcTKTQnYzBM00ezG6ILO4"
);
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) get tour for checkout
  const { slotId } = req.params;
  const tour = await Tour.findById(req.params.tourId);
  // 2) create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `https://tour-booking-server.vercel.app/api/v1/bookings?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}&slot=${slotId}`,
    cancel_url: `https://touradventurer.netlify.app/tours/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          currency: "inr",
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https//www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
  });

  // 3) send session as response
  res.status(200).json({
    status: "success",
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, price, user, slot } = req.query;
  const bookedTour = await Tour.findById(tour);
  const date = bookedTour.startDates.find((slotBooked) => slot == slotBooked.id);
  if (!tour && !price && !user && !slot) {
    return next();
  }

  await Booking.create({ tour, price, user, slot, dateOfTrip: date.date });
  res.status(200).redirect(`https://touradventurer.netlify.app/tours/${bookedTour.slug}`);
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });
  const dateOfTrip = bookings.map((el) => el.dateOfTrip);
  const slots = bookings.map((el) => el.slot);
  const tourIDs = bookings.map((el) => el.tour);
  // const reviews = await Review.find({ tour: { $in: tourIDs }, user: req.user.id });
  const reviews = await Promise.all(
    tourIDs.map(async (tour) => {
      const review = await Review.findOne({ tour: tour, user: req.user.id });
      if (!review) return null;
      return review;
    })
  );
  // const tours = await Tour.find({ _id: { $in: tourIDs } });
  const tours = await Promise.all(
    tourIDs.map(async (tour_id) => {
      const tour = await Tour.findOne({ _id: tour_id });
      return tour;
    })
  );
  const myBookings = tours.map((tour, i) => {
    return { tour, review: reviews[i], date: dateOfTrip[i], slot: slots[i] };
  });
  res.status(200).json({
    status: "success",
    result: myBookings.length,
    myBookings,
  });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { tour } = req.body;
  await Booking.findOneAndDelete({ user: userId, tour: tour });
  res.status(200).json({
    status: "success",
    message: "Booking cancelled successfully",
  });
});
