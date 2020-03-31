const Tour = require('./../models/tourModel');
const QueryFeatures = require('./../utilities/queryFeatures');
const catchAsync = require('./../utilities/catchAsync');
const AppErrors = require('./../utilities/AppErrors');

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
    // EXECUTE QUERY
    const queryFeatures = new QueryFeatures(Tour, req.query)
        .filter()
        .sort()
        .select()
        .paginate();
    const tours = await queryFeatures.query;

    // const tours = Tour.find()
    //     .where('duration')
    //     .equals(5)
    //     .where('difficulty')
    //     .equals('easy');

    // RETURN QUERY RESULT
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            tours
        }
    });
});

exports.createTour = catchAsync(async (req, res, next) => {
    // const newTour = new Tour({})
    // newTour.save()
    const newTour = await Tour.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            tour: newTour
        }
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findById(req.params.id); //.populate(reviews);

    if (!tour) {
        return next(new AppErrors(`Can't find tour with the id: ${req.params.id}.`, 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            tour
        }
    });
});

exports.updateTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!tour) {
        return next(new AppErrors(`Can't find tour with the id: ${req.params.id}.`, 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            tour
        }
    });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findByIdAndDelete(req.params.id);

    if (!tour) {
        return next(new AppErrors(`Can't find tour with the id: ${req.params.id}.`, 404));
    }

    res.set({
        TourID: req.params.id,
        TourName: tour.name,
        Status: 'successful'
    });

    res.status(204).json({
        status: 'success',
        data: {
            tour
        }
    });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                num: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        },
        {
            $sort: { avgPrice: 1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats
        }
    });
});

exports.getMonthlyTourPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year;

    const MonthlyTourPlan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: { _id: 0 }
        },
        {
            $sort: { numToursStart: -1 }
        },
        {
            $limit: 12
        }
    ]);

    res.status(200).json({
        status: 'successful',
        data: {
            MonthlyTourPlan
        }
    });
});
