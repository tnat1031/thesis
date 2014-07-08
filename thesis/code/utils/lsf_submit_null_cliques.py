'''
simple helper script to submit null clique jobs to lsf
'''

import os
import sys

if __name__ == '__main__':
	rscript_file = sys.argv[1]
	space_file = sys.argv[2]
	outpath = sys.argv[3]

	# loop through scores and sample sizes
	for size in range(2, 101):
		for score in range(90, 100):
			dirname = 'null_cliques_size_' + str(size) + '_score_' + str(score)
			odir = os.path.join(outpath, dirname)
			if not os.path.exists(odir):
				os.mkdir(odir)
			# Rscript code/utils/make_null_clique_distribs.R data/matched_lass_n10644x7533.txt ./ 90 90 5 5
			cmd = 'bsub -P cmap -J {0}_{1} -q week -R rusage[mem=16] Rscript {2} {3} {4} {5} {6} {7} {8}'.format(score, size, rscript_file, space_file, odir, score, score, size, size)
			print cmd
			#os.system(cmd)