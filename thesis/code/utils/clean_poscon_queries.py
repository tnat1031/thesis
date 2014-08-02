'''
script to clean up the summly output for the poscon queries

required columns:
id_y	id_x	score	pert_iname_x	id.1	pert_type_x	pert_iname_y	pert_id	pert_type_y

'''

import pandas as pd
import sys
import os

infile = sys.argv[1]
query_name = sys.argv[2]
query_pert_type = sys.argv[3]


d = pd.read_table(infile)

# add a column for query name
d['id_y'] = pd.Series([query_name] * len(d), index=d.index)
d['pert_type_y'] = pd.Series([query_pert_type] * len(d), index=d.index)
d['id_x'] = d.sum_id
d['score'] = d.mean_rankpt_4
d['pert_iname_x'] = d.pert_iname
d['pert_iname_y'] = d.id_y
d['pert_type_x'] = d.pert_type

cols = ['id_y','pert_type_y', 'id_x', 'score', 'pert_iname_x', 'pert_iname_y', 'pert_type_x']

fname = os.path.splitext(infile)[0] + '_clean.txt'
out = d[cols]
out.to_csv(fname, sep='\t', index=False)