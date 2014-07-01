# a script to take a connection space
# and compute the distribution of clique number
# amd max clique size for random subsets
# of various sizes

# could multicore this

require("igraph", lib.loc="/Users/tnatoli/github/thesis/thesis/code/R")

args <- commandArgs(trailingOnly=T)
space_file <- args[1]
outpath <- args[2]
score_thresh <- args[3]
max_sample_size <- args[4]
min_size <- args[5]

if(is.na(score_thresh)) {
	score_thresh <- 90
}

if(is.na(max_sample_size)) {
	max_sample_size <- 10
}

if(is.na(min_size)) {
	min_size <- 3
}

# read in dataset
d <- read.delim(space_file)

# subset to connection threshold
d <- droplevels(subset(d, abs(score) >= score_thresh))

# make a subset of just pert iname columns
d <- droplevels(d[, c("pert_iname_x", "pert_iname_y")])

# get list of all nodes in dataset
nodes <- unique(c(as.character(d$pert_iname_x), as.character(d$pert_iname_y)))

dlist <- list()

for (i in 1:max_sample_size) {
	# for every sample size
	for(j in 1:1000) {
		# for 1000 iterations
		sample_space <- sample(nodes, i)
		samp <- droplevels(subset(d, pert_iname_x %in% sample_space & pert_iname_y %in% sample_space))
		g <- graph.data.frame(samp, directed=F)
		graph_cliques <- cliques(g, min=min_size)
		num_cliques <- length(graph_cliques)
		largest_cliques <- largest.cliques(g)
		if(length(largest_cliques) != 0) {
			largest_clique_size <- length(largest_cliques[[1]])
		}
		else {
			largest_clique_size <- 0
		}
		tmp <- data.frame(sample_size=i,
						  num_cliques=num_cliques,
						  largest_clique_size=largest_clique_size)
		dlist[[length(dlist) + 1]] <- tmp
	}
}

out <- do.call("rbind", dlist)