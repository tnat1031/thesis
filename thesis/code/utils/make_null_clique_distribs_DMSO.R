# a script to take a connection space
# and compute the distribution of clique number
# amd max clique size for random subsets
# of various sizes

# could multicore this
require("igraph")
require("igraph", lib.loc="/Users/tnatoli/github/thesis/thesis/code/R")

args <- commandArgs(trailingOnly=T)
space_file <- args[1]
summly_file <- args[2]
sig_id_file <- args[3]
outpath <- args[4]
min_score <- args[5]
max_score <- args[6]
min_sample_size <- args[7]
max_sample_size <- args[8]
min_clique_size <- args[9]

if(is.na(min_score)) {
	min_score <- 90
}

if(is.na(max_score)) {
	max_score <- 99
}

if(is.na(min_sample_size)) {
	min_sample_size <- 2
}

if(is.na(max_sample_size)) {
	max_sample_size <- 100
}

if(is.na(min_clique_size)) {
	min_clique_size <- 3
}

# define main function
get_cliques <- function(sig_ids, min_sample_size, max_sample_size, min_score, max_score) {
	dlist <- list()
	cat("iterating...\n")
	for (sig_id in sig_ids) {
		cat(paste(sig_id, "\t"))
		for (i in min_sample_size:max_sample_size) {
			cat(paste(i, "\t"))
			for(z in min_score:max_score) {
				cat(paste("\t", "\t", z, "\n"))
				# for every score
				# subset to connection threshold
				cat("subsetting...\n")
				dsub <- droplevels(subset(d, abs(score) >= z & id_y == sig_id))
				dsub <- droplevels(dsub[, c("pert_iname_x", "pert_iname_y")])
				
				# get list of all nodes in dataset
				cat("generating list of nodes...\n")
				nodes <- unique(c(as.character(dsub$pert_iname_x), as.character(dsub$pert_iname_y)))
				sample_space <- sample(nodes, i)
				
				# look up their scores in summly space
				cat("looking up scores...\n")
				summly_sub <- droplevels(subset(summly, pert_iname_x %in% sample_space & pert_iname_y %in% sample_space,
											select=c("pert_iname_x", "pert_iname_y")))
				
				# generate the graph anc compute some stats
				cat("generating graph...\n")
				g <- graph.data.frame(summly_sub, directed=F)
				graph_cliques <- cliques(g, min=min_clique_size)
				num_cliques <- length(graph_cliques)
				largest_cliques <- largest.cliques(g)
				if(length(largest_cliques) != 0) {
					largest_clique_size <- length(largest_cliques[[1]])
				}
				else {
					largest_clique_size <- 0
				}
				tmp <- data.frame(sample_size=i,
								  sig_id=sig_id,
								  score=z,
								  num_cliques=num_cliques,
								  largest_clique_size=largest_clique_size)
				dlist[[length(dlist) + 1]] <- tmp
			}
		}
	}

	out <- do.call("rbind", dlist)
	return(out)
}

# read in datasets
cat("reading in data...\n")
d <- read.delim(space_file)
sig_ids <- parse.grp(sig_id_file)

summly <- read.delim(summly_file)




# get the cliques
out <- get_cliques(sig_ids, min_sample_size, max_sample_size, min_score, max_score)


# write null table out 
cat("writing null table...\n")
fname <- paste("null_cliques", basename(space_file), sep="_")
write.table(out, paste(outpath, fname, sep="/"), col.names=T, row.names=F, sep="\t", quote=F)

