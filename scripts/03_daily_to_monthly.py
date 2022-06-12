import os
import pathlib
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import json
import ipywidgets as widgets
import datetime
import seaborn as sns
import scipy
import statsmodels.api as sm
from ipywidgets import interact, interact_manual
import dateutil.parser
from tqdm import tqdm

DIR_DATA = '../data/reservoir-time-series-2022-Q2'

# input
DIR_EO = f'{DIR_DATA}/time_series_area_raw/'

# output
DIR_EO_MONTHLY = f'{DIR_DATA}/time_series_area_monthly/'
DIR_EO_SMALL = f'{DIR_DATA}/time_series_area/'  # raw time,area series only

pathlib.Path(DIR_EO_MONTHLY).mkdir(exist_ok=True)
pathlib.Path(DIR_EO_SMALL).mkdir(exist_ok=True)

reservoirs_by_filenames = list(pathlib.Path(DIR_EO).glob('*.csv'))

def get_data(filename):
    df = pd.read_csv(filename)

    df = df.rename(columns={
        'water_area_time': 'time'
    })

    df['time_ms'] = df.time
    df.time = pd.to_datetime(df.time, unit='ms')
    df = df.set_index('time')

    df = df[df.water_area_filled_fraction < 0.3]
    df = df[df.quality_score < 0.3]
    df = df[df.water_area_p < 0.99]

    return df

def remove_large_gradients(df, th):
    df['water_area_filled_grad'] = df.area.diff()
    df = df[pd.notnull(df.water_area_filled_grad)]

    if len(df.water_area_filled_grad.to_numpy()):
        grad_th = np.percentile(
            np.abs(df.water_area_filled_grad.to_numpy()), th)
        df = df[np.abs(df.water_area_filled_grad) < grad_th]

    return df


def clean_data(df_eo, step='MS', skip_missings=True, min_missings_step=12):
    d = df_eo
    d['area'] = d.water_area_filled
    
    d = d[['area']]

    # round to days
    d.index = d.index.round('D')

    # d = remove_large_gradients(d, 90)
    d = remove_large_gradients(d, 99)
    
    d = d.rolling(3, min_periods=3, center=True).apply(lambda x: x.quantile(0.5))
    d = d.resample(step).apply(lambda x: x.mean())
     

    # create mask
    if skip_missings:
        mask = d.copy()
        grp = ((mask.notnull() != mask.shift().notnull()).cumsum())
        grp['ones'] = 1
        mask['area'] = (grp.groupby('area')['ones'].transform(
            'count') < min_missings_step) | d['area'].notnull()

    # smoothen
    if len(d.dropna()) > 1:
        d = d.interpolate(method='pchip')
    
    # d = d.shift(-1)

    # apply missing values mask (>6 months)
    if skip_missings:
        d[mask.area == False] = None

    return d

# export all


start_index = 0

for f in tqdm(list(reservoirs_by_filenames)[start_index:]):
    df = get_data(f)

    if(not df.size):
        print('Empty, ' + str(f) + ' skipping ...')
        pd.DataFrame({'time': [], 'area': []}).to_csv(
            DIR_EO_MONTHLY + str(f.name).split('.')[0] + '.csv')
        continue

    df = clean_data(df)

    df.loc[df.area < 0, 'area'] = 0

    df[['area']].dropna().to_csv(
        DIR_EO_MONTHLY + str(f.name).split('.')[0] + '.csv')

# export small (cleaner csv, only [time, area])

for f in tqdm(reservoirs_by_filenames):
    df = get_data(f)
    df['area'] = df.water_area_filled
    df[['area']].to_csv(DIR_EO_SMALL + f.stem + '.csv',
                        date_format='%Y-%m-%d %H:%M')
