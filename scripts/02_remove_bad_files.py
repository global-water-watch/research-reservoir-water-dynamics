"""
This is an experimental scripts to filter out time series which contain *all* images (with noise)
based on average reservoir cloud frequency
"""

import os
import pathlib
import pandas as pd
import numpy as np
from tqdm import tqdm
import ee
ee.Initialize()

# previous time series (full time range, 1985-20XX)
PATH = f'../data/reservoir-time-series-2022-Q2/time_series_area_raw_update'

files = list(pathlib.Path(PATH).glob('*.csv'))

print(len(files))

reservoirs = ee.FeatureCollection('projects/global-water-watch/assets/reservoirs-v1-0')

# info = reservoirs.filter(ee.Filter.eq('fid', fid)).getInfo()['features'][0]['properties']
fids = reservoirs.aggregate_array('fid').getInfo()

print(len(fids))

progress = tqdm(files)
for f in progress:
    id = int(f.stem)
    progress.set_description(str(id))
    if id not in fids:
        f.unlink()



# cloud_frequencies = reservoirs.aggregate_array('cloud_frequency').getInfo()

# fid2cloud = dict(zip(fids, cloud_frequencies))

# for path in progress:
#     try:
#         df = pd.read_csv(path)
#     except:
#         continue # skip empty files

#     if len(df) == 0:
#         df.to_csv(df, index=False)
#         continue

#     # lookup cloud frequency and filter out noise
#     fid = int(path.stem)
#     cloud_frequency = fid2cloud[fid]

#     if cloud_frequency > 0.9:
#         cloud_frequency = 0.9

#     cloud_frequency -= 0.05 # heuristics: 5% less than the actual clouding, maybe for the costs of little noise

#     quality_score_threshold = np.quantile(df.quality_score.values, 1 - cloud_frequency)

#     df = df[df.water_area_filled_fraction < 0.5]
#     df = df[df.quality_score < quality_score_threshold]

#     # write    
#     path_new = pathlib.Path(PATH_TIME_SERIES_OUT) / path.name
#     progress.set_description(f'Cleaning up: {path_new.name}')

#     df.to_csv(path_new, index=False)


