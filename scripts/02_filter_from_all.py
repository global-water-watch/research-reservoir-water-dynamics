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
PATH_TIME_SERIES_IN = f'../data/reservoir-time-series-2021-Q4-all/time_series_area_raw_update'

# path to store merged time series
PATH_TIME_SERIES_OUT = f'../data/reservoir-time-series-2021-Q4-all/time_series_area_raw'

# create destination dir
pathlib.Path(PATH_TIME_SERIES_OUT).mkdir(exist_ok=True)

files_ts_in = []

for f in pathlib.Path(PATH_TIME_SERIES_IN).glob('*.csv'):
    files_ts_in.append(pathlib.Path(PATH_TIME_SERIES_IN) / f.name)

print(len(files_ts_in))

progress = tqdm(files_ts_in)

reservoirs = ee.FeatureCollection('projects/global-water-watch/assets/reservoirs-v1-0')

# info = reservoirs.filter(ee.Filter.eq('fid', fid)).getInfo()['features'][0]['properties']
fids = reservoirs.aggregate_array('fid').getInfo()
cloud_frequencies = reservoirs.aggregate_array('cloud_frequency').getInfo()

fid2cloud = dict(zip(fids, cloud_frequencies))

for path in progress:
    try:
        df = pd.read_csv(path)
    except:
        continue # skip empty files

    # lookup cloud frequency and filter out noise
    fid = int(path.stem)
    cloud_frequency = fid2cloud[fid]

    if cloud_frequency > 0.9:
        cloud_frequency = 0.9

    cloud_frequency -= 0.05 # heuristics: 5% less than the actual clouding, maybe for the costs of little noise

    quality_score_threshold = np.quantile(df.quality_score.values, 1 - cloud_frequency)

    df = df[df.water_area_filled_fraction < 0.5]
    df = df[df.quality_score < quality_score_threshold]

    # write    
    path_new = pathlib.Path(PATH_TIME_SERIES_OUT) / path.name
    progress.set_description(f'Cleaning up: {path_new.name}')

    df.to_csv(path_new, index=False)


