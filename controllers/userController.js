const User = require('./../models/userModel');
const catchAsync = require('./../utilities/catchAsync');
const AppError = require('./../utilities/AppErrors');

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        status: 'successful',
        results: users.length,
        users
    });
});

exports.getUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'Get user route is not yet defined!'
    });
};
exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'Create user route is not yet defined!'
    });
};
exports.updateUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'Update user route is not yet defined!'
    });
};
exports.deleteUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'Delete user route is not yet defined!'
    });
};

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create error if user POSTed password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('You cannot update password in this route.', 400));
    }

    // 2) Limit update fields to allowed fields
    const filteredUpdateBody = filterObj(req.body, 'name', 'email');
    // console.log(filteredUpdateBody);

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredUpdateBody, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: 'successful',
        data: {
            updatedUser
        }
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'successful',
        date: null
    });
});
