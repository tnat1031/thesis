## script to take a gctx file and convert
## to a set of pairwise comparisons for 
## insert into mongo

require("reshape")
require("data.table")
require("roller")
#source("code/R/io.R")

args <- commandArgs(trailingOnly=T)
infile <- args[1]
outpath <- args[2]
column_id_field <- args[3] # optional
row_id_field <- args[4] # optional
column_annot_file <- args[5] # optional
row_annot_file <- args[6] # optional

# check for id field
# if none found, assume sig_id
if (is.na(column_id_field)) {
	column_id_field <- "sig_id"
}

if (is.na(row_id_field)) {
	row_id_field <- "sig_id"
}

# these must exist in the annotations
column_required_fields <- c(
	column_id_field,
	"pert_iname",
	"pert_id",
	"pert_type"
	)

row_required_fields <- c(
	row_id_field,
	"pert_iname",
	"pert_id",
	"pert_type"
	)

# read in data
cat(paste("reading", infile, "\n"))
g <- parse.gctx(infile)

fileparts <- unlist(strsplit(basename(g@src), "\\."))
fname <- paste(fileparts[1: (length(fileparts) - 1)], collapse="")

# check for row and column annotations
if (!is.na(column_annot_file)) {
	cdesc <- read.delim(column_annot_file)
} else {
	cdesc <- g@cdesc
}

if (!is.na(row_annot_file)) {
	rdesc <- read.delim(row_annot_file)
} else {
	rdesc <- g@rdesc
}


# make sure all required annotatoins are there
if (!all(column_required_fields %in% names(cdesc))) {
	if (!is.na(column_annot_file)) {
		stop("required fields missing from column annotations file: ", paste(setdiff(column_required_fields, names(cdesc)), collapse="\n"))
	}
	else {
		stop("required fields missing from matrix column annotations: ", paste(setdiff(column_required_fields, names(cdesc)), collapse="\n"))
	}
}

if (!all(row_required_fields %in% names(rdesc))) {
	if (!is.na(row_annot_file)) {
		stop("required fields missing from row annotations file: ", paste(setdiff(row_required_fields, names(rdesc)), collapse="\n"))
	}
	else {
		stop("required fields missing from matrix row annotations: ", paste(setdiff(row_required_fields, names(rdesc)), collapse="\n"))
	}
}

# rename id_field to id
names(cdesc)[names(cdesc) == column_id_field] <- "id"
column_required_fields[column_required_fields == column_id_field] <- "id"
names(rdesc)[names(rdesc) == row_id_field] <- "id"
row_required_fields[row_required_fields == row_id_field] <- "id"

# subset only to columns of interest
cdesc <- data.table(cdesc[, column_required_fields])
rdesc <- data.table(rdesc[, row_required_fields])

# convert to long form
cat("melting...\n")
mlt <- melt(g@mat)
names(mlt) <- c("id", "id_y", "score")
mlt$id <- as.character(mlt$id)
mlt$id_y <- as.character(mlt$id_y)

# remove self-comparisons
mlt <- droplevels(subset(mlt, id != id_y))

# merge annotations back in
cat("merging annotations...\n")
d <- data.table(mlt)
d <- merge(d, rdesc, by="id")
setnames(d, "id", "id_x")
setnames(d, "id_y", "id")
d <- merge(d, cdesc, by="id", suffixes=c("_x", "_y"))
setnames(d, "id", "id_y")

# write output
ofile <- paste(outpath, paste(fname, ".txt", sep=""), sep="/")
cat(paste("saving to"), ofile, "\n")
write.table(d, file=ofile, col.names=T, row.names=F, sep="\t", quote=F)



