import json
import sys
import os
import time

from tqdm import tqdm
import pandas as pd
import ee
from google.cloud import storage

from eepackages.applications.waterbody_area import computeSurfaceWaterArea

GS_OUTPUT_DIR = "reservoir-time-series-2021-Q3/time_series_area_raw_update"

# Q1...Q2+ (development)
# EXPORT_TIME_START = '2021-03-01'
# EXPORT_TIME_STOP = '2021-08-05'

# Q3
EXPORT_TIME_START = '2021-07-01'
EXPORT_TIME_STOP = '2021-10-01'

# missing_only=True
missing_only=False





# initialize using current user
ee.Initialize()

# initialize using sedrvice account
# service_account = '578920177147-ul189ho0h6f559k074lrodsd7i7b84rc@developer.gserviceaccount.com'
# credentials = ee.ServiceAccountCredentials(service_account, 'privatekey-service.json')
# ee.Initialize(credentials)

# statuses = ee.data.getTaskList()
# print(statuses)
# ee.data.cancelTask('WR6NODRRUHN54C7DNJ5WSGF3')
# sys.exit()


waterOccurrence = (ee.Image("JRC/GSW1_3/GlobalSurfaceWater")
  .select('occurrence')
  .unmask(0)
  .resample('bicubic')
  .divide(100))
  
waterOccurrence = (waterOccurrence.mask(waterOccurrence))
waterbodies = ee.FeatureCollection("users/gena/eo-reservoirs/reservoirs-v1-0")

count = waterbodies.size().getInfo()

# Only need this if you're running this code locally.
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = r'../keys/global-water-watch-storage-key.json'

client = storage.Client()
bucket = client.get_bucket('global-water-watch')

def get_time_series(waterbody):
  scale = waterbody.geometry().area().sqrt().divide(200).max(10).getInfo()

  start = EXPORT_TIME_START
  # start_filter = EXPORT_TIME_START
  start_filter = start
  stop = EXPORT_TIME_STOP

  missions = ['L8', 'S2']

  water_area = computeSurfaceWaterArea(waterbody, start_filter, start, stop, scale, waterOccurrence, missions)

  water_area = (water_area
      .filter(
        ee.Filter.And(
          ee.Filter.neq('p', 101),
          ee.Filter.gt('ndwi_threshold', -0.15),
          ee.Filter.lt('ndwi_threshold', 0.5),
          ee.Filter.lt('filled_fraction', 0.6)
        )
      )
      .sort('system:time_start')
      )

  properties = ['MISSION', 'ndwi_threshold', 'quality_score', 'area_filled', 'filled_fraction', 'p', 'system:time_start', 'area']
  properties_new = ["mission", "ndwi_threshold", "quality_score", "water_area_filled", "water_area_filled_fraction", "water_area_p", "water_area_time", "water_area_value"]

  water_area = ee.FeatureCollection(water_area).select(properties, properties_new, False).set('scale', scale)

  return water_area

def update_time_series(waterbody, use_task):
  filename = ee.Number(waterbody.get('fid')).format('%07d').getInfo().zfill(5)
  gs_path = f'{GS_OUTPUT_DIR}/{filename}'

  water_area = get_time_series(waterbody)

  if use_task: # start task
    waterbody_id = waterbody.get('fid').getInfo()

    task = ee.batch.Export.table.toCloudStorage(
      collection=water_area, 
      description=f'reservoir-{waterbody_id:07d}',
      bucket='global-water-watch', 
      fileNamePrefix=gs_path,
      fileFormat='CSV'
    )

    task.start()

    # print(task.status())
    
  else: # write directly to the bucket
    water_area = water_area.getInfo()

    df = pd.DataFrame(list(map(lambda f: f['properties'], water_area['features'])))

    bucket.blob(gs_path).upload_from_string(df.to_csv(index=False), 'text/csv')

count = waterbodies.size().getInfo()

start = 0
offset = 0
t_start = time.time()
retry_count = 0

missing_ids = []

if missing_only:
    missing_ids = pd.read_csv('missing.csv').missing.values

waterbody_ids = waterbodies.aggregate_array('fid').getInfo()
 
while offset < count - 1:
  try:
    progress = tqdm(range(start, count), initial=start)
    for offset in progress:
      waterbody_id = waterbody_ids[offset]

      if missing_only:
          if waterbody_id not in missing_ids:
              progress.set_description(f'Skipping {waterbody_id}')
              continue

          waterbody = ee.Feature(waterbodies.toList(1, offset).get(0))
          assert waterbody_id == ee.Number(waterbody.get('fid')).getInfo()

          progress.set_description(f'Downloading {waterbody_id}')

          update_time_series(waterbody, use_task=True)

          # sys.exit()
      else:
        waterbody = ee.Feature(waterbodies.toList(1, offset).get(0))
        assert waterbody_id == ee.Number(waterbody.get('fid')).getInfo()

        progress.set_description(f'Downloading {waterbody_id}')
    
        update_time_series(waterbody, use_task=False)
    
        t_end = time.time()
        t_elapsed = str(t_end - t_start)

        meta = { 'elapsed': t_elapsed, 'retry_count': retry_count }

        id_str = ee.Number(waterbody_id).format('%07d').getInfo().zfill(5)

        filename = id_str + '.meta.json'
        bucket.blob(f'{GS_OUTPUT_DIR}/{filename}').upload_from_string(json.dumps(meta), 'text/json')

        t_start = time.time()
  except Exception as e:
    retry_count = retry_count + 1
    retry_max = 30

    progress.set_description(f'Retrying {waterbody_id}, {retry_count} of {retry_max}')

    if retry_count > retry_max:
      t_end = time.time()
      t_elapsed = str(t_end - t_start)
      meta = { 'elapsed': t_elapsed, 'retry_count': retry_count }
      filename = ee.Number(waterbody.get('fid')).format('%07d').getInfo().zfill(5) + '.meta.json'
      bucket.blob(f'{GS_OUTPUT_DIR}/{filename}').upload_from_string(json.dumps(meta), 'text/json')

      start = offset + 1
    else:
      start = offset # retry

    print(e)

