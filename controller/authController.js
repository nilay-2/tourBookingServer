const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const bcrypt = require("bcryptjs");
const Email = require("../utils/email");
const dotenv = require("dotenv");
dotenv.config();
// const correctPassword = async function (candidatePassword, userPassword) {
//   return await bcrypt.compare(candidatePassword, userPassword);
// };

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };
  res.cookie("jwt", token, cookieOptions);
  res.status(statusCode).json({
    status: "success",
    message: "Updated successfully",
    token,
    user: {
      name: user.name,
      email: user.email,
      photo: user.photo,
      role: user.role,
    },
  });
};

const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  // const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(process.env.NODE_ENV);
  const FRONTEND_URL =
    process.env.NODE_ENV === "production"
      ? "https://touradventurer.netlify.app"
      : "http://127.0.0.1:5173";
  const url = `${FRONTEND_URL}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) if email and password exit
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  //2) if email and password are correct
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  //3) if everything is ok, the send success message
  createSendToken(user, 201, res);
});

const logout = catchAsync(async (req, res, next) => {
  res
    .cookie("jwt", "loggedOut", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .status(200)
    .json({
      status: "success",
    });
});

const getAllUsers = catchAsync(async (req, res, next) => {
  const user = await User.find({}, { password: 0 });
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

const isLoggedIn = catchAsync(async (req, res, next) => {
  // 1) getting token and check whether it is there
  if (req.cookies.jwt) {
    // 2) verification of token
    const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
    // 3) Check if user still exists
    const currentUser = await User.findOne({ _id: decoded.id });
    if (!currentUser) {
      return next();
    }
    // 4) Changed password after issuing token
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    res.locals.user = currentUser;
    return next();
  }
  next();
});
const protect = catchAsync(async (req, res, next) => {
  // 1) getting token and check whether it is there
  // console.log(req.cookies.jwt);
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access", 401));
  }
  // 2) verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check if user still exists
  const currentUser = await User.findOne({ _id: decoded.id });
  if (!currentUser) {
    return next(new AppError("The user with the token does no longer exist!", 401));
  }
  // 4) Changed password after issuing token
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("User recently changed password", 401));
  }

  req.user = currentUser;

  next();
});

// const restrictTo = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//       return next(new AppError("you do not have permission to perform this action", 403));
//     }

//     next();
//   };
// };
const forgetPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email });
  if (!user) return next(new AppError("There is no user with this email", 404));

  const resetToken = user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const FRONTEND_URL =
    process.env.NODE_ENV === "production"
      ? "https://touradventurer.netlify.app"
      : "http://127.0.0.1:5173";

  // const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const resetURL = `${FRONTEND_URL}/resetPassword/${resetToken}`;
  const message = `Forgot password? click here --> ${resetURL}`;
  try {
    // await sendEmail({
    //   email,
    //   subject: 'your password reset token is only valid for 10 minutes',
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.resetPasswordTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError("There was new app error while sending the email", 500));
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  // 1. encrypt the original token
  const hashToken = crypto.createHash("sha256").update(req.params.resetToken).digest("hex");
  // 2. Check for user using the encrypted token
  const user = await User.findOne({
    resetPasswordToken: hashToken,
    resetPasswordTokenExpiry: { $gt: Date.now() },
  });
  // 3. if token has not expired and user is there, then reset the password
  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpiry = undefined;
  await user.save();

  createSendToken(user, 201, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection.
  console.log(req.body);
  const currentUser = await User.findById(req.user.id);
  // 2. Check if posted current user is correct or not.
  if (!(await currentUser.correctPassword(req.body.passwordCurrent, currentUser.password))) {
    return next(new AppError("Your current password is wrong", 401));
  }
  // 3. If so, update password.
  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  await currentUser.save({ validateBeforeSave: false });
  // 4. Log user in, send JWT
  createSendToken(currentUser, 201, res);
});

module.exports = {
  signup,
  getAllUsers,
  login,
  protect,
  // restrictTo,
  forgetPassword,
  resetPassword,
  updatePassword,
  isLoggedIn,
  logout,
};
