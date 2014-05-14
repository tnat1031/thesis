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
    // var nodes_only = typeof(nodes_only) !== 'undefined' ? nodes_only : false;
    // var edges_only = typeof(egdes_only) !== 'undefined' ? edges_only : false;
    var seen_perts = [];
    var seen_combos = [];
    var nodes = [];
    var edges = [];
    var indices = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var score = doc.median_rankpoint;
        var pert_iname_x = doc.pert_iname_x;
        var pert_iname_y = doc.pert_iname_y;
        if (pert_iname_x !== pert_iname_y) {
            var combo = [pert_iname_x, pert_iname_y].sort().join(":");
            if (seen_combos.indexOf(combo) == -1) {
                // haven't seen this combo yet, continue on and form a node/edge if appropriate
                seen_combos.push(combo);
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
    }
    // if (nodes_only) return(nodes);
    // else if (edges_only) return(edges);
    return( {"nodes": nodes, "edges": edges} );
}

// set up some routes
app.get('/get_connections/:collection', function(req, res) {
    // sends back an object with keys for nodes and edges
    // allows specifying a poscon set to return
    console.log(req.query);
    console.log(req.body);
    var collection_name = req.params.collection;
    var limit = parseInt(req.query.limit);
    var thresh = req.query.thresh ? req.query.thresh : 90;
    var poscon_set = req.query.poscon;
    var skip = req.query.skip ? parseInt(req.query.skip) : 0;
    var nodes = req.query.nodes ? req.query.nodes : false;
    // var nodes_only = typeof(req.query.nodes_only) !== 'undefined' ? nodes_only : false;
    // var edges_only = typeof(req.query.egdes_only) !== 'undefined' ? edges_only : false;
    // var random = req.query.random : true ? false;
    MongoClient.connect(dbloc, function(err, db) {
        if(err) throw(err);
        var collection = db.collection(collection_name);
        if (nodes) {
            // request has specified specific nodes to search for, use them
          collection.find({
            "$and": [
              {"pert_iname_x": {"$in": nodes}},
              {"pert_iname_y": {"$in": nodes}}
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
        else if (poscon_set === undefined) {
            // no nodes or poscon set defined, just return however many nodes specified
          collection.find({}, {limit:limit, skip:skip}).toArray(function(err, results) {
              if (err) {
                  console.error(err);
              } else {
                  nodes_and_edges = make_nodes_and_edges(results, thresh);
                  res.send(nodes_and_edges);
              }
          })
        }
        else {
            // poscon set was specified, return it
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
