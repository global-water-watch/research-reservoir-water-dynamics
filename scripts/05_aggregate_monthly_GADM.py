from tqdm.notebook import tqdm
import geopandas as gpd
import pandas as pd
from glob import glob
import pathlib
import matplotlib.pyplot as plt
from joblib import Parallel, delayed

DIR_DATA = '../data/reservoir-time-series-2021-Q3'

out_dir_monthly_timeseries_by_gadm2 = pathlib.Path(
    f'{DIR_DATA}/time_series_area_by_gadm2/')
out_dir_monthly_timeseries_by_gadm2.mkdir(exist_ok=True)

dir_monthly_timeseries = f'{DIR_DATA}/time_series_area_monthly/'

reservoirs_and_gadm2 = gpd.read_file(
    f'{DIR_DATA}/../shp/extra/reservoirs-v1.0-and-gadm2.shp')

reservoirs_and_gadm2.fid = reservoirs_and_gadm2.fid.astype(int)

def read_time_series(path):
    df = pd.read_csv(path)
    df.index = df.time
    df = df[['area']]
    
    return df


def compute_aggreated_timeseries(gadm_id, gadm_level, out_dir):
    reservoir_ids = reservoirs_and_gadm2[
        reservoirs_and_gadm2[f'GID_{gadm_level}'] == gadm_id].fid.values
    filenames = [f'{str(fid).zfill(7)}.csv' for fid in reservoir_ids]

    df = None
    for i, f in enumerate(filenames):
        path = pathlib.Path(dir_monthly_timeseries) / f

        if not path.exists():
            print(f'Warning, time series does not exist: {path.name}')
            continue

        df_ = read_time_series(path)
        if df is None:
            df = df_
        else:
            df = df.join(df_, how='outer', rsuffix=f'_{i}')

            df['area'] = df.sum(axis=1)
            df = df[['area']]

    if df is None:
        df = pd.DataFrame({'time': [], 'area': []})
        df = df.set_index('time')
    df.to_csv(out_dir / f'{gadm_id}.csv')


gadm_levels = [0, 1, 2]

for gadm_level in tqdm(gadm_levels):
    out_dir_by_gadm = pathlib.Path(
        f'{DIR_DATA}/time_series_area_by_gadm{gadm_level}/')
    out_dir_by_gadm.mkdir(exist_ok=True)

    reservoirs_and_gadm2[['fid', f'GID_{gadm_level}']].to_csv(
        out_dir_by_gadm / f'reservoirid_gadm{gadm_level}_mapping.csv', index=False)

    gadm2_areas = reservoirs_and_gadm2[f'GID_{gadm_level}'].unique()

    for gadm_id in tqdm(gadm2_areas):
        compute_aggreated_timeseries(gadm_id, gadm_level, out_dir_by_gadm)
