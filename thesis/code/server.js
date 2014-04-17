var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;

app.use(express.logger('dev'));
app.use(express.bodyParser({ keepExtensions: true }));
app.use(express.static(__dirname + "/app"));

var dbloc = "mongodb://127.0.0.1:27017/thesis";

var poscons = {
  "HDAC_inhibitor": [
    "dacinostat",
    "apicidin",
    "KM-00927",
    "ISOX",
    "HC-toxin",
    "merck-ketone",
    "trichostatin-a",
    "vorinostat",
    "belinostat",
    "panobinostat",
    "THM-I-94",
    "scriptaid"
  ],
  "HDAC_plus_random": [
    "dacinostat",
    "apicidin",
    "KM-00927",
    "ISOX",
    "HC-toxin",
    "merck-ketone",
    "trichostatin-a",
    "vorinostat",
    "belinostat",
    "panobinostat",
    "THM-I-94",
    "scriptaid",
    "BRD-K14395166",
    "PASK"
  ],
  "HDAC_plus_PI3K_inhibitor": [
    "dacinostat",
    "apicidin",
    "KM-00927",
    "ISOX",
    "HC-toxin",
    "merck-ketone",
    "trichostatin-a",
    "vorinostat",
    "belinostat",
    "panobinostat",
    "THM-I-94",
    "scriptaid",
    "XL-147",
    "AS-605240",
    "GSK-1059615",
    "idelalisib",
    "AS-604850",
    "honokiol",
    "wortmannin",
    "TGX-221",
    "NU-7441",
    "NVP-BEZ235",
    "LY-294002",
    "buparlisib",
    "AZD-6482",
    "PI-103"
  ],
  "PI3K_inhibitor": [
    "XL-147",
    "AS-605240",
    "GSK-1059615",
    "idelalisib",
    "AS-604850",
    "honokiol",
    "wortmannin",
    "TGX-221",
    "NU-7441",
    "NVP-BEZ235",
    "LY-294002",
    "buparlisib",
    "AZD-6482",
    "PI-103"
  ],
  "small_cluster": [
    "BRD-K97534490",
    "erbstatin-analog",
    "BRD-K58479490",
    "tozasertib",
    "BRD-K62056344",
    "fenbendazole",
    "BRD-A16820783",
    "VU-0365117-1",
    "ST-001903",
    "BRD-K34351329",
    "CYT-997",
    "fatostatin",
    "SB-225002",
    "scoulerine"
  ],
  "HDAC_with_small_cluster": [
    "dacinostat",
    "apicidin",
    "KM-00927",
    "ISOX",
    "HC-toxin",
    "merck-ketone",
    "trichostatin-a",
    "vorinostat",
    "belinostat",
    "panobinostat",
    "THM-I-94",
    "scriptaid",
    "BRD-K97534490",
    "erbstatin-analog",
    "BRD-K58479490",
    "tozasertib",
    "BRD-K62056344",
    "fenbendazole",
    "BRD-A16820783",
    "VU-0365117-1",
    "ST-001903",
    "BRD-K34351329",
    "CYT-997",
    "fatostatin",
    "SB-225002",
    "scoulerine"
  ],
};

function make_nodes_and_edges(docs, connection_thresh) {
    // take a list of docs and create an array of nodes and edges to be
    // sent back to client
    var seen_perts = [];
    var nodes = [];
    var edges = [];
    var indices = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var score = doc.median_rankpoint;
        var pert_iname_x = doc.pert_iname_x;
        var pert_iname_y = doc.pert_iname_y;
        if (pert_iname_x !== pert_iname_y) {
            if (seen_perts.indexOf(pert_iname_x) == -1) {
                // pert_iname_x hasn't been seen yet
                seen_perts.push(pert_iname_x);
                nodes.push( {"id": pert_iname_x} );
                indices[pert_iname_x] = nodes.length - 1;
            }
            if (seen_perts.indexOf(pert_iname_y) == -1) {
                // pert_iname_y hasn't been seen yet
                seen_perts.push(pert_iname_y);
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
app.get('/get_connections/:collection', function(req, res) {
    console.log(req.query);
    var collection_name = req.params.collection;
    var limit = req.query.limit;
    var thresh = req.query.thresh ? req.query.thresh : 90;
    var poscon_set = req.query.poscon;
    // var random = req.query.random : true ? false;
    MongoClient.connect(dbloc, function(err, db) {
        if(err) throw(err);
        var collection = db.collection(collection_name);
        if (poscon_set === undefined) {
          collection.find({}, {limit:limit}).toArray(function(err, results) {
              if (err) {
                  console.error(err);
              } else {
                  nodes_and_edges = make_nodes_and_edges(results, thresh);
                  res.send(nodes_and_edges);
              }
          })
        }
        else {
          collection.find({
            "$and": [
              {"pert_iname_x": {"$in": poscons[poscon_set]}},
              {"pert_iname_y": {"$in": poscons[poscon_set]}}
            ]
          }).toArray(function(err, results) {
              if (err) {
                  console.error(err);
              } else {
                  console.log(results.length + " results");
                  nodes_and_edges = make_nodes_and_edges(results, thresh);
                  res.send(nodes_and_edges);
              }
          })
        }
    })
})

app.listen(8080);
