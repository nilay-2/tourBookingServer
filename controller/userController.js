const fs = require("fs");
// const path = require('path');
const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const factory = require("../controller/handlerFactory");
const multer = require("multer");
const sharp = require("sharp");
// const upload = multer({ dest: 'public/img/users' });

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage();

// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image")) {
//     cb(null, true);
//   } else {
//     cb(new AppError("Not an image! Please upload images.", 400), false);
//   }
// };

const upload = multer({
  storage: multerStorage,
  // fileFilter: multerFilter,
});

const fileParser = upload.single("photo");

const resizeImage = catchAsync(async (req, res, next) => {
  const fileName = `user-${req.user.id}-${Date.now()}.jpeg`;
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { photo: fileName },
    {
      new: true,
      runValidators: false,
    }
  );
  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer()
    .then((data) => {
      const base64data = data.toString("base64");
      res.status(200).json({
        status: "success",
        bufferData: { fileName, b64data: base64data, contentType: "image/jpeg" },
        updatedUser,
      });
    });
});

// const resizeUserPhoto = async (req, res, next) => {
//   if (!req.file) return next();
//   req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
//   await sharp(req.file.buffer)
//     .resize(500, 500)
//     .toFormat("jpeg")
//     .jpeg({ quality: 90 })
//     .toFile(`public/img/users/${req.file.filename}`);
//   next();
// };

const filterReqBody = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

const getAllUsers = factory.getAll(User);
// catchAsync(async (req, res, next) => {
//   const users = await User.find();
//   res.status(200).json({
//     status: 'success',
//     users,
//   });
// });

const getUserById = factory.getOne(User);
// catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const user = await User.findById(id);
//   res.status(200).json({
//     status: 'success',
//     user,
//   });
// });

const updateMe = catchAsync(async (req, res, next) => {
  // 1. create error if user tries to update password
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("This route is not for password updates, please use /updatePassword"));
  }

  console.log(req.body);
  // if (req.body.fileDelete !== "default.jpg") {
  //   // const path1 = path.relative(__dirname, `starter/public/img/users/${req.body.fileDelete}`);
  //   // console.log(path1);
  //   fs.unlink(`./public/img/users/${req.body.fileDelete}`, (err) => {
  //     if (err) {
  //       console.log(err);
  //       return;
  //     } else {
  //       console.log("file deleted successfully");
  //     }
  //   });
  // }

  // 2. Filter out object
  const filteredBody = filterReqBody(req.body, "name", "email");
  if (req.body.photo) filteredBody.photo = req.body.photo;
  // 3. update the user data
  console.log(filteredBody);
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: false,
  });
  res.status(200).json({
    status: "success",
    updatedUser,
  });
});

// const deleteProfilePic = catchAsync(async (req, res, next) => {
//   if (req.body.fileDelete) {
//     fs.unlink(`./public/img/users/${req.body.fileDelete}`, (err) => {
//       if (err) {
//         console.log(err);
//         return;
//       } else {
//         console.log("file deleted successfully");
//       }
//     });
//   }
//   const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, {
//     new: true,
//     runValidators: false,
//   });

//   if (!updatedUser) return next(new AppError("No user found with this id", 404));

//   res.status(200).json({
//     status: "success",
//     message: "Profile image successfully deleted.",
//     updatedUser,
//   });
// });

const deleteProfilePic = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: false,
  });
  res.status(200).json({
    status: "success",
    updatedUser,
  });
});

const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    message: "account deleted",
  });
});

const deleteUser = factory.deleteOne(User);
const updateUser = factory.updateOne(User);
module.exports = {
  getUserById,
  getAllUsers,
  updateMe,
  deleteMe,
  deleteUser,
  updateUser,
  getMe,
  fileParser,
  resizeImage,
  deleteProfilePic,
};
