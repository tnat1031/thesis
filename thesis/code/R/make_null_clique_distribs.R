# a script to take a connection space
# and compute the distribution of clique number
# amd max clique size for random subsets
# of various sizes

args <- commandArgs(trailingOnly=T)
space_file <- args[1]
outpath <- args[2]
max_sample_size <- args[3]

if(is.na(max_sample_size)) {
	max_sample_size <- 10
}

# get list of all nodes in dataset

for (i in 1:max_sample_size) {
	samp <- 
}