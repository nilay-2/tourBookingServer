const express = require("express");
const userController = require("../controller/userController");
const authController = require(`../controller/authController`);
// const multer = require("multer");
// const upload = multer({ dest: "public/img/users" });

// router
const router = express.Router();
router.route("/signup").post(authController.signup);
router.route("/login").post(authController.login);
router.route("/logout").post(authController.logout);
router.route("/forgetPassword").post(authController.forgetPassword);
router.route("/resetPassword/:resetToken").patch(authController.resetPassword);

router.use(authController.protect);

router.route("/me").get(userController.getMe, userController.getUserById);
router.route("/updatePassword").patch(authController.updatePassword);
router.route("/updateMe").patch(userController.updateMe);
// .patch(userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);

// delete user profile image
router.route("/deleteProfilePic").patch(userController.deleteProfilePic);

// upload user profile image
router.route("/uploadProfileImage").patch(userController.fileParser, userController.resizeImage);

router.route("/deleteMe").delete(userController.deleteMe);

// router.use(authController.restrictTo("admin"));

router.route("/").get(userController.getAllUsers);
router
  .route("/:id")
  .get(userController.getUserById)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
