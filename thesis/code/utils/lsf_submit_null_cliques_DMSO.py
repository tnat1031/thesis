'''
simple helper script to submit null clique jobs to lsf
'''

import os
import sys

if __name__ == '__main__':
	rscript_file = sys.argv[1]
	space_file = sys.argv[2]
	summly_file = sys.argv[3]
	sig_id_file = sys.argv[4]
	outpath = sys.argv[5]
	min_size = sys.argv[6]
	max_size = sys.argv[7]
	min_score = sys.argv[8]
	max_score = sys.argv[9]

	# loop through scores and sample sizes
	for size in range(min_size, max_size + 1):
		for score in range(min_score, max_score + 1):
			dirname = 'null_cliques_size_' + str(size) + '_score_' + str(score)
			odir = os.path.join(outpath, dirname)
			if not os.path.exists(odir):
				os.mkdir(odir)
			# Rscript code/utils/make_null_clique_distribs.R data/matched_lass_n10644x7533.txt ./ 90 90 5 5
			cmd = 'bsub -P cmap -J dmso_{0}_{1} -o {2} -q week -R rusage[mem=4] Rscript {3} {4} {5} {6} {7} {8} {9} {10} {11}'.format(score, size, os.path.join(odir, 'lsf.out'), rscript_file, space_file, summly_file, sig_id_file, odir, score, score, size, size)
			print cmd
			#os.system(cmd)