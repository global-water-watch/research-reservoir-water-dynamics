import ee
from ee_plugin import Map

# from eepackages.applications.waterbody_area import computeSurfaceWaterArea

image = ee.Image('users/gdonchyts/2000_12m_2021_12m_waterchange_tigris_euphratus')

image = image.updateMask(image.select('vis-green').mask().multiply(image.select('vis-blue').gt(5)))

Map.addLayer(image)
