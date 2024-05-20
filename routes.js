const express = require('express');
const route = express.Router();

const asteriskController = require('./controllers/asteriskController');

route.post('/peers/readAll', asteriskController.peersReadAll);
route.post('/update', asteriskController.update);
route.post('/cdr/PEER_TO_PEER', asteriskController.PEER_TO_PEER);
route.post('/cdr/PEER_TO_TRUNK', asteriskController.PEER_TO_TRUNK);
route.post('/cdr/PEER_TO_QUEUE', asteriskController.PEER_TO_QUEUE);
route.post('/cdr/CALL_ANSWERED', asteriskController.CALL_ANSWERED);
route.post('/cdr/ANSWERED_QUEUE', asteriskController.ANSWERED_QUEUE);
route.post('/cdr/END_CALL', asteriskController.END_CALL);


module.exports = route;
