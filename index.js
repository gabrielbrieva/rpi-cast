/*
 *	Cloud Server to use on Raspberry PI +B
 *	Using Node.js and a content of media files.
 *
 *	This application response a json list of media files (image, sound and movies files)
 *	following the folder structure (tree structure).
 *	If you request for folder then the response will be a list of files and folders.
 *	If you request for a media file, then the response will be the content of media file
 *	using a streaming if is required (video and audio).
 *
 * @Author Gabriel Brieva
 * 3dmann@gmail.com
 */

var express = require('express');
/*var https = require('https');
var http = require('http');*/
var fs = require('fs');
var bodyParser = require('body-parser');
var medias = require('./modules/medias.js');

/*var sslOptions = {
  key: fs.readFileSync('./ssl/server.key'),
  cert: fs.readFileSync('./ssl/server.crt'),
  ca: fs.readFileSync('./ssl/ca.crt'),
  requestCert: true,
  rejectUnauthorized: false
};*/

var settings = {
    port: 8888,
    rootPath: '/home/tuxan/dev/cloud'
};

var m = medias(settings.rootPath);

//start express framework
var app = express();

// public static resources
app.use(express.static('app'));

// cross domain configuration
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); // NOT SAFE FOR PRODUCTION
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
};

app.use(allowCrossDomain); // for accepting cross domain configuration
app.use(bodyParser.json()); // for parsing application/json

app.get('/', function (req, res) {
    res.send('Cloud Server');
});

// path mappers
app.post('/files', m.getFiles);
app.get('/media', m.getContent);

// starting listener
/*var httpServer = http.createServer(app).listen(settings.port, function () {
    console.log('Cloud Server started on http://%s:%s', httpServer.address().address, httpServer.address().port);
});

var httpsServer = https.createServer(sslOptions, app).listen(443, function(){
    console.log("Secure Express server listening on port 443");
});*/

var server = app.listen(settings.port, function () {
    console.log('Cloud Server started on http://%s:%s', server.address().address, server.address().port);
});

// UDP

var dgram = require("dgram");
var udpServer = dgram.createSocket("udp4");

udpServer.on("message", function (msg, rinfo) {
    if (msg == "cast-provider?")
    {
        // TODO responder a la pregunta (URL para acceder a cast priver)
        console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
    }

});

udpServer.on("listening", function () {
    var address = udpServer.address();
    console.log("server listening UDP at " + address.address + ":" + address.port);
});

udpServer.bind(41234);
