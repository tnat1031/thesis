## A script to find cliques in a graph
## and insert them into a mongodb collection
## as part of the QViz application backend.
## Ted Natoli
## August 2014


# load required packages
require("igraph", lib.loc="/Users/tnatoli/github/thesis/thesis/code/R")
require("rmongodb", lib.loc="/Users/tnatoli/github/thesis/thesis/code/R")

# set some global variables
host <- "localhost"
db <- "thesis"
collection <- "cliques"

namespace <- paste(db, collection, sep=".")

# get arguments
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

# read in the data
d <- read.delim(infile)
d <- d[, c("source", "target")]

# make the graph object
g <- graph.data.frame(d, directed=F)

# find the cliques
graph_cliques <- cliques(g, min=min_size)
largest_cliques <- largest.cliques(g)
if(nrow(d) == 0) {
	graph_cliques <- list()
	largest_cliques <- list()
	largest_clique_size <- 0
} else {
	if(length(largest_cliques) != 0) {
		if (length(largest_cliques[[1]]) > 2) {
			# need at least 3 members in the largest clique
			largest_clique_size <- length(largest_cliques[[1]])
		}
		else {
			largest_clique_size <- 0
			largest_cliques <- list()
		}
	} else {
		largest_clique_size <- 0
	}
}

# format the cliques for insertion into mongo
mongo_cliques <- list()
mongo_largest_cliques <- list()
for (gc in graph_cliques) {
	m <- g[gc]
	members <- rownames(m)
	mongo_cliques[[length(mongo_cliques) + 1]] <- list(size = length(members), members = members)
}
for (lc in largest_cliques) {
	m <- g[lc]
	members <- rownames(m)
	mongo_largest_cliques[[length(mongo_largest_cliques) + 1]] <- list(size = length(members), members = members)
}
# make a bson object
b <- mongo.bson.from.list(
			list(
				analysis_id=analysis_id,
				num_cliques = length(graph_cliques),
				cliques = mongo_cliques,
				largest_clique_size = unlist(largest_clique_size),
	     		largest_cliques = mongo_largest_cliques
				)
			)
print(str(b))
# do the insertion
mongo.insert(mongo, namespace, b)



