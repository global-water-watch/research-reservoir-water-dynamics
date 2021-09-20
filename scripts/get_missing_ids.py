import pathlib

import pandas as pd

import ee

ee.Initialize()

from google.cloud import storage
from tqdm import tqdm

def list_blobs(bucket_name, prefix):
    """Lists all the blobs in the bucket."""
    # bucket_name = "your-bucket-name"

    storage_client = storage.Client()

    # Note: Client.list_blobs requires at least package version 1.17.0.
    blobs = storage_client.list_blobs(bucket_name, prefix=prefix)

    names = []
    for blob in tqdm(blobs):
        names.append(blob.name)

    return names

names = list_blobs('global-water-watch', 'reservoir-time-series-2021-Q3/time_series_area_raw_update')

names = [name for name in names if '.csv' in name]

ids_downloaded = [pathlib.Path(name).stem for name in names]

# compare waterbodie ids to downloaded files
waterbodies = ee.FeatureCollection("users/gena/eo-reservoirs/reservoirs-v1-0")

count = waterbodies.size().getInfo()

ids = waterbodies.aggregate_array('fid').getInfo()

missing = []

for id in ids:
    filename = f"{str(id).zfill(7)}"
    
    if filename not in ids_downloaded:
        missing.append(id)

pd.DataFrame({ "missing": missing }).to_csv('missing.csv', index=False)