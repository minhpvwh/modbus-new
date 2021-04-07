const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const schema = new mongoose.Schema(
    {
        _id: { type: ObjectId, auto: true },
        meter_id: { type: Number },
        timestamp: { type: Number },
        update_at: { type: Date },
    },
    {
        timestamps: true,
        _id: false,
    },
);
module.exports = mongoose.model('Meter', schema);