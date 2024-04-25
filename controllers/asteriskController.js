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
  res.send('Formulário Recebido');
}
