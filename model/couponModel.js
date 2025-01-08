const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
     couponName: {
        type: String, 
        required: true
    },
    couponCode: {
        type: String,
        required: true,
        unique: true
    },
    discount: {
        type: Number, 
        required: true
    },
    minPurchaseAmount: {
        type: Number,
         required: true
        },
    startDate: {
        type: Date, 
        required: true
    },
    endDate: {
        type: Date,
         required: true
        },
    maxUsagePerUser: {
        type: Number,
        required: true,
        default: 1
    },
    userUsage: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        count: {
            type: Number,
            default: 1
        }
    }],
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Inactive'],
        default: 'Active'
    },
    isBlock: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

couponSchema.pre('save', function(next) {
    const now = new Date();
    if (this.endDate < now) {
        this.status = 'Expired';
    }
    next();
});


couponSchema.methods.canUserUse = async function(userId) {
    // Check if user has already used this coupon
    const userUsage = this.userUsage.find(
        usage => usage.userId.toString() === userId.toString()
    );
    
    if (!userUsage) return true;
    return userUsage.count < this.maxUsagePerUser;
};

module.exports = mongoose.model('coupon', couponSchema);
