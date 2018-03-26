// Get dependencies
const express = require('express');
const path = require('path');
const http = require('http');
//const bodyParser = require('body-parser');
const passport = require('passport');
const config = require('./server/config');
const common = require('./server/common');
const sessionStore = require('./server/session');
const flowsheet = require('./server/fhir/flowsheet');

// Get our API routes
const auth = require('./server/routes/auth');
const api = require('./server/routes/api');
const presence = require('./server/routes/presence');
const fhir = require('./server/routes/fhir');
const user = require('./server/routes/user');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
common.setSocketIoConnection(io);


// Point static path to dist
app.use(express.static(path.join(__dirname, 'dist')));

// create session store
app.use(sessionStore.createSession(config.getSessionConfig()));

//Initialise passport session
app.use(passport.initialize());
app.use(passport.session());


// Set our api routes
app.use('/auth', auth);
app.use('/api', api);
app.use('/presence', presence);
app.use('/fhir', fhir);
app.use('/user', user);

// catching unhandled errors
app.use(function(err, req, res, next) {
    res.status(500);
    res.send({
        error: err
    });
});

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Preparing flowsheets grid emptyrow data
function prepareFlowSheetData(){
    flowsheet.getFhirFlowsheetValueSet()
    .then((response) => {
        flowsheet.setFlowSheetValueSet(response);
        let isFlowSheetRowdataPrepared = flowsheet.prepareFlowSheetRowData();
        if(isFlowSheetRowdataPrepared){
          console.log("Flowsheets grid empty rowdata prepared");
        }
    })
    .catch((error) => {
         console.log("Error while preparing flowsheets grid empty rowdata:"+error.message);
    });
}

prepareFlowSheetData();

/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || '3000';
app.set('port', port);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`Presence running on port:${port}`));

io.on('connection', (socket) => {
    console.log('user connected');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
});