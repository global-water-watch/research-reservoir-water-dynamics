/*
Copyright (c) 2022 Deltares. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.

Author: Gennadii Donchyts (gennadiy.donchyts@gmail.com)
*/ 

var assets = require('users/gena/packages:assets')
var thresholding = require('users/gena/packages:thresholding')

var hand = ee.Image('users/gena/GlobalHAND/30m/hand-1000').resample('bilinear')

/***
 * Derive surface water area dynamics from optical images and fill gaps with water occurrence (JRC)
 */
function computeSurfaceWaterArea(waterbody, start, stop, scale, waterOccurrence, opt_missions, opt_handThreshold) {
  var geom = ee.Feature(waterbody).geometry()
  
  var missions = opt_missions || [
      'L4', 
      'L5', 
      'L7', 
      'L8', 
      'L9',
      'S2'
  ]
  
  var handThreshold = opt_handThreshold || 50
  
  var images = assets.getImages(geom, {
    resample: true,
    filter: ee.Filter.date(start, stop),
    missions: missions,
    scale: scale * 5
  })
  
  images = assets.getMostlyCleanImages(images, geom.buffer(300, scale), {
     scale: scale * 5
  }) .sort('system:time_start')
  
  var water = images.map(function(i) {
    return computeSurfaceWaterArea_SingleImage(i, waterbody, scale, waterOccurrence, handThreshold)
  })
  
  water = water.filter(ee.Filter.neq('area', 0))

  return water
}

/***
 * Compute water mask for a single image.
 */
function computeSurfaceWaterArea_SingleImage(i, waterbody, scale, waterOccurrence, handThreshold) {
  var geom = ee.Feature(waterbody).geometry()
  
  var fillPercentile = 50 
  var ndwiBands = ['green', 'nir'] 

  // maximum allowed water extent
  var waterMaxImage = ee.Image().float().paint(waterbody.buffer(150), 1)
  var maxArea = waterbody.area(scale)

  var t = i.get('system:time_start')

  // mask image, skip some dark pixels (noise)
  i = i
    .updateMask(waterMaxImage)
    .updateMask(i.select('swir').min(i.select('nir')).gt(0.001))
  
  // compute normalized difference water index
  var ndwi = i.normalizedDifference(ndwiBands)

  // compute water mask using Canny-Otsu method
  var th = thresholding.computeThresholdUsingOtsu(ndwi, scale, geom, 0.5, 0.7, -0.2)
  var water = ndwi.gt(th)
  water = water.updateMask(hand.lt(handThreshold))
  
  // compute surface water area
  var area = ee.Image.pixelArea().mask(water)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: scale
    }).get('area')

  // fill missing, estimate water probability as the lowest percentile.
  var waterEdge = ee.Algorithms.CannyEdgeDetector(ndwi, 0.5, 0.7)
  waterEdge = waterEdge.updateMask(hand.lt(handThreshold))
  var imageMask = ndwi.mask()
  imageMask = imageMask.focalMin(ee.Number(scale).multiply(1.5), 'square', 'meters')
  waterEdge = waterEdge.updateMask(imageMask)

  // get water probability around edges
  // P(D|W) = P(D|W) * P(W) / P(D) ~=  P(D|W) * P(W)
  var p = waterOccurrence.mask(waterEdge).reduceRegion({
    reducer: ee.Reducer.percentile([fillPercentile]),
    geometry: geom,
    scale: scale
  }).values().get(0)
  
  p = ee.Algorithms.If(ee.Algorithms.IsEqual(p, null), 101, p)

  // fill water
  var waterFill = waterOccurrence.gt(ee.Image.constant(p))
    .updateMask(water.unmask(0, false).not())
    
  // exclude false-positive, where we're sure in a non-water
  var nonWater = ndwi.lt(-0.15).unmask(0, false)
  waterFill = waterFill.updateMask(nonWater.not())
  
  // compute filled surface water area
  var fill = ee.Image.pixelArea().mask(waterFill)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: scale
    }).get('area')
    
  // compute total surface water area
  var area_filled = ee.Number(area).add(fill)
  
  // copute filled fraction (%)
  var filled_fraction = ee.Number(fill).divide(area_filled)

  // return original image with additional analysis bands and computed properties
  return i
    .addBands(waterFill.rename('water_fill'))
    .addBands(waterEdge.rename('water_edge'))
    .addBands(ndwi.rename('ndwi'))
    .addBands(water.rename('water'))
    .set({ 
      p: p, 
      area: area, 
      area_filled: area_filled, 
      filled_fraction: filled_fraction, 
      'system:time_start': t,
      ndwi_threshold: th,
      waterOccurrenceExpected: waterOccurrence.mask(waterEdge)
    })
}

/***
 * Computes surface water area from JRC monthly water occurrence dataset
 */
function computeSurfaceWaterAreaJRC(waterbody, start, stop, scale) {
  var geom = ee.Feature(waterbody).geometry()
  
  var jrcMonthly = ee.ImageCollection("JRC/GSW1_3/MonthlyHistory")

  var water = jrcMonthly.filterDate(start, stop).map(function(i) {
    var area = ee.Image.pixelArea().mask(i.eq(2)).reduceRegion({
      reducer: ee.Reducer.sum(), 
      geometry: geom, 
      scale: scale
    })

    return i.set({area: area.get('area')})
  })

  return water
}

exports.computeSurfaceWaterArea = computeSurfaceWaterArea
exports.computeSurfaceWaterAreaJRC = computeSurfaceWaterAreaJRC
exports.computeSurfaceWaterArea_SingleImage = computeSurfaceWaterArea_SingleImage
