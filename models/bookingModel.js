const mongoose = require('mongoose');
const Tour = require('../models/tourModel');
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A booking must belong to a user!'],
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'A booking must belong to a tour!'],
  },
  slot: {
    type: mongoose.Schema.ObjectId,
    required: true,
  },
  dateOfTrip: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    required: [true, 'A booking must have a price!'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

// bookingSchema.index({ tour: 1, slot: 1 }, { unique: true });

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({ path: 'tour', select: 'name' });
  // this.populate('slot');
  next();
});

bookingSchema.statics.getStats = async function (tourId, slotId) {
  const tour = await Tour.findById(tourId);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId, slot: slotId },
    },
    {
      $group: {
        _id: '$tour',
        nParticipants: { $sum: 1 },
      },
    },
  ]);
  console.log(stats);
  if (stats.length > 0) {
    if (stats[0].nParticipants > tour.maxGroupSize) {
      const booking = await this.findOne();
      booking.remove();
      return;
    } else if (stats[0].nParticipants === tour.maxGroupSize) {
      console.log('Equal ho gaya benchod');
      const updatedTour = await Tour.findOneAndUpdate(
        { _id: tourId, 'startDates._id': slotId },
        {
          'startDates.$.participants': stats[0].nParticipants,
          'startDates.$.soldOut': true,
        },
        {
          new: true,
          runValidators: false,
        }
      );
    } else {
      const updatedTour = await Tour.findOneAndUpdate(
        { _id: tourId, 'startDates._id': slotId },
        {
          'startDates.$.participants': stats[0].nParticipants,
          'startDates.$.soldOut': false,
        },
        {
          new: true,
          runValidators: false,
        }
      );
    }
  } else {
    const updatedTour = await Tour.findOneAndUpdate(
      { _id: tourId, 'startDates._id': slotId },
      {
        'startDates.$.participants': 0,
        'startDates.$.soldOut': false,
      },
      {
        new: true,
        runValidators: false,
      }
    );
  }
};

bookingSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

bookingSchema.post(/^findOneAnd/, async function () {
  // console.log(this.r.tour._id, this.r.slot);  tour--id and slot--id

  await this.r.constructor.getStats(this.r.tour._id, this.r.slot);
});

bookingSchema.post('save', function () {
  this.constructor.getStats(this.tour, this.slot);
});

const Booking = new mongoose.model('Booking', bookingSchema);

module.exports = Booking;
