const AppErrors = require('./../utilities/AppErrors');

const handleCastErrorDB = err => {
    const errorMessage = `Invalid ${err.path}: ${err.value}.`;
    return new AppErrors(errorMessage, 400);
};

const handleDuplicateFieldDB = err => {
    const value = err.errmsg.match(/"([^"]*)"/)[0];
    const errorMessage = `Duplicated field value: ${value}.`;
    return new AppErrors(errorMessage, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const errorMessage = `Validation error: ${errors.join('. ')}.`;
    return new AppErrors(errorMessage, 400);
};

const handleJWTError = () => new AppErrors('Invalid token. Please log in again.', 401);

const handelJWTExpireError = () => new AppErrors('Token expired. Please log in again.', 401);

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        res.status(500).json({
            status: 'error',
            message: 'Unknown error'
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = JSON.parse(JSON.stringify(err));

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handelJWTExpireError();

        sendErrorProd(error, res);
    }
};
