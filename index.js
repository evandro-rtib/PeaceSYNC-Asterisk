const express = require('express');
const port=2626;
const app = express();
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer(app);
const wss = new WebSocket.Server({server})

const cors = require('cors');

const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  };
app.use(cors(corsOptions));
const routes = require('./routes')

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(routes)
server.listen(port, () => {
    console.log('Servidor executando na porta ' + port);
    console.log('http://localhost:'+port);
})

