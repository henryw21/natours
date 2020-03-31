const Review = require('./../models/reviewModel');
const QueryFeatures = require('./../utilities/queryFeatures');
const catchAsync = require('./../utilities/catchAsync');

const sendJSONResponse = function(review, statusCode, res) {
    res.status(statusCode).json({
        status: 'successful',
        results: review.length,
        data: {
            review
        }
    });
};

exports.getAllReviews = catchAsync(async (req, res, next) => {
    const queryFeatures = new QueryFeatures(Review, req.query)
        .filter()
        .sort()
        .select()
        .paginate();
    const reviews = await queryFeatures.query;

    sendJSONResponse(reviews, 200, res);
});

exports.createReview = catchAsync(async (req, res, next) => {
    const newReview = await Review.create(req.body);

    sendJSONResponse(newReview, 201, res);
});
