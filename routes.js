const express = require('express');
const route = express.Router();

const asteriskController = require('./controllers/asteriskController');

route.post('/peers/readAll', asteriskController.peersReadAll);
route.post('/update', asteriskController.update);

module.exports = route;
