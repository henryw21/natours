const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');
const router = express.Router();

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(authController.validateIdentity, authController.authorizedRoles('user'), reviewController.createReview);

module.exports = router;
