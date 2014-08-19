// code for defining the web server that will interact with
// the MongoDB database and, call R to compute clique density,
// and correspond with the QViz web-based visualization.
// Ted Natoli
// August 2014

var express = require('express');
var fs = require('fs');
var spawn = require('child_process').spawn;
var app = express();
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;

app.use(express.logger('dev'));
app.use(express.bodyParser({ keepExtensions: true }));
app.use(express.static(__dirname + "/app"));

var dbloc = "mongodb://127.0.0.1:27017/thesis";
var dump_dir = "/Users/tnatoli/github/thesis/thesis/code/app/data/tmp";
var clique_script_path = "/Users/tnatoli/github/thesis/thesis/code/utils/find_cliques.R"

// curated sets that should be interconnected
var poscons = {
  "HDAC_simple": [
    "dacinostat",
    "trichostatin-a",
    "vorinostat",
    "panobinostat"
  ],
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
    var seen_combos = [];
    var nodes = [];
    var edges = [];
    var indices = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var score = doc.score;
        var pert_iname_x = doc.pert_iname_x;
        var pert_type_x = doc.pert_type_x;
        var pert_iname_y = doc.pert_iname_y;
        var pert_type_y = doc.pert_type_y;
        if (pert_iname_x !== pert_iname_y) {
            var combo = [pert_iname_x, pert_iname_y].sort().join(":");
            if (seen_combos.indexOf(combo) == -1) {
                // haven't seen this combo yet, continue on and form a node/edge if appropriate
                seen_combos.push(combo);
                if (seen_perts.indexOf(pert_iname_x) == -1) {
                    // pert_iname_x hasn't been seen yet
                    seen_perts.push(pert_iname_x);
                    nodes.push( {"id": pert_iname_x, "pert_type": pert_type_x} );
                    indices[pert_iname_x] = nodes.length - 1;
                }
                if (seen_perts.indexOf(pert_iname_y) == -1) {
                    // pert_iname_y hasn't been seen yet
                    seen_perts.push(pert_iname_y);
                    nodes.push( {"id": pert_iname_y, "pert_type": pert_type_y} );
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
    return( {"nodes": nodes, "edges": edges} );
}

// dump a set of edges to a file
function dump_edges(nodes, edges, file_name, outpath) {
    var data = "source\ttarget\n";
    edges.forEach(function(edge) {
        data += nodes[edge.source].id + "\t" + nodes[edge.target].id + "\n";
    })
    fs.writeFile(outpath + "/" + file_name, data, function(err) {
        if(err) throw(err);
        console.log("edges saved\n");
    });
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
    var skip = req.query.skip ? parseInt(req.query.skip) : 0;
    var nodes = req.query.nodes ? req.query.nodes : false;
    if (!nodes) {
      res.send(500, "no nodes specified");
    }
    // make a time-stamp directory
    var ts_dir = req.query.analysis_id ? req.query.analysis_id : "query_" + new Date().getTime();
    var outdir = dump_dir + "/" + ts_dir;
    var edge_file = outdir + "/" + "edges.txt"
    fs.mkdir(outdir, function(err) {
        if(err) throw(err);
        console.log("created " + outdir);
    })
    MongoClient.connect(dbloc, function(err, db) {
      if(err) console.error(err);
      var collection = db.collection(collection_name);
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
              dump_edges(nodes_and_edges.nodes, nodes_and_edges.edges, "edges.txt", outdir);
              var clique = spawn("/usr/bin/Rscript", [clique_script_path, edge_file, ts_dir]);
              clique.stdout.on("data", function(data) {
                console.log(String(data));
              })
              clique.stderr.on("data", function(data) {
                console.error(String(data));
              })
              clique.on("exit", function(code) {
                console.log(code);
                res.send(nodes_and_edges);
              })
          }
      })
    })  
})

app.get('/get_cliques/:analysis_id', function(req, res) {
    // sends back all cliques given the current analysis id
    var analysis_id = req.params.analysis_id;
    MongoClient.connect(dbloc, function(err, db) {
      if(err) throw(err);
      var collection = db.collection('cliques');
      collection.find({"analysis_id": analysis_id}).toArray(function(err, results) {
              if (err) {
                  console.error(err);
              }
              else {
                  res.send(results[0]);
              }
          })
    })
})

app.get('/get_inames/:space', function(req, res) {
  var space = req.params.space;
  MongoClient.connect(dbloc, function(err, db) {
      if(err) console.error(err);
      var collection = db.collection('members');
      collection.find({"space": space}).toArray(function(err, results) {
              if (err) {
                  console.error(err);
              }
              else {
                  res.send(results[0]);
              }
          })
    })
})

app.get('/get_p_values', function(req, res) {
  // based on a clique density, largest clique size, score threshold, and number of nodes,
  // compute significance from null collection
  var threshold = parseInt(req.query.threshold);
  var sample_size = parseInt(req.query.sample_size);
  var num_cliques = parseInt(req.query.num_cliques);
  var largest_clique_size = parseInt(req.query.largest_clique_size);
  console.log(threshold, sample_size, num_cliques, largest_clique_size);
  MongoClient.connect(dbloc, function(err, db) {
    if (err) console.error(err);
    var collection = db.collection("null_cliques");
    collection.find({"sample_size": sample_size, "score": threshold}).toArray(function(err, results) {
      if (err) console.error(err);
      else {
        console.log(results);
        num_instances = results.length;
        var ge_clique_density = results.filter(function(x) {
          return x.num_cliques >= num_cliques;
        });
        var ge_largest_clique_size = results.filter(function(x) {
          return x.largest_clique_size >= largest_clique_size;
        });
        var clique_density_p = Math.round(100 * (ge_clique_density.length / num_instances)) / 100; 
        var largest_clique_size_p = Math.round(100 * (ge_largest_clique_size.length / num_instances)) / 100; 
        res.send({"clique_density_p": clique_density_p, "largest_clique_size_p": largest_clique_size_p});
      }
    })
  })
})

app.listen(8080);
