const express = require('express');
const cors = require('cors');
const app = express();
const geojson = require('geojson');
const fileUpload = require('express-fileupload');
const crypto = require('crypto');
const { Client } = require('pg');

const ENDPOINT_URL = 'http://igf-srv-lehre.igf.uni-osnabrueck.de:1338';

// initialize and connect Postgres client
const client = new Client({
  user: 'marcel',
  host: '127.0.0.1',
  database: 'marcel',
  password: 'standortbasierte_dienste',
  port: 5432,
});
client.connect();

// define express middlewares to use
app.use(cors());
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: "10mb", extended: true, parameterLimit: 10000}));
app.use('/media', express.static(__dirname + '/media'));
app.use(fileUpload({
	useTempFiles : true,
	tempFileDir : '/tmp/'
}));

// start server on defined port
app.listen(1338, function () {
  console.log('Example app listening on port 1338!');
});

// set cors headers
app.options('*', cors());

// GET /trash
// Used to get trash reports based on user location and radius
app.get('/trash', cors(), (req, res) => {
  const userLocationLat = req.query.userLocationLat;
  const userLocationLng = req.query.userLocationLng;
  const radiusKm = req.query.radiusKm;

  // check if query parameters are set
  if (!userLocationLat || !userLocationLng || !radiusKm) {
    res.status(400).send("User location or radius request missing in query parameters.");
    return;
  }

  // set date interval to query
  // set to current date back to 14 days, if no date parameters were set
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

  // build DB query
  const queryMessage = 'SELECT * FROM trash WHERE time BETWEEN $1 AND $2 ORDER BY id ASC';
  const queryParams = [startDate, endDate];

  console.log(`Get trash between ${startDate.toISOString()} and ${endDate.toISOString()}`);

  // start DB query
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

    // return "valid" trash reports in GeoJSON format
    const validRowsGeoJson = geojson.parse(validRows, { Point: ['latitude', 'longitude'] });
    res.status(200).send(validRowsGeoJson);
  });
});

// POST /trash
// Store trash report in database
app.post('/trash', cors(), (req, res) => {
  const trashReport = req.body;
  const trashImg = trashReport.photo && trashReport.photo.length > 0 ? `${ENDPOINT_URL}/${trashReport.photo}` : '';
  
  // build DB query
  const queryText = `INSERT INTO trash (time,username,latitude,longitude,hausmuell,gruenabfall,sperrmuell,sondermuell,photo) VALUES (to_timestamp($1), $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
  const queryVals = [trashReport.time, trashReport.username, trashReport.latitude, trashReport.longitude, trashReport.hausMuell, trashReport.gruenAbfall, trashReport.sperrMuell, trashReport.sonderMuell, trashImg]
  
  // start DB query
  client.query(queryText, queryVals, (err, dbRes) => {
    if(err) {
      console.log(err);
      res.status(500).send({ message: `Error: ${err.message}` });
      return;
    }

    // return inserted trash report in GeoJSON format
    const rowGeoJson = geojson.parse(dbRes.rows[0], { Point: ['latitude', 'longitude'] })
    res.status(200).send(rowGeoJson);
  });
});

// POST /trash/images/upload
// Retrieve "binary" image of trash report and store it as ".jpg" file in "/media/uploads" folder
// Return the file path of the generated image
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
