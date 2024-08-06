const express = require('express');
const router = express.Router();
const TouristPlace = require('../models/TouristPlace');

// Get countries
router.get('/countries', async (req, res) => {
    const countries = await TouristPlace.distinct('country');
    res.json(countries);
});

// Get local areas for a specific country
router.get('/local-areas/:country', async (req, res) => {
    const { country } = req.params;
    const localAreas = await TouristPlace.distinct('localArea', { country });
    res.json(localAreas);
});

// Get tourist places for a specific local area
router.get('/tourist-places/:localArea', async (req, res) => {
    const { localArea } = req.params;
    const places = await TouristPlace.find({ localArea });
    res.json(places);
});

module.exports = router;
