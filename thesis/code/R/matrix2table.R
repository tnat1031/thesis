## script to take a gctx file and convert
## to a set of pairwise comparisons for 
## insert into mongo

require("reshape")
require("data.table")
source("code/R/io.R")

args <- commandArgs(trailingOnly=T)
infile <- args[1]
outpath <- args[2]
annot_file <- args[3] # optional

# these must exist in the annotations
required_fields <- c(
	"sig_id",
	"pert_iname",
	"pert_id",
	"pert_type"
	)

# read in data
cat(paste("reading", infile, "\n"))
g <- parse.gctx(infile)

fileparts <- unlist(strsplit(basename(g@src), "\\."))
fname <- paste(fileparts[1: (length(fileparts) - 1)], collapse="")

# check for annotations
if (!is.na(annot_file)) {
	annots <- read.delim(annot_file)
} else {
	annots <- g@cdesc
}

if (!all(required_fields %in% names(annots))) {
	if (!is.na(annot_file)) {
		stop("required fields missing from annotations file: ", paste(setdiff(required_fields, names(annots)), collapse="\n"))
	}
	else {
		stop("required fields missing from matrix column annotations: ", paste(setdiff(required_fields, names(annots)), collapse="\n"))
	}
}

# subset only to columns of interest
annots <- data.table(annots[, required_fields])

# convert to long form
cat("melting...\n")
mlt <- melt(g@mat)
names(mlt) <- c("sig_id", "sig_id_y", "score")

# remove self-comparisons
mlt <- droplevels(subset(mlt, sig_id != sig_id_y))

# merge annotations back in
cat("merging annotations...\n")
d <- data.table(mlt)
d <- merge(d, annots, by="sig_id")
setnames(d, "sig_id", "sig_id_x")
setnames(d, "sig_id_y", "sig_id")
d <- merge(d, annots, by="sig_id", suffixes=c("_x", "_y"))
setnames(d, "sig_id", "sig_id_y")

# write output
ofile <- paste(outpath, paste(fname, ".txt", sep=""), sep="/")
cat(paste("saving to"), ofile, "\n")
write.table(d, file=ofile, col.names=T, row.names=F, sep="\t", quote=F)



