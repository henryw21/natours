const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const router = express.Router();

router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);
router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);
router.route('/updateMyPassword').patch(authController.validateIdentity, authController.updatePassword);

router.route('/updateMe').patch(authController.validateIdentity, userController.updateMe);
router.route('/deleteMe').delete(authController.validateIdentity, userController.deleteMe);

router
    .route('/')
    .get(authController.validateIdentity, userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id')
    .get(authController.validateIdentity, userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;
