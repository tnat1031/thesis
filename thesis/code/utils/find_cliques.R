## a script to find cliques in a graph
## and stick them into mongo

require("igraph", lib.loc="/Users/tnatoli/github/thesis/thesis/code/R")
require("rmongodb", lib.loc="/Users/tnatoli/github/thesis/thesis/code/R")

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
d <- d[, c("source", "target")]

g <- graph.data.frame(d, directed=F)

# find the cliques
graph_cliques <- cliques(g, min=min_size)
largest_cliques <- largest.cliques(g)
if(length(largest_cliques) != 0) {
	largest_clique_size <- length(largest_cliques[[1]])
} else {
	largest_clique_size <- 0
}

# were there any cliques?
if (length(graph_cliques) == 0) {
	# no, insert a single record with zero members
	members <- c()
	b <- mongo.bson.from.list(
		list(analysis_id=analysis_id,
		   	 clique_id=0,
		     members=members,
		     num_members=length(members),
		     largest_clique_size=largest_clique_size,
		     largest_cliques=largest_cliques
	))
	mongo.insert(mongo, namespace, b)
} else {
	## update this to only insert one document into mongo

	for (i in 1:length(graph_cliques)) {
		m <- g[graph_cliques[[i]]]
		members <- rownames(m)
		b <- mongo.bson.from.list(list(analysis_id=analysis_id, clique_id=i, members=members, num_members=length(members)))
		mongo.insert(mongo, namespace, b)
	}
}



