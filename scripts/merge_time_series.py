"""
Script for merging time series updates for global reservoirs dataset
"""
import os

import pathlib

import pandas as pd

from tqdm import tqdm

import matplotlib.pylab as plt

def is_non_zero_file(fpath):
    return os.path.isfile(fpath) and os.path.getsize(fpath) > 1

# shows plots
DEBUG = False
# DEBUG = True

# previous time series (full time range, 1985-20XX)
PATH_TIME_SERIES_IN = '../data/reservoir-time-series-2021-Q1/time_series_area_raw/'

# new update (small increments)
PATH_TIME_SERIES_IN_UPDATE = '../data/reservoir-time-series-2021-Q2/time_series_area_raw_update'

# path to store merged time series
PATH_TIME_SERIES_OUT = '../data/reservoir-time-series-2021-Q2/time_series_area_raw'

# create destination dir
pathlib.Path(PATH_TIME_SERIES_OUT).mkdir(exist_ok=True)

files_ts_in = list(pathlib.Path(PATH_TIME_SERIES_IN).glob('*.csv'))

progress = tqdm(files_ts_in)
for path in progress:
    df_old = pd.read_csv(path)
    
    path_new = pathlib.Path(PATH_TIME_SERIES_IN_UPDATE) / path.name

    is_empty = not is_non_zero_file(path_new)

    if is_empty:
        progress.set_description(f'Skipping empty: {path_new.name}')
        df_merged = df_old
    else:
        progress.set_description(f'Merging: {path_new.name}')
        df_new = pd.read_csv(path_new)
        df_merged = pd.concat([df_old, df_new])
        df_merged = df_merged.fillna(method='ffill')

    if DEBUG:
        fig, ax = plt.subplots(figsize=(30, 5))
        
        c = ['water_area_time', 'water_area_filled']
        df_merged.plot(x=c[0], y=c[1:], ax=ax, lw=0.5, style=".", ms=3)

        if not is_empty:
            df_new.plot(x=c[0], y=c[1:], ax=ax, lw=0.5, style=".", ms=3)

        plt.show()
    
    # write results
    path_merged = pathlib.Path(PATH_TIME_SERIES_OUT) / path.name
    df_merged.to_csv(path_merged, index=False)
    

