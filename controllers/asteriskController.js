const AsteriskModel = require('../models/AsteriskModel')

exports.peersReadAll = (req,res) => {
  const objData = req.body
  AsteriskModel.peersReadAll(objData)
  .then(peers => {
      res.json(peers);
    })
    .catch((error) => {
      console.error('Erro ao ler dados:', error);
      res.status(500).json({ error: 'Erro ao processar a solicitação' });
    });
}

exports.update = (req,res) => {
  const objData = req.body;
  AsteriskModel.update(objData);
  res.send('Dado Recebido');
}


exports.PEER_TO_PEER = (req,res) => {
  const objData = req.body;
  console.log('peer to peer');
  AsteriskModel.PEER_TO_PEER(objData);
  res.send('Dado Recebido');
}

exports.PEER_TO_TRUNK = (req,res) => {
  const objData = req.body;
  console.log('peer to trunk');
  AsteriskModel.PEER_TO_TRUNK(objData);
  res.send('Dado Recebido');
}

exports.PEER_TO_QUEUE = (req,res) => {
  const objData = req.body;
  console.log('peer to queue');
  AsteriskModel.PEER_TO_QUEUE(objData);
  res.send('Dado Recebido');
}

exports.CALL_ANSWERED = (req,res) => {
  const objData = req.body;
  AsteriskModel.CALL_ANSWERED(objData);
  res.send('Dado Recebido');
}

exports.ANSWERED_QUEUE = (req,res) => {
  const objData = req.body;
  AsteriskModel.ANSWERED_QUEUE(objData);
  res.send('Dado Recebido');
}

exports.END_CALL = (req,res) => {
  const objData = req.body;
  AsteriskModel.END_CALL(objData);
  res.send('Dado Recebido');
}

