import pathlib
from glob import glob
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
from tqdm import tqdm

DIR_DATA = '../data/reservoir-time-series-2021-Q3'

out_dir_monthly_timeseries_by_country = pathlib.Path(f'{DIR_DATA}/time_series_area_by_country/')
out_dir_monthly_timeseries_by_country.mkdir(exist_ok=True)

out_dir_monthly_timeseries_by_basin = pathlib.Path(f'{DIR_DATA}/time_series_area_by_basin/')
out_dir_monthly_timeseries_by_basin.mkdir(exist_ok=True)

dir_monthly_timeseries = f'{DIR_DATA}/time_series_area_monthly/'

reservoirs_and_country_basin = gpd.read_file(f'{DIR_DATA}/../shp/extra/reservoirs-v1.0-and-countries-basins.shp')

reservoirs_and_country_basin.fillna(value=-9999, inplace=True)
reservoirs_and_country_basin = reservoirs_and_country_basin[reservoirs_and_country_basin.basin_id != -9999]

reservoirs_and_country_basin.fid = reservoirs_and_country_basin.fid.astype(int)
reservoirs_and_country_basin.basin_id = reservoirs_and_country_basin.basin_id.astype(int)

def read_time_series(path):
    df = pd.read_csv(path)
    df.index = df.time
    df = df[['area']]

    return df

def merge_time_series(filenames):
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

    return df


def compute_aggreated_timeseries_country(country_code):
    reservoir_ids = reservoirs_and_country_basin[reservoirs_and_country_basin.country_co ==
                                                 country_code].fid.values
    filenames = [f'{str(fid).zfill(7)}.csv' for fid in reservoir_ids]

    df = merge_time_series(filenames)

    df.to_csv(out_dir_monthly_timeseries_by_country / f'{country_code}.csv')

    return df


def compute_aggreated_timeseries_basin(basin_id):
    reservoir_ids = reservoirs_and_country_basin[reservoirs_and_country_basin.basin_id ==
                                                 basin_id].fid.values
    filenames = [f'{str(fid).zfill(7)}.csv' for fid in reservoir_ids]

    df = merge_time_series(filenames)

    df.to_csv(out_dir_monthly_timeseries_by_basin / f'{basin_id}.csv')

    return df


country_codes = reservoirs_and_country_basin.country_co.unique()
for i in tqdm(country_codes):
    compute_aggreated_timeseries_country(i)

basin_ids = reservoirs_and_country_basin.basin_id.unique()
for i in tqdm(basin_ids):
    compute_aggreated_timeseries_basin(i)
