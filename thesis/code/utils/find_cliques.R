## a script to find cliques in a graph
## and stick them into mongo

require("igraph", lib.loc="code/R")
require("rmongodb", lib.loc="code/R")

host <- "localhost"
db <- "thesis"
collection <- "cliques"

namespace <- paste(db, collection, sep=".")

# get args
args <- commandArgs(trailingOnly=T)
infile <- args[1]
analysis_id <- args[2]
min_size <- args[3] # optional

# make connection to mongo
mongo <- mongo.create(host=host, db=db)

# set min_size to 3 if not supplied
if (is.na(min_size)) {
	min_size <- 3
}

d <- read.delim(infile)
d <- d[, c("pert_iname_x", "pert_iname_y")]

g <- graph.data.frame(d, directed=F)

graph_cliques <- cliques(g, min=min_size)

clique_list <- list()

for (i in 1:length(graph_cliques)) {
	m <- g[graph_cliques[[i]]]
	members <- rownames(m)
	b <- mongo.bson.from.list(list(analysis_id=analysis_id, clique_id=i, members=members))
	mongo.insert(mongo, namespace, b)
}

