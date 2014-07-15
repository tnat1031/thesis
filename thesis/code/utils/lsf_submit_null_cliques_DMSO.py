'''
simple helper script to submit null clique jobs to lsf
'''

import os
import sys
import cmap.io.plategrp as grp

if __name__ == '__main__':
	rscript_file = sys.argv[1]
	space_file = sys.argv[2]
	summly_file = sys.argv[3]
	list_of_sig_ids = sys.argv[4]
	sig_id_file_path = sys.argv[5]
	outpath = sys.argv[6]
	min_size = int(sys.argv[7])
	max_size = int(sys.argv[8])
	min_score = int(sys.argv[9])
	max_score = int(sys.argv[10])

	sig_id_files = grp.read_grp(list_of_sig_ids)

	# loop through scores and sample sizes and sig_id files
	for s in sig_id_files:
		for size in range(min_size, max_size + 1):
			for score in range(min_score, max_score + 1):
				# dirname = os.path.join(outpath, s)
				odir = os.path.join(outpath, s)
				if not os.path.exists(odir):
					os.mkdir(odir)
				# Rscript code/utils/make_null_clique_distribs.R data/matched_lass_n10644x7533.txt ./ 90 90 5 5
				cmd = 'bsub -P cmap -J dmso_{0}_{1} -o {2} -q week -R rusage[mem=4] Rscript {3} {4} {5} {6} {7} {8} {9} {10} {11}'.format(score, size, os.path.join(odir, 'lsf.out'), rscript_file, space_file, summly_file, os.path.join(sig_id_file_path, s), odir, score, score, size, size)
				print cmd
				#os.system(cmd)