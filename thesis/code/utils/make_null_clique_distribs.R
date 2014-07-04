# a script to take a connection space
# and compute the distribution of clique number
# amd max clique size for random subsets
# of various sizes

# could multicore this
require("igraph")
require("igraph", lib.loc="/Users/tnatoli/github/thesis/thesis/code/R")

args <- commandArgs(trailingOnly=T)
space_file <- args[1]
outpath <- args[2]
min_score <- args[3]
max_score <- args[4]
max_sample_size <- args[5]
min_size <- args[6]

if(is.na(min_score)) {
	min_score <- 90
}

if(is.na(max_score)) {
	max_score <- 99
}

if(is.na(max_sample_size)) {
	max_sample_size <- 20
}

if(is.na(min_size)) {
	min_size <- 3
}

# read in dataset
cat("reading in data...\n")
d <- read.delim(space_file)

# make a subset of just pert iname columns
d <- droplevels(d[, c("pert_iname_x", "pert_iname_y")])

dlist <- list()

cat("iterating...\n")
for (i in 2:max_sample_size) {
	cat(paste(i, "\t"))
	# for every sample size
	for(j in 1:1000) {
		cat(paste("\t", j, "\t"))
		# for 1000 iterations
		for(z in min_score:max_score) {
			cat(paste("\t", "\t", z, "\n"))
			# for every score
			# subset to connection threshold
			cat("subsetting...\n")
			dsub <- droplevels(subset(d, abs(score) >= z))
			# get list of all nodes in dataset
			cat("generating list of nodes...\n")
			nodes <- unique(c(as.character(dsub$pert_iname_x), as.character(dsub$pert_iname_y)))
			sample_space <- sample(nodes, i)
			samp <- droplevels(subset(dsub, pert_iname_x %in% sample_space & pert_iname_y %in% sample_space))
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
							  iteration=j,
							  score=z,
							  num_cliques=num_cliques,
							  largest_clique_size=largest_clique_size)
			dlist[[length(dlist) + 1]] <- tmp
		}
	}
}

out <- do.call("rbind", dlist)

# write null table out 
cat("writing null table...")
fname <- paste("null_cliques", basename(space_file), sep="_")
write.table(out, paste(outpath, fname, sep="/"), col.names=T, row.names=F, sep="\t", quote=F)

