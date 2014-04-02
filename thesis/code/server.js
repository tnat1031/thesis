var express = require('express');
var app = express();
//var MongoClient = require('mongodb').MongoClient;
//var format = require('util').format;

app.use(express.logger('dev'));
app.use(express.bodyParser({ keepExtensions: true }));
app.use(express.static(__dirname + "/app"));

app.listen(8080);