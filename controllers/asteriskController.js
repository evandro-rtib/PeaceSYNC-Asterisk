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

exports.agentLogin = (req,res) => {
  const objData = req.body;
  AsteriskModel.agentLogin(objData);
  res.send('Dado Recebido');
}


exports.agentLogoff = (req,res) => {
  const objData = req.body;
  AsteriskModel.agentLogoff(objData);
  res.send('Dado Recebido');
}

exports.originate = (req,res) => {
  const objData = req.body;
  AsteriskModel.originate(objData);
  res.send('Dado Recebido');
}

exports.update = (req,res) => {
  const objData = req.body;
  AsteriskModel.update(objData);
  res.send('Dado Recebido');
}


exports.PEER_TO_PEER = (req,res) => {
  const objData = req.body;
  AsteriskModel.PEER_TO_PEER(objData);
  res.send('Dado Recebido');
}

exports.PEER_TO_TRUNK = (req,res) => {
  const objData = req.body;
  AsteriskModel.PEER_TO_TRUNK(objData);
  res.send('Dado Recebido');
}

exports.PEER_TO_QUEUE = (req,res) => {
  const objData = req.body;
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

