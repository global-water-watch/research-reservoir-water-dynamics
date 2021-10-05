Location of the data: gs://global-water-watch/

This update contains time series of surface water area for 71208 reservoirs globally derived from optical Landsat and Sentinel-2 satellite imagery acquired 
during Jan 1985 ... Mar 2021.

Files:

shp/
    reservoirs-locations-v1.0.cpg ......... reservoir locations and statistics based on area time series (mean, median, sd_intra, sd_inter, rsd_intra, rsd_inter)
    reservoirs-locations-v1.0.dbf           sd_intra, sd_inter are computed for different time series components after seasonal-trend decoposition (STL)
    reservoirs-locations-v1.0.prj           rsd_intra, rsd_inter are computed as relative ratio of changes as rsd_intra = sd_intra / mean, rsd_inter = sd_inter / mean
    reservoirs-locations-v1.0.shp
    reservoirs-locations-v1.0.shx
    reservoirs-v1.0.dbf ................... maximum (buffered) extent geometry of reservoirs used to extract surface water area time series
    reservoirs-v1.0.prj                     reservoir geometry was identified from multiple databases such as OpenStreetMap, HydroLAKES, and many dam dataset
    reservoirs-v1.0.qix
    reservoirs-v1.0.shp
    reservoirs-v1.0.shx


Quaterly:

time_series_area/ ......................... time series of surface water area using original time steps
    *.csv

time_series_area_monthly/ ................. time series of surface water area aggregated to monthly time steps
    *.csv

time_series_area_by_gadm2/
    fid_gadm2_mapping.csv ................. mapping of reservoir fid to GADM GID_2, multiple GADM areas are possible per reservoir
    time_series/ .......................... monthly aggregated (sum) time series of surface water area per GADM level 2
        *.csv

time_series_area_raw/ ..................... raw time series with additional metainformation (satellite mission, quality metrics, etc.)
    *.geojson


Filename conventions for CSV and GeoJSON files:

<fid>.csv | <fid>.geojson, where <fid> is a unique reservoir id present in shapefiles as well.

<GID_2>.csv is used for time series file names aggregated by GADM level 2
