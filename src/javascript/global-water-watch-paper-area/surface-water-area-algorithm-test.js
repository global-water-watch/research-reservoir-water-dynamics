/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var alos = ee.ImageCollection("JAXA/ALOS/AW3D30/V3_2"),
    reservoirs = ee.FeatureCollection("projects/global-water-watch/assets/reservoirs-v1-0"),
    jrcMonthly = ee.ImageCollection("JRC/GSW1_3/MonthlyHistory"),
    jrc = ee.Image("JRC/GSW1_3/GlobalSurfaceWater"),
    geometry = /* color: #98ff00 */ee.Geometry.Polygon(
        [[[-4.500406992913335, 42.90724500498864],
          [-4.480665934563725, 42.91441145745632],
          [-4.46555973339185, 42.92145137120904],
          [-4.488219035149663, 42.941435313875864],
          [-4.515684855462163, 42.92371402981656],
          [-4.528387797356694, 42.91742866183657],
          [-4.535425913811772, 42.908753801070745],
          [-4.533880961419194, 42.90133519807593],
          [-4.511564982415288, 42.90535895795133]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var thresholding = require('users/gena/packages:thresholding')
var animation = require('users/gena/packages:animation')
var palettes = require('users/gena/packages:palettes')
var waterAlgorithms = require('users/gena/global-water-watch-paper-area:surface-water-area-algorithm.js')

Map.setOptions('HYBRID')

// use user-defined geometry
var geometry = geometry

// use geometry from a reservoir queried by feature id (fid)
// var geometry = reservoirs.filter(ee.Filter.eq('fid', 80607)).geometry()

Map.centerObject(geometry)

// water area using raw images 
var start = '2019-01-01'
var stop = '2023-01-01'
// var scale = 30
var scale = Map.getScale()
var missions = ['L8', 'L9', 'L7', 'S2']

var waterOccurrence = jrc.select('occurrence').divide(100).unmask(0).resample('bilinear')
    .convolve(ee.Kernel.gaussian(45, 30, 'meters'))
    .reduceNeighborhood(ee.Reducer.mean(), ee.Kernel.circle(45, 'meters'))
    .rename('occurrence')

waterOccurrence = waterOccurrence.updateMask(waterOccurrence.unitScale(0, 0.02))  
var waterOccurrenceMin = 0.02
var palette = ["2171b5", "4292c6", "6baed6", "9ecae1", "c6dbef", "deebf7", "f7fbff"]
var waterOccurrenceRGB = ee.Image(1).subtract(waterOccurrence)
    .mask(waterOccurrence.unitScale(waterOccurrenceMin, waterOccurrenceMin + 0.2))
    .visualize({ palette: palette, min: 0, max: 1 })

Map.addLayer(waterOccurrenceRGB, {}, 'water occurrence')
Map.addLayer(reservoirs.style({ color: '00ffff', fillColor: '00ffff10', width: 1}), {}, 'reservoirs')

// clipping elevation errors, sometimes can be innacurate so let's preview / tune here
var handThreshold = 20
var hand = ee.Image('users/gena/GlobalHAND/30m/hand-1000').resample('bilinear')
Map.addLayer(hand.gt(handThreshold).selfMask(), { palette: ['black'] }, 'hand > ' + handThreshold, false, 0.5)

// call the actual algorithm
var waterArea = waterAlgorithms.computeSurfaceWaterArea(geometry, start, stop, scale, waterOccurrence, missions, handThreshold)

// show charts
waterArea = ee.FeatureCollection(waterArea)
  .filter(ee.Filter.and(
        ee.Filter.neq('p', 101),
        ee.Filter.gt('ndwi_threshold', -0.15),
        ee.Filter.lt('ndwi_threshold', 0.5),
        ee.Filter.lt('filled_fraction', 0.3)
  ))

var chart = ui.Chart.feature.byFeature(waterArea.select(['system:time_start', 'area_filled']), 'system:time_start')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'Surface water area (filled)'})
print(chart)

var chart = ui.Chart.feature.groups(waterArea.select(['system:time_start', 'area_filled', 'MISSION']), 'system:time_start', 'area_filled', 'MISSION')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'Surface water area (filled + missions)'})
print(chart)

var chart = ui.Chart.feature.byFeature(waterArea.select(['system:time_start', 'area'/*, 'filled_fraction'*/]), 'system:time_start')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'Surface water area'})
print(chart)

print(ui.Chart.feature.byFeature(waterArea.select(['system:time_start', 'area', 'area_filled'/*, 'filled_fraction'*/]), 'system:time_start')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'Surface water area (detected + filled)' }))
  
print(ui.Chart.feature.byFeature(waterArea.select(['system:time_start', 'p']), 'system:time_start')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'Surface water occurrence (% of reservoir filling)'}))

print(ui.Chart.feature.byFeature(waterArea.select(['system:time_start', 'filled_fraction']), 'system:time_start')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'Surface water area fill fraction'}))

print(ui.Chart.feature.byFeature(waterArea.select(['system:time_start', 'ndwi_threshold']), 'system:time_start')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'NDWI threshold'}))


// animate images
waterArea = waterArea.filterDate('2020-01-01', '2023-01-01')

waterArea = ee.ImageCollection(waterArea)
  .map(function(i) {
    var visual = i.visualize({bands: ['swir', 'nir', 'green'], min: 0.05, max: 0.5})
    var water = ee.Image(1).mask(i.select('water')).visualize({ palette: ['3182bd'], opacity: 0.4})
    var fill = ee.Image(1).mask(i.select('water_fill')).visualize({palette:['ffff00'], opacity: 0.5})
    var waterEdge = ee.Image(1).mask(i.select('water_edge')).visualize({ palette:['00ffff'] })
    
    var jrcWater = jrcMonthly.filterDate(i.date(), i.date().advance(1, 'month')).map(function(i) { 
      var w = i.eq(2)
      var waterEdge2 = ee.Algorithms.CannyEdgeDetector(w, 0.5, 0)

      return waterEdge2.mask(waterEdge2)
    }).mosaic().visualize({palette:['ff00ff']})
    
    //var cloud = i.select('bad').visualize({min: 0, max: 1, palette: ['ff0000'], opacity: 0.4})
    
    return ee.ImageCollection.fromImages([
      visual,
      fill,
      //jrcWater,
      //cloud.updateMask(i.select('bad')),
      water,
      waterEdge.updateMask(waterEdge) 
      ]).mosaic()
      .set({label: i.date().format()})
  })

animation.animate(waterArea, { maxFrames: 150, label: 'label' })

// compute surface water area time series using JRC monthly water occurrence 
var waterAreaJRC = waterAlgorithms.computeSurfaceWaterAreaJRC(geometry, start, stop, scale)
print(ui.Chart.feature.byFeature(ee.FeatureCollection(waterAreaJRC).select(['system:time_start', 'area']), 'system:time_start')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, title: 'Surface water area (JRC)'}))
