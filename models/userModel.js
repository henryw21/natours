const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const AppError = require('./../utilities/AppErrors');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email.']
    },
    photo: String,
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Password confirm is required'],
        select: false,
        validate: {
            // Validator only works on CREATE and SAVE, will not work on UPDATE
            validator: function(el) {
                return el === this.password;
            },
            message: 'Password and passwordConfirm are not the same.'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpiry: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

// --- PRE-HOOK MIDDLEWARES ONLY WORK ON CREATE AND SAVE, WILL NOT WORK ON UPDATE ---
// for new user and password update
userSchema.pre('save', async function(next) {
    // Only run this function if password is modified
    if (!this.isModified('password')) return next();

    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    // Delete passwordConfirm field
    this.passwordConfirm = null;
    next();
});

// for password reset
userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000; // subtract 1 second to hack isPWChangedAfterJWT test
    next();
});

// for showing all users
userSchema.pre('find', function(next) {
    this.find({ active: { $ne: false } });
    next();
});

userSchema.methods.verifyPassword = async (candidatePassword, userPassword) => {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.isPWChangedAfterJWT = function(JWTIssuedAt) {
    if (this.passwordChangedAt) {
        const passwordChangedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return passwordChangedAt > JWTIssuedAt;
    }

    return false;
};

userSchema.methods.createPasswordResetToken = function() {
    const resetTokenPlain = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetTokenPlain)
        .digest('hex');
    const timeToExpire = 10 * 60 * 1000; // 10 minutes
    this.passwordResetExpiry = Date.now() + timeToExpire;

    return { resetTokenPlain, timeToExpire };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
