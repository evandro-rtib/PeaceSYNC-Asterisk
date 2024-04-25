const express = require('express');
const port=2626;
const app = express();
const cors = require('cors');

const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  };
app.use(cors(corsOptions));
const routes = require('./routes')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes)
app.listen(port, () => {
    console.log('Servidor executando na porta ' + port);
    console.log('http://localhost:'+port);
})