const mongoose = require('mongoose');

const TouristPlaceSchema = new mongoose.Schema({
    country: { type: String, required: true },
    localArea: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
});

module.exports = mongoose.model('TouristPlace', TouristPlaceSchema);
