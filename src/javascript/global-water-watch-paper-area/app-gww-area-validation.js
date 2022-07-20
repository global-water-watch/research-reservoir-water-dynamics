/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var validation = ee.FeatureCollection("projects/global-water-watch/assets/reservoirs-locations-validation-v1-0"),
    reservoirs = ee.FeatureCollection("projects/global-water-watch/assets/reservoirs-v1-0");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var snazzy = require("users/aazuspan/snazzy:styles");
var style = require('users/gena/packages:style') 
var palettes = require('users/gena/packages:palettes')

// style.setMapStyleDark()  
Map.setOptions('SATELLITE')

// Load the Snazzy modulevar snazzy = require("users/aazuspan/snazzy:styles");
snazzy.addStyle("https://snazzymaps.com/style/38/shades-of-grey", "Dark");
    

Map.style().set({ cursor: 'crosshair' })

// Map.addLayer(reservoirs.style({ width: 1, color: '00ffff', fillColor: '00ffff20' }), {}, 'reservoirs', true, 0.6)

var layer = ui.Map.CloudStorageLayer({
  bucket: 'reservoir-monitor', 
  path: 'map-tiles-z12/reservoirs',
  maxZoom: 12,  
  name: 'reservoirs',
  opacity: 0.6
})
Map.layers().add(layer)

print('Number of validation points', validation.size())


// legend and histogram for r2
var palette = palettes.cb.RdYlGn[7]

var size = [100, 3]

var image = ee.Image.pixelLonLat().select(0)
  .clip(ee.Geometry.Rectangle({ coords: [[0, 0], size], geodesic: false }))
  .visualize({ min: 0, max: 100, palette: palette })

var legendLabel = ui.Label('Points on the map show a correlation between in-situ measurements and EO-based data for reservoirs used during validation. The number of reservoirs in the validation database: is 799.')
var legendLabel2 = ui.Label('Zoom-in and click on any reservoir with a point to inspect the validation time series.')
var legendThumb = ui.Thumbnail({ image: image })
legendThumb.style().set({ width: '95%' })

// show histogram of R2
var chart = ui.Chart.feature.histogram(validation, 'r2_fit', 100)
  .setOptions({
    chartArea: { width: '95%' },
    legend: {position: 'none'},
    hAxis: {
      viewWindow: {
        min: 0, 
        max: 1
      }
    }
  })

var panel = ui.Panel([
  legendLabel, 
  legendLabel2,
  chart,
  legendThumb
])
panel.style().set({
  width: '25%',
  position: 'bottom-left'
})
Map.widgets().add(panel)

// show validation points
var hist = style.Feature.linear(validation, 'r2_fit', { palette: palette, pointSize: 4, width: 1, valueMin: 0, valueMax: 1, opacity: 1 })

var histOutline = hist.select(0).mask().focal_max(1).selfMask().visualize({ palette: ['000000'] })

hist = histOutline.blend(hist)

Map.addLayer(hist, {}, 'validation points')

// for inspection
Map.addLayer(validation, {}, 'features', false)

Map.centerObject(validation)

// selection
var layerSelection = ui.Map.Layer(ee.Image(), {}, 'selection')
Map.layers().add(layerSelection)

var panel = ui.Panel([], null, { position: 'bottom-right'})
Map.widgets().add(panel)

var buttonClose = ui.Button('Close')

buttonClose.onClick(function() {
  panel.style().set({ shown: false })
  layerSelection.setEeObject(ee.Image())
})

Map.onClick(function(pt) {
  pt = ee.Geometry.Point([pt.lon, pt.lat])
  
  validation.filterBounds(reservoirs.filterBounds(pt).geometry()).evaluate(function(fc) {
    if(fc.features.length == 0) {
      return
    }
    
    layerSelection.setEeObject(reservoirs.filterBounds(pt).style({ color: 'ffff00', fillColor: 'ffff0020', width: 1 }))

    var imageUrlb64 = 'gs://global-water-watch/insitu-data/' + fc.features[0].properties.filename.replace('.png', '.b64')
    
    ee.Blob(imageUrlb64).string().evaluate(function(b64) {
      var image = ui.Label({ imageUrl: 'data:image/png;base64,' + b64 })
      panel.widgets().reset([image, buttonClose])
      panel.style().set({ shown: true })
    })
  })
})