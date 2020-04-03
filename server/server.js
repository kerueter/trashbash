const express = require('express');
const cors = require('cors');
const app = express();
const geojson = require('geojson');
const expressWs = require('express-ws')(app);
const fileUpload = require('express-fileupload');
const crypto = require('crypto');
const { Client } = require('pg');

const ENDPOINT_URL = 'http://igf-srv-lehre.igf.uni-osnabrueck.de:1338';

const client = new Client({
  user: 'marcel',
  host: '127.0.0.1',
  database: 'marcel',
  password: 'standortbasierte_dienste',
  port: 5432,
});
client.connect();

app.use(cors());
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: "10mb", extended: true, parameterLimit: 10000}));
app.use('/media', express.static(__dirname + '/media'));
app.use(fileUpload({
	useTempFiles : true,
	tempFileDir : '/tmp/'
}));

app.listen(1338, function () {
  console.log('Example app listening on port 1338!');
});

app.ws('/trash', (ws, req) => {
});
var regWs = expressWs.getWss('/trash');

app.options('*', cors());

app.get('/trash', cors(), (req, res) => {
  const userLocationLat = req.query.userLocationLat;
  const userLocationLng = req.query.userLocationLng;
  const radiusKm = req.query.radiusKm;

  // check if query parameters are set
  if (!userLocationLat || !userLocationLng || !radiusKm) {
    res.status(400).send("User location or radius request missing in query parameters.");
    return;
  }

  let startDate;
  let endDate;
  const dateCurrent = new Date();
  if (!req.query.startDate) {
    const dateLastMonth = new Date(dateCurrent.getTime());
    dateLastMonth.setDate(dateLastMonth.getDate() - 14);
    startDate = new Date(dateLastMonth.getTime());
  } else {
    startDate = new Date(req.query.startDate);
  }

  if (!req.query.endDate) {
    endDate = new Date(dateCurrent.getTime());
  } else {
    endDate = new Date(req.query.endDate);
  }


  const queryMessage = 'SELECT * FROM trash WHERE time BETWEEN $1 AND $2 ORDER BY id ASC';
  const queryParams = [startDate, endDate];

  console.log(`Get trash between ${startDate.toISOString()} and ${endDate.toISOString()}`);

  client.query(queryMessage, queryParams, (err, dbRes) => {
    if (err) {
      res.status(500).send({ message: `Error: ${err.message}` });
      return;
    }

    // check if trash location is in requested radius of user
    const validRows = [];
    dbRes.rows.forEach(dbRow => {
      const distance = getTrashDistance(
        { latitude: userLocationLat, longitude: userLocationLng},
        { latitude: dbRow.latitude, longitude: dbRow.longitude}
      );
      if (distance < radiusKm) {
        // const validRow = dbRow;
        // validRow.photo = `${ENDPOINT_URL}/${dbRow.photo}`;
        validRows.push(dbRow);
      }
    });
    const validRowsGeoJson = geojson.parse(validRows, { Point: ['latitude', 'longitude'] });
    res.status(200).send(validRowsGeoJson);
  });
});

app.post('/trash', cors(), (req, res) => {
  const trashReport = req.body;
  const queryText = `INSERT INTO trash (time,username,latitude,longitude,hausmuell,gruenabfall,sperrmuell,sondermuell,photo) VALUES (to_timestamp($1), $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
  const queryVals = [trashReport.time, trashReport.username, trashReport.latitude, trashReport.longitude, trashReport.hausMuell, trashReport.gruenAbfall, trashReport.sperrMuell, trashReport.sonderMuell, `${ENDPOINT_URL}/${trashReport.photo}`]
  client.query(queryText, queryVals, (err, dbRes) => {
    if(err) {
      console.log(err);
      res.status(500).send({ message: `Error: ${err.message}` });
      return;
    }
    const rowGeoJson = geojson.parse(dbRes.rows[0], { Point: ['latitude', 'longitude'] })
    regWs.clients.forEach(client => {
      client.send(JSON.stringify(rowGeoJson));
    });
    res.status(200).send(rowGeoJson);
  });
});

app.post('/trash/images/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  console.log('Got files: ', Object.keys(req.files));
  Object.keys(req.files).forEach(fileKey => {
    const hash = crypto.createHash('md5').update(crypto.randomBytes(16)).digest('hex');
    const filePath = `media/uploads/${hash}.jpg`
    req.files[fileKey].mv(filePath, (err) => {
      if (err) {
        console.error(`Unable to generate file: ${JSON.stringify(err)}`);
        res.status(500).send({ message: `Error: ${err.message}` });
        return;
      }
      console.log(`Created file at ${filePath}`);
      res.status(200).send({ Location: filePath });
    });
  });
});

/**
 * Get the distance of the trash location to the radius center (in km)
 *
 * @param center Geo location of the radius center
 * @param marker Geo location of the trash marker
 */
function getTrashDistance(center, marker) {
  const ky = 40000 / 360;
  const kx = Math.cos(Math.PI * center.latitude / 180.0) * ky;
  const dx = Math.abs(center.longitude - marker.longitude) * kx;
  const dy = Math.abs(center.latitude - marker.latitude) * ky;

  return Math.sqrt(dx * dx + dy * dy);
}
