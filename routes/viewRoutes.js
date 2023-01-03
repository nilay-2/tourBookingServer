const express = require('express');
const viewsController = require('../controller/viewsController');
const authController = require('../controller/authController');
const router = express.Router();

router.use(authController.isLoggedIn);

router.route('/').get(viewsController.getOverview);
router.route('/tour/:slug').get(viewsController.getTour);
router.route('/login').get(viewsController.login);
module.exports = router;
