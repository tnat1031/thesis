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
if(nrow(d) == 0) {
	graph_cliques <- list()
	largest_cliques <- list()
	largest_clique_size <- 0
} else {
	if(length(largest_cliques) != 0) {
		largest_clique_size <- length(largest_cliques[[1]])
	} else {
		largest_clique_size <- 0
	}
}


# were there any cliques?
# if (length(graph_cliques) == 0) {
# 	# no, insert a single record with zero members
# 	members <- c()
# 	b <- mongo.bson.from.list(
# 		list(analysis_id = analysis_id,
# 		   	 clique_id = 0,
# 		     members = members,
# 		     num_members = length(members),
# 		     largest_clique_size = largest_clique_size,
# 		     largest_cliques = largest_cliques
# 		)
# 	)
# 	mongo.insert(mongo, namespace, b)
# } else {
# 	## update this to only insert one document into mongo
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
	mongo.insert(mongo, namespace, b)
# }



