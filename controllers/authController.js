const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utilities/catchAsync');
const AppErrors = require('./../utilities/AppErrors');
const sendEmail = require('./../utilities/sendEmail');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_PRIVATE_KEY, { expiresIn: process.env.JWT_EXPIRY });
};

/*
const decodeToken = (req, next) => {
    let sessionToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        sessionToken = req.headers.authorization.split(' ')[1];
    }

    if (!sessionToken) return next(new AppErrors('Please log in.', 401));

    return jwt.verify(sessionToken, process.env.JWT_PRIVATE_KEY);
};
*/

const sendJSONResponse = (user, statusCode, res) => {
    const sessionToken = signToken(user._id);
    const cookieOption = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRY * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') cookieOption.secure = true;

    // remove password from output
    user.password = null;

    res.cookie('jwt', sessionToken, cookieOption);

    res.status(statusCode).json({
        status: 'successful',
        sessionToken,
        data: {
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt
    });

    sendJSONResponse(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1) Check if email and password are provided
    if (!email || !password) {
        return next(new AppErrors('Please provide email and password.', 400));
    }

    // 2) Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.verifyPassword(password, user.password))) {
        return next(new AppErrors('Invalid email or password,', 401));
    }

    // 3) Send token to client
    sendJSONResponse(user, 200, res);
});

// Middleware
exports.validateIdentity = catchAsync(async (req, res, next) => {
    // 1) Get session token and check if token exists
    let sessionToken;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        sessionToken = req.headers.authorization.split(' ')[1];
    }

    if (!sessionToken) {
        return next(new AppErrors('Please log in to get access.', 401));
    }

    // 2) Verify session token's validity and expiry
    const decodedToken = await promisify(jwt.verify)(sessionToken, process.env.JWT_PRIVATE_KEY);

    // const decodedToken = decodeToken(req, next);

    // 3) Check if user still exists
    const currentUser = await User.findById(decodedToken.id);

    if (!currentUser) {
        return next(new AppErrors('User does not exist.', 401));
    }

    // 4) Check if user changed password after session token is issued
    if (currentUser.isPWChangedAfterJWT(decodedToken.iat)) {
        return next(new AppErrors('Password updated. Please log in again.', 401));
    }

    // 5) Grant access to protected route
    req.user = currentUser;
    next();
});

exports.authorizedRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppErrors('You are not authorized to perform this action.', 403));
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on email posted
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppErrors('There is no user associated with the email provided.', 404));
    }

    // 2) Generate random reset token and save to database
    const { resetTokenPlain, timeToExpire } = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send token via email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetTokenPlain}`;

    const emailInfo = {
        from: 'no-reply@gmail.com',
        to: user.email,
        subject: `[Natours] Password Reset Email (valid for ${parseInt(timeToExpire / 1000 / 60, 10)} minutes)`,
        text: `Submit a PATCH request with your new password and passwordConfirm to: ${resetURL} in order to reset password.`,
        html: null
    };

    try {
        await sendEmail(emailInfo);

        res.status(200).json({
            status: 'successful',
            message: `Password reset email sent to ${user.email}.`
        });
    } catch (err) {
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        await user.save({ validateBeforeSave: false });

        return next(new AppErrors('There is an error sending password reset email. Please try again later.', 500));
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Hash supplied token
    const passwordResetToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    // 2) Check if token (after hash) match any user, and if token is expired
    const user = await User.findOne({
        passwordResetToken: passwordResetToken,
        passwordResetExpiry: { $gte: Date.now() }
    });

    if (!user) return next(new AppErrors('Token is invalid or expired.', 400));

    // 3) Set new password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await user.save({ validateBeforeSave: true });

    // 4) Update changedPasswordAt property for user using middleware (lesson used middleware in pre-save, personally think should use method instead)

    // 5) Login user, send JWT
    sendJSONResponse(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from database collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if the POSTed password is correct
    // isCorrectPassword = await user.verifyPassword(req.body.passwordCurrent, user.password)
    if (!(await user.verifyPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppErrors('Your current password is incorrect.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4) Log in user, send JWT
    sendJSONResponse(user, 200, res);
});
