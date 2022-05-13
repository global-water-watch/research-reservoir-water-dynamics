Scripts and notebooks used to update reservoir water dynamics dataset.

For now, frequency of the updates is QUATERLY. And the processing is triggered manually. This will be migrated to some Cloud-based workflow asap.

Go to scripts/ directory and run:

* 01_update_water_area_time_series.py to update all time series (may fail for larger reservoirs due to OOM) - runtime: ~12 days

  * Parameters to change before run:
     * GS_OUTPUT_DIR
     * EXPORT_TIME_START
     * EXPORT_TIME_STOP

* 02_merge_time_series.py to merge prevoius time series and new update runtime: ~1-2 hours
  * Parameters to change before run:
     * OLD_UPDATE_DIR - this is a previous update (full time series) 
     * NEW_UPDATE_DIR - target directory for merged dataset

* 03_daily_to_monthly.py, runtime: ~9 hours
  * Parameters to change before run:
     * DIR_DATA

* 04_aggregate_monthly_COUNTRY_BASIN.py, runtime: ~XXX hours
  * Parameters to change before run:
     * DIR_DATA

* 05_aggregate_monthly_GADM.py, runtime: ~XXX hours
  * Parameters to change before run:
     * DIR_DATA

Move the output directory to gs://global-water-watch/

## Time to run processing

The runtime is measured given the current set of optical Landsat and Sentinel satellite images available in Google Earth Engine (as of Sep 2021) and running processing for three months and ~72 000 reservoirs globally. Post-processing tasks (02-05) are measured on a laptop with an i7 9750H CPU.

| Step                                  | Runtime        |
|---------------------------------------|----------------|
| 01_update_water_area_time_series.py   | 12 days        |
| 02_merge_time_series.py               | 1.5 hours      |
| 03_daily_to_monthly.py, runtime       | 14 hours       |
| 04_aggregate_monthly_COUNTRY_BASIN.py | a few minutes  |
| 05_aggregate_monthly_GADM.py          | a few minutes  |

## Notes

* During updates, some of the reservoirs (~200 out of 70000) have zero time steps, probably due to missing images. A better monitoring is needed for them, to ensure the whole time series is updated during next revisit.

* The first version of the script (update-reservoir-water-area-time-series.py) fetches time series from EE using sync requests, this results in some OOM issues for a fraction of reservoirs (1%). This does not happen when using tasks so we need to migrate to tasks when in production, or improve the algorithm.

* Probably give-up csv and use parquet instead (but csv is still used in the EE app)

## Next release

* Extend this readme to end September to include:
     * Note on the (semi-)automated updates
     * Short presentation of the products
     * Sentinel-1