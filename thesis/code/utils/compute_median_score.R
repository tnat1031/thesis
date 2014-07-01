# script to take an input matrix
# and compute some aggregate scores
# for all unique combos of pert iname comparisons
# assumes a summly level matrix

require("roller")
require("reshape")
require("plyr")
require("data.table")

args <- commandArgs(trailingOnly=T)
gct_path <- args[1]
cdesc_path <- args[2]
rdesc_path <- args[3]
outpath <- args[4]

# read in data
g <- parse.gctx(gct_path)
cdesc <- read.delim(cdesc_path)
rdesc <- read.delim(rdesc_path)

# melt the matrix
mlt <- melt(g@mat)
names(mlt) <- c("pert_id", "summly_id", "score")

# merge in annots
cdesc_simple <- data.table(cdesc[, c("summly_id", "pert_id", "pert_type", "pert_iname")])
rdesc_simple <- data.table(rdesc[, c("pert_id", "pert_type", "pert_iname")])
d <- merge(data.table(mlt), cdesc_simple, by="summly_id", suffixes=c("_x", "_y"))
setnames(d, "pert_id_x", "pert_id")
d <- merge(rdesc_simple, d, by="pert_id", suffixes=c("_x", "_y"))
setnames(d, "pert_id", "pert_id_x")
d <- data.frame(d)

# get rid of self-comparisons
d$pert_iname_x <- as.character(d$pert_iname_x)
d$pert_iname_y <- as.character(d$pert_iname_y)
d <- droplevels(subset(d, pert_iname_x != pert_iname_y))

# do the aggregation
# need to chunk because memory is an issue
pert_inames <- unique(c(as.character(d$pert_iname_x)), as.character(d$pert_iname_y))
agg_list <- list()
chunk_size <- 1000
for(i in 1:floor(length(pert_inames)/chunk_size)) {
	chunk_idx <- # need to finish this
	tmp <- d[d$pert_iname_x %in% 
	tmp_agg <- ddply(tmp, pert_type_x ~ pert_iname_x ~ pert_iname_y ~ pert_type_y, function(x) {
		data.frame(
			median_score = median(x$score),
			max_score = max(x$score),
			min_score = min(x$score),
			num_comparisons = nrow(x)
			)
		})
}

write.table(agg, path.join(outpath, "aggregate_scores.txt"), col.names=T, row.names=F, sep="\t", quote=F)