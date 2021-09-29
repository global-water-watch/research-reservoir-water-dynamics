Scripts and notebooks used to update reservoir water dynamics dataset.

For now, frequency of the updates is QUATERLY. And the processing is triggered manually. This will be migrated to some Cloud-based workflow asap.

* Run scripts/update_water_area_time_series.py to update all time series (currently runs directly, but can fail for larger reservoirs due to OOM)
* Run scripts/get_missing_ids.py to generate id for time sereis which did not export directly and need to be exported as tasks
* Run scripts/update_water_area_time_series.py (set missing_only=True) to update all missing time series

* Generate merged dataset once the update (previous steps) is completed

* 01-daily-to-monthly.ipynb
* 02-monthly-to-aggregated-COUNTRY-BASIN.ipynb
* 03-monthly-to-aggregated-GADM.ipynb
* 04-generate-variances.ipynb

## Notes and TODO

* During updates, some of the reservoirs (~200 out of 70000) have zero time steps, probably due to missing images. A better monitoring is needed for them, to ensure the whole time series is updated during next revisit.

* The first version of the script (update-reservoir-water-area-time-series.py) fetches time series from EE using sync requests, this results in some OOM issues for a fraction of reservoirs (1%). This does not happen when using tasks so we need to migrate to tasks when in production, or improve the algorithm.

* Probably give-up csv and use parquet instead (but csv is still used in EE app)

