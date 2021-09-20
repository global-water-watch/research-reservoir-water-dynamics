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
