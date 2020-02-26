var express = require('express');
var cors = require('cors');
var app = express();
var expressWs = require('express-ws')(app);
const { Client } = require('pg')

const client = new Client({
  user: 'marcel',
  host: '127.0.0.1',
  database: 'marcel',
  password: 'standortbasierte_dienste',
  port: 5432,
});
client.connect();

app.use(cors());
app.use(express.json());

app.listen(1338, function () {
  console.log('Example app listening on port 1338!');
});

app.ws('/trash', (ws, req) => {
});
var regWs = expressWs.getWss('/trash');

app.options('*', cors());

app.get('/trash', cors(), (req, res) => {
  let queryMessage = 'SELECT * FROM trash ORDER BY id ASC';
  client.query(queryMessage, (err, dbRes) => {
    if(err) {
      res.send("Error");
      return;
    }
    res.send(dbRes.rows);
  });
});
app.post('/trash', cors(), (req, res) => {
  const trashReport = req.body;
  const queryText = `INSERT INTO trash (time,username,latitude,longitude,hausmuell,gruenabfall,sperrmuell,sondermuell,photo) VALUES (to_timestamp($1), $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
  const queryVals = [trashReport.time, trashReport.username, trashReport.latitude, trashReport.longitude, trashReport.hausMuell, trashReport.gruenAbfall, trashReport.sperrMuell, trashReport.sonderMuell, trashReport.photo]
  client.query(queryText, queryVals, (err, dbRes) => {
    if(err) {
      console.log(err);
      res.sendStatus(500);
      return;
    }
    regWs.clients.forEach(client => {
      client.send(JSON.stringify(dbRes.rows[0]));
    });
    res.sendStatus(200);
  });
});
