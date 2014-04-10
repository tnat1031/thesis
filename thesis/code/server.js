var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;

app.use(express.logger('dev'));
app.use(express.bodyParser({ keepExtensions: true }));
app.use(express.static(__dirname + "/app"));

var dbloc = "mongodb://127.0.0.1:27017/thesis";

function make_nodes_and_edges(docs, connection_thresh) {
    console.log(connection_thresh);
    // take a list of docs and create an array of nodes and edges to be
    // sent back to client
    var nodes = [];
    var edges = [];
    var indices = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var score = doc.median_rankpoint;
        var pert_iname_x = doc.pert_iname_x;
        var pert_iname_y = doc.pert_iname_y;
        console.log(score);
        if (pert_iname_x !== pert_iname_y) {
            if (nodes.indexOf(pert_iname_x) == -1) {
                // pert_iname_x is not in nodes yet
                nodes.push( {"id": pert_iname_x} );
                indices[pert_iname_x] = nodes.length - 1;
            }
            if (nodes.indexOf(pert_iname_y) == -1) {
                // pert_iname_x is not in nodes yet
                nodes.push( {"id": pert_iname_y} );
                indices[pert_iname_y] = nodes.length - 1;
            }
            if (Math.abs(score) >= connection_thresh) {
                // score is high enough, add an edge
                var edge = {
                    "source": indices[pert_iname_x],
                    "target": indices[pert_iname_y],
                    "score": score,
                    "direction": score > 0 ? "pos" : "neg"
                }
                edges.push(edge);
            }
        }
    }
    return( {"nodes": nodes, "edges": edges} );
}

// set up some routes
app.get('/get_connections/:collection/:limit/:thresh', function(req, res) {
    var collection_name = req.params.collection;
    var limit = req.params.limit;
    var thresh = req.params.thresh;
    console.log(collection_name);
    MongoClient.connect(dbloc, function(err, db) {
        if(err) throw(err);
        var collection = db.collection(collection_name);
        collection.find({}, {limit:limit}).toArray(function(err, results) {
            if (err) {
                console.error(err);
            } else {
                nodes_and_edges = make_nodes_and_edges(results, thresh);
                res.send(nodes_and_edges);
            }
        })
    })
})

app.listen(8080);