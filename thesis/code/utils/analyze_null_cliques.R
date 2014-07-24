# Script to make a lookup table of null clique distributions
# based on input set size and connectivity threshold. Also
# to generate figures for analysis.
#
# Submitted as part of ALM in Biotechnology Masters's Thesis
# Theodore Natoli
# Harvard Extension School
# July 2014


# load libraries
require("ggplot2")
require("plyr")

# get command line arguments
args <- commandArgs(trailingOnly=T)
null_file <- args[1]
outpath <- args[2]

# read in data
d <- read.delim(null_file)

# add column to compute clique_density
d$clique_density <- d$num_cliques / d$sample_size

# make histogram of clique_density for a series
# of sizes and score thresholds
sizes <- c(10, 20, 30, 40, 50)
scores <- c(90, 92, 94, 96, 98)
dsub <- droplevels(subset(d, sample_size %in% sizes & score %in% scores))

p <- ggplot(dsub, aes(x=clique_density)) + theme_bw()
p <- p + geom_histogram()
p <- p + facet_grid(sample_size ~ score)
ggsave(paste(outpath, "null_clique_hist.png", sep="/"), height=7, width=7)