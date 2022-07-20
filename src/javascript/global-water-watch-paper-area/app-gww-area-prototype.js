/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var reservoirsAll = ee.FeatureCollection("users/gena/eo-reservoirs/reservoirs-all"),
    jrc300m = ee.Image("users/gena/JRC_WATER_OCCURRENCE_300m_max_mean"),
    basins = ee.Image("users/gena/HydroBASINS");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var assets = require('users/gena/packages:assets')

// var waterbodies = ee.FeatureCollection('users/gena/eo-reservoirs/waterbodies-reservoirs')
var waterbodies = ee.FeatureCollection('users/gena/eo-reservoirs/reservoirs-v1-0')
// print('waterbodies size', waterbodies.size())

// just points + filenames
// var waterbodiesPoints = ee.FeatureCollection("users/gena/eo-reservoirs/waterbodies-points-reservoirs")
var waterbodiesPoints = ee.FeatureCollection("users/gena/eo-reservoirs/reservoirs-locations-v1-0")
// print('waterbodies points size', waterbodiesPoints.size())

// addLayer(waterbodiesPoints, {}, 'points', false)

var panel = ui.Panel([
  ui.Label('Validation dataset', { fontSize: '16px', 'background-color': 'ffffffcc' }, 'https://gena.users.earthengine.app/view/water-watch-validation'),
], ui.Panel.Layout.flow('vertical'), { 
  position: 'middle-left' ,
  'background-color': '00000000'
})
  
Map.add(panel)

var panel = ui.Panel([
  ui.Label('About Global Water Watch', { fontSize: '16px', 'background-color': 'ffffffcc' }, 'https://globalwater.watch')
], ui.Panel.Layout.flow('vertical'), { 
  position: 'bottom-center' ,
  'background-color': '00000000'
})
  
Map.add(panel)

var layerNameMap = {
  'dams': 'dams',
  'black': 'black',
  'waterbodies (points, data available)': 'reservoirs-points',
  'rivers (Natural Earth)': 'rivers-ne',
  'rivers-large-gte100': 'rivers-large-gte100',
  'rivers-large-gte1': 'rivers-large-gte1',
  'water (OSM)': 'water-osm',
  'water occurrence': 'water-occurrence',
  'catchments (level 9) + DEM': 'catchments-l9',
  'catchments (level 8) + DEM': 'catchments-l8',
  'catchments (level 7) + DEM': 'catchments-l7',
  'catchments (level 6) + DEM': 'catchments-l6',
  'catchments (level 5) + DEM': 'catchments-l5',
  'catchments (level 4) + DEM': 'catchments-l4',
  'catchments (level 3) + DEM': 'catchments-l3',
  'DEM': 'dem',
  'waterbodies (all)': 'waterbodies-all',
  'rivers': 'rivers',
  'rivers (large)': 'rivers-large',
  'reservoirs (all)': 'reservoirs-all',
  'reservoirs': 'reservoirs'
}

// Map.onChangeZoom(function(zoom) {
//   print(zoom, Map.getScale())
// })

function exportMap(image, name) {
  return
  
  Export.map.toCloudStorage({
    image: image, 
    description: name, 
    bucket: 'reservoir-monitor', 
    fileFormat: 'auto', 
    path: 'map-tiles-z12/' + name, 
    writePublicTiles: false, 
    minZoom: 0, 
    maxZoom: 12, 
    skipEmptyTiles: true, 
    mapsApiKey: 'AIzaSyDItV6jEwI7jdCEqLWL4zO-ZzPvKC4193E',
    region: ee.Geometry.Polygon([[180,85],[0,85],[-180,85],[-180,-85],[0,-85],[180,-85],[180,85]], 'EPSG:4326', false)
    // bucketCorsUris: ['https://code.earthengine.google.com', 'https://gena.users.earthengine.app']
  })
}

function addLayer(o, style, name, visibility, opacity, refineWhenZoomed) {
  // Map.addLayer(o, style, name, visibility, opacity)
  exportMap(o.visualize(style), layerNameMap[name])
  // return

  if(['rivers', 'rivers-large', 'black', 'waterbodies-all', 'dams-all', 'dams', 'reservoirs', 'water-osm', 'rivers-ne', 'rivers-large-gte100', 'rivers-large-gte1',
    'reservoirs-all', 'dem', 'water-occurrence', 'reservoirs', 'reservoirs-points', 'catchments-l3', 'catchments-l4', 'rivers-large-gte100'].indexOf(layerNameMap[name]) >= 0) {
    var path = layerNameMap[name]

    var maxZoom = 10
    if(['water-occurrence', 'reservoirs', 'dams', 'rivers-large-gte1', 'rivers-large-gte100'].indexOf(name) >= 0) {
      path = 'map-tiles-z12/' + path
      maxZoom = 12
    } else {
      path = 'map-tiles/' + path
      maxZoom = 10
    }
    
    var layer = ui.Map.CloudStorageLayer({
      bucket: 'reservoir-monitor', 
      path: path, 
      maxZoom: maxZoom, 
      name: name, // + '(cloud)', 
      shown: visibility, 
      opacity: opacity
    })
    Map.layers().add(layer)
    
    if(refineWhenZoomed) {
      var layerRefined = ui.Map.Layer(o, style, name + ' (HR)', false, opacity)
      Map.layers().add(layerRefined)
      
      Map.onChangeZoom(function(zoom) {
        // print(zoom, layer.getShown(), layerRefined.getShown())
        if(zoom == 11 && layer.getShown()) {
          // switch to HR layer
          layer.setShown(false)
          layerRefined.setShown(true)
        }
        if(zoom == 10 && layerRefined.getShown()) {
          // switch to LR layer
          layer.setShown(true)
          layerRefined.setShown(false)
        }
      })      
    }
  } else {
    Map.addLayer(o, style, name, visibility, opacity)
  }
}

/*** 
 * Convet image from degrees to radians
 */
function radians(img) { return img.toFloat().multiply(3.1415927).divide(180); }

/***
 * Computes hillshade
 */
exports.hillshade = function(az, ze, slope, aspect) {
  var azimuth = radians(ee.Image.constant(az));
  var zenith = radians(ee.Image.constant(ze));
  return azimuth.subtract(aspect).cos().multiply(slope.sin()).multiply(zenith.sin())
      .add(zenith.cos().multiply(slope.cos()));
}

/***
 * Styles RGB image using hillshading, mixes RGB and hillshade using HSV<->RGB transform
 */
function hillshadeRGB(image, elevation, weight, height_multiplier, azimuth, zenith, castShadows, proj) {
  weight = weight || 1.5
  height_multiplier = height_multiplier || 5
  azimuth = azimuth || 0
  zenith = zenith || 45

  var hsv = image.visualize().unitScale(0, 255).rgbToHsv();
 
  var z = elevation.multiply(ee.Image.constant(height_multiplier))

  var terrain = ee.Algorithms.Terrain(z)
  var slope = radians(terrain.select(['slope']));

  var aspect = radians(terrain.select(['aspect'])).resample('bicubic');
  var hs = exports.hillshade(azimuth, zenith, slope, aspect).resample('bicubic');

  if(castShadows) {
    var hysteresis = true
    var neighborhoodSize = 100

    var hillShadow = ee.Algorithms.HillShadow(z, azimuth, zenith, neighborhoodSize, hysteresis).float().not()
    
    // opening
    // hillShadow = hillShadow.multiply(hillShadow.focal_min(3).focal_max(6))    
  
    // cleaning
    // hillShadow = hillShadow.focal_mode(3)
  
    // smoothing  
    hillShadow = hillShadow.convolve(ee.Kernel.gaussian(5, 3))
  
    // transparent
    hillShadow = hillShadow.multiply(0.4)
  
    hs = ee.ImageCollection.fromImages([
      hs.rename('shadow'), 
      hillShadow.mask(hillShadow).rename('shadow')
    ]).mosaic()
  }

  var intensity = hs.multiply(ee.Image.constant(weight)).multiply(hsv.select('value'));
  var huesat = hsv.select('hue', 'saturation');

  return ee.Image.cat(huesat, intensity).hsvToRgb();
}

function addDem(customImage, opt_name, opt_weight) {
  // var options = {region: catchments, layer: {visible: false, name: 'DEM'}}
  var options = {layer: {visible: false, name: 'DEM'}, 
      palette: ["d9d9d9","bdbdbd","969696","737373","525252","252525","000000"].reverse(),
  }
  
  if(opt_name) {
    options.layer.name = opt_name
  }

  var STYLE_DEM = '\
    <RasterSymbolizer>\
      <ColorMap  type="intervals" extended="false" >\
        <ColorMapEntry color="#cef2ff" quantity="-200" label="-200m"/>\
        <ColorMapEntry color="#9cd1a4" quantity="0" label="0m"/>\
        <ColorMapEntry color="#7fc089" quantity="50" label="50m" />\
        <ColorMapEntry color="#9cc78d" quantity="100" label="100m" />\
        <ColorMapEntry color="#b8cd95" quantity="250" label="250m" />\
        <ColorMapEntry color="#d0d8aa" quantity="500" label="500m" />\
        <ColorMapEntry color="#e1e5b4" quantity="750" label="750m" />\
        <ColorMapEntry color="#f1ecbf" quantity="1000" label="1000m" />\
        <ColorMapEntry color="#e2d7a2" quantity="1250" label="1250m" />\
        <ColorMapEntry color="#d1ba80" quantity="1500" label="1500m" />\
        <ColorMapEntry color="#d1ba80" quantity="10000" label="10000m" />\
      </ColorMap>\
    </RasterSymbolizer>';

    var dems = ee.ImageCollection.fromImages([
        ee.Image('JAXA/ALOS/AW3D30_V1_1').select('MED').resample('bicubic'),
        //ee.Image('USGS/SRTMGL1_003').float().resample('bicubic'),
        //ee.Image('USGS/NED').float().resample('bicubic'),
        //ee.Image('AHN/AHN2_05M_RUW').float().resample('bicubic'),
        //demAU
    ])
    
    dems = ee.ImageCollection(dems)
    
    var image = dems.map(function(i) {
      var rgb = i.sldStyle(STYLE_DEM);
      
      if(options && options.palette) {
        rgb = i.visualize({min: options.min, max: options.max, palette: options.palette})
      }
      
      if(customImage) {
        rgb = customImage
      }
    
      var azimuth = 315;
      var zenith = 20;
      var weight = 1.1;
      
      if(opt_weight) {
        weight = opt_weight
      }
      
      var heightMultiplier = 35;
      
      if(options.extrusion) {
        heightMultiplier = options.extrusion
      }
      var image = hillshadeRGB(rgb, i, weight, heightMultiplier, azimuth, zenith) 
      
      return image
    }).mosaic()

    // if(region) {
    //   image = image.clip(region)
    // }
    
    // if(mask) {
    //   image = image.updateMask(mask)
    // }
  
    var layer = getLayerOptions(options)  
    addLayer(image.updateMask(land), {}, layer.name, layer.visible, layer.opacity)
}

function addCatchments(level, edgesOnly, visibility, opacity) {
  // Rasterized geometries on PFAF12 
  // Author: rutgerhofste@gmail.com
  var HydroBASINSimage = ee.Image("users/rutgerhofste/PCRGlobWB20V04/support/global_Standard_lev00_30sGDALv01");

  var catchments = HydroBASINSimage.divide(ee.Number(10).pow(ee.Number(12).subtract(level))).floor();
  // catchments = catchments.unmask().focal_mode(625, 'circle', 'meters')
  
  var edges = ee.Algorithms.CannyEdgeDetector(catchments, 0.99, 0)//.focal_max(1).focal_mode(1)
  edges = edges.mask(edges)

  catchments = catchments.randomVisualizer().select([0, 1, 2])
  
  // var palette = ["a6cee3","1f78b4","b2df8a","33a02c","fb9a99","e31a1c","fdbf6f","ff7f00","cab2d6"]
  // catchments = catchments.mod(palette.length).visualize({min: 0, max: palette.length-1, palette: palette})

  if(edgesOnly) {
    addLayer(edges.visualize({ palette: ['ffffff'], forceRgbOutput: true }), {}, 'catchments (edges, level ' + level + ')', visibility, opacity)
  } else {
    
    var name = 'catchments (level ' + level + ')'

    addDem(catchments.blend(edges.visualize({ palette: ['ffffff'], forceRgbOutput: true })), name + ' + DEM', 0.75)

    //Map.addLayer(catchments.blend(edges.visualize({ palette: ['ffffff'], forceRgbOutput: true })).updateMask(land), {}, name, false, 0.5)
  }
}

var land = ee.Image("users/gena/land_polygons_image").mask().focal_min(500, 'circle', 'meters');

var now = ee.Date(Date.now())
var twoMonthAgo = now.advance(-2, 'month')

var s2 = ee.ImageCollection("COPERNICUS/S2"),
    l8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_TOA");
    
var image = l8.filterDate(twoMonthAgo, now).select(['B6', 'B5', 'B3'], ['s', 'n', 'g'])
  .merge(s2.filterDate(twoMonthAgo, now).select(['B12', 'B8', 'B3'], ['s', 'n', 'g']).map(function(i) { return i.divide(10000) }))
  .reduce(ee.Reducer.percentile([25]))

Map.addLayer(image.updateMask(land), {'min': 0.05, 'max': 0.35}, 'composite, two months ago - now', false)

var countries = ee.FeatureCollection('USDOS/LSIB/2013')

/*function addCatchments(level) {
  // Rasterized geometries on PFAF12 
  // Author: rutgerhofste@gmail.com
  var HydroBASINSimage = ee.Image("users/rutgerhofste/PCRGlobWB20V04/support/global_Standard_lev00_30sGDALv01");

  var catchments = HydroBASINSimage.divide(ee.Number(10).pow(ee.Number(12).subtract(level))).floor();
  catchments = catchments.unmask().focal_mode(625, 'circle', 'meters')
  
  var edges = ee.Algorithms.CannyEdgeDetector(catchments, 0.99, 0)//.focal_max(1)
  edges = edges.mask(edges).visualize({ palette: ['ffffff'], opacity: 0.7, forceRgbOutput: true })

  catchments = catchments.randomVisualizer().select([0, 1, 2])

  Map.addLayer(catchments.blend(edges).updateMask(land), {}, 'catchments (level ' + level + ')', false, 0.3)
}
*/

/***
 * Configures layer options
 */
function getLayerOptions(options) {
  var layer = {
    visible: true,
    opacity: 1.0,
    name: '<layer name>'
  }  
  
  if(options && typeof(options.layer) !== 'undefined') {
    layer.visible = typeof(options.layer.visible) !== 'undefined' ? options.layer.visible : layer.visible
    layer.opacity = typeof(options.layer.opacity) !== 'undefined' ? options.layer.opacity : layer.opacity
    layer.name = typeof(options.layer.name) !== 'undefined' ? options.layer.name : layer.name
  }
  
  return layer
}

/***
 * Add rivers (from users/gena/packages:hydro)
 */
// function addRivers(options) {
//   var rivers = ee.FeatureCollection('users/gena/HydroEngine/riv_15s_lev05')
      
//   // if(options && options.maxFA) {
//   //   rivers = rivers.filter(ee.Filter.gt('UP_CELLS', options.maxFA))
//   // }

//   // Map.addLayer(rivers.style({ width: 1, color: 'lightblue' }), {}, 'rivers')

//   // return 
  
//   if(options && options.catchments) {
//     var ids = ee.List(options.catchments.aggregate_array('hybas_id'))

//     rivers = rivers
//       .filter(ee.Filter.inList('hybas_id', ids.map(function(id) { return ee.Number(id).format('%d') }))
//     )
//   }
  
//   if(options && options.maxFA) {
//     rivers = rivers.filter(ee.Filter.gt('UP_CELLS', options.maxFA))
//   }

//   rivers = rivers.map(function(f) { return f.set('UP_CELLS_LOG', ee.Number(f.get('UP_CELLS')).log10())})
  
//   var riversImage = ee.Image().float();
  
//   var scale = Map.getScale() * 8
  
//   if(options && options.scale) {
//     scale = options.scale
//   }
  
//   for(var th=1; th<8; th+=2) {
//     riversImage = riversImage.blend(
//         rivers.filter(ee.Filter.gt('UP_CELLS_LOG', th)).style({ color: '0099CC', width: ee.Number(100).multiply(th).divide(scale) })
//         )
//   }
  
//   if(options && options.large) {
//     // Natural Earth
//     rivers = ee.FeatureCollection('users/gena/ne_10m_rivers_lake_centerlines_scale_rank')
    
//     riversImage = rivers.style({ color: '0099CC', width: 1 }).visualize()
//   }
  
//   if(options && options.region) {
//     riversImage = riversImage.clip(options.region)
//   }
  
//   var layer = getLayerOptions(options)  
  
//   var palette = ['ccffff']
  
//   if(options && options.palette) {
//     palette = options.palette
//   }
  
//     //riversImage = riversImage.visualize({palette:palette})
  
//   var riversLayer = ui.Map.Layer(riversImage, {}, layer.name, layer.visible, layer.opacity)
//   exportMap(riversImage.visualize(), layerNameMap[layer.name])
 
//   // HACK
//   if(options.maxFA) { // large rivers
//     var path = 'rivers-large'
//     var visibility = false
//     var opacity = 1
//   } else { // all rivers
//     var path = 'rivers'
//     var visibility = false
//     var opacity = 0.25
//   }
//   var layer = ui.Map.CloudStorageLayer({
//     bucket: 'reservoir-monitor', 
//     path: 'map-tiles/' + path, 
//     maxZoom: 10, 
//     name: path, // + '(cloud)', 
//     shown: visibility, 
//     opacity: opacity
//   })
//   Map.layers().add(layer)

//   // Map.layers().add(riversLayer)

//   var minZoom = 0
//   var maxZoom = 25

//   if(options) {
//     if(options.minZoom) {
//       minZoom = options.minZoom
//     }
//     if(options.maxZoom) {
//       maxZoom = options.maxZoom
//     }
//   }

//   function upateVisibility(layer, zoom, minZoom, maxZoom) {
//     if(!(options && options.autoToggle)) {
//       return
//     }

//     if(zoom < minZoom || zoom > maxZoom) {
//       if(layer.getShown()) {
//         layer.setShown(false)
//       }
//     } else {
//       if(!layer.getShown()) {
//         layer.setShown(true)
//       }
//     }
//   }

//   Map.onChangeZoom(function(zoom) {
//     // upateVisibility(riversLayer, zoom, minZoom, maxZoom)
//   })
  
//   upateVisibility(riversLayer, Map.getZoom(), minZoom, maxZoom)

//   return riversImage
// }


function addRivers(options) {
  var rivers = ee.FeatureCollection('users/gena/HydroRIVERS_v10')
  
  // print(rivers.first())

  if(options && options.maxFA) {
    rivers = rivers.filter(ee.Filter.gte('DIS_AV_CMS', options.maxFA))
  }

  // rivers = rivers.map(function(f) { return f.set('DIS_AV_CMS_LOG', ee.Number(f.get('DIS_AV_CMS')).log10())})
  
  var riversImage = ee.Image().float();
  
  var scale = Map.getScale() * 8
  
  if(options && options.scale) {
    scale = options.scale
  }
  
  rivers = rivers.map(function(f) {
    return f.set({ style: {
        color: '00bbaa', 
        // color: '8a0303', // Halloween version
        gamma: 1.5,
        // width: ee.Number(f.get('DIS_AV_CMS_LOG')).divide(5)
        width: ee.Number(f.get('DIS_AV_CMS')).divide(100).add(0.3).min(3)
      } 
    })
  })
  
  riversImage = rivers.style({ styleProperty: 'style' })
  
  // for(var th=0; th<10; th+=1) {
  //   var segments = rivers.filter(ee.Filter.gt('DIS_AV_CMS_LOG', th))
  //   print(th, segments.size())
  //   print(ui.Chart.feature.histogram(segments, 'DIS_AV_CMS_LOG', 150))
  //   riversImage = riversImage.blend(segments.style({ color: '0099CC', width: ee.Number(100).multiply(th).divide(scale) }))
        
  // }
  
  if(options && options.large) {
    // Natural Earth
    rivers = ee.FeatureCollection('users/gena/ne_10m_rivers_lake_centerlines_scale_rank')
    
    riversImage = rivers.style({ color: '0099CC', width: 1 }).visualize()
  }
  
  if(options && options.region) {
    riversImage = riversImage.clip(options.region)
  }
  
  var layer = getLayerOptions(options)  
  
  var palette = ['ccffff']
  
  if(options && options.palette) {
    palette = options.palette
  }
  
    //riversImage = riversImage.visualize({palette:palette})
  
  var riversLayer = ui.Map.Layer(riversImage, {}, layer.name, layer.visible, layer.opacity)
  exportMap(riversImage.visualize(), layer.name)
 

  // HACK
  if(options.maxFA) { // large rivers
    var path = 'rivers-large'
    var visibility = false
    var opacity = 1
  } else { // all rivers
    var path = 'rivers'
    var visibility = false
    var opacity = 0.25
  }
  
  
  var layer = ui.Map.CloudStorageLayer({
    bucket: 'reservoir-monitor', 
    path: 'map-tiles/' + path, 
    maxZoom: 10, 
    name: path, // + '(cloud)', 
    shown: visibility, 
    opacity: opacity
  })
  // Map.layers().add(layer)

  Map.layers().add(riversLayer)

  var minZoom = 0
  var maxZoom = 25

  if(options) {
    if(options.minZoom) {
      minZoom = options.minZoom
    }
    if(options.maxZoom) {
      maxZoom = options.maxZoom
    }
  }

  function upateVisibility(layer, zoom, minZoom, maxZoom) {
    if(!(options && options.autoToggle)) {
      return
    }

    if(zoom < minZoom || zoom > maxZoom) {
      if(layer.getShown()) {
        layer.setShown(false)
      }
    } else {
      if(!layer.getShown()) {
        layer.setShown(true)
      }
    }
  }

  Map.onChangeZoom(function(zoom) {
    // upateVisibility(riversLayer, zoom, minZoom, maxZoom)
  })
  
  upateVisibility(riversLayer, Map.getZoom(), minZoom, maxZoom)

  return riversImage
}


 
/***
 * pad(0,3) --> '003'
 */
var pad = function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

/***
 * from https://snazzymaps.com
 */
var MAP_STYLES = {
  Dark: [
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "saturation": 36
            },
            {
                "color": "#000000"
            },
            {
                "lightness": 40
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "color": "#000000"
            },
            {
                "lightness": 16
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 20
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 17
            },
            {
                "weight": 1.2
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "lightness": "32"
            }
        ]
    },
    {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "weight": "2.28"
            },
            {
                "saturation": "-33"
            },
            {
                "lightness": "24"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 20
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "lightness": "0"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "lightness": "69"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 21
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "lightness": "63"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#2d2d2d"
            },
            {
                "lightness": 17
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 29
            },
            {
                "weight": 0.2
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 18
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 16
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 19
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#0f252e"
            },
            {
                "lightness": 17
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "lightness": "-100"
            },
            {
                "gamma": "0.00"
            }
        ]
    }
]
}


Map.setOptions('Dark', MAP_STYLES)
Map.style().set('cursor', 'crosshair')



// -----------------------------------------------------------

//Map.setCenter(18.42, 24.69, 4)
//Map.setCenter(53.89, 3.37, 4)

function showWaterbodyByFid(fid) {
  var waterbody = waterbodies.filter(ee.Filter.eq('fid', ee.Number.parse(fid)))
  Map.centerObject(waterbody)
  
  selectedWaterbody = waterbody.first()

  var waterbodyPoint = ee.Feature(waterbodiesPoints.filter(ee.Filter.eq('fid', ee.Number.parse(fid))).first())
  show(waterbodyPoint, false)
}


var fidBox = ui.Panel({
  widgets: [
    ui.Textbox({ 
      placeholder: '<enter reservoir fid>', 
      onChange: showWaterbodyByFid, 
      style: { width: '200px' } 
    })
  ],
  style: { position: 'bottom-left', padding: 0 }
})
Map.widgets().add(fidBox)



var labelElapsedTime = ui.Label()
var labelName = ui.Label('')


function Logger() {
  this.label = ui.Label('', {
      shown: false,
      backgroundColor: '#00000066',
      color: 'ffffff',
      fontSize: '14px',
      position: 'top-center',
      margin: '2px', 
      padding: '2px'
  })
  Map.widgets().add(this.label)
}

Logger.prototype.info = function(message) {
  this.label.setValue(message)
  this.show()
}

Logger.prototype.hide = function() {
  this.label.style().set({ shown: false })
}

Logger.prototype.show = function() {
  this.label.style().set({ shown: true })
}

var log = new Logger()


log.info('Click on a waterbody to query time series')

// labelName.style().set({
//   'font-size': '75%'
// })

var panelControls = ui.Panel([labelElapsedTime, labelName])
  .setLayout(ui.Panel.Layout.Flow('horizontal'))

var panelCharts = ui.Panel()

var panelMain = ui.Panel([panelControls, panelCharts])

panelMain.style().set({
  'background-color': '#fafafa',
  position: 'bottom-right',
  width: '600px',
  height: '305px',
  // height: '479px',
  margin: '0px 0px 50px 0px',
  shown: false
})

panelControls.style().set({
  'background-color': '#fafafa',
})

panelCharts.style().set({
  'background-color': '#fafafa',
})

Map.widgets().add(panelMain)


function onToggleControlsClick() {
  var shown = !panelMain.style().get('shown')
  
  var name = shown ? 'Hide Chart' : 'Show Chart'

  buttonToggleControls.setLabel(name)

  
  panelMain.style().set({ shown: shown })
}

var buttonToggleControls = ui.Button('Hide Chart', onToggleControlsClick, false, {
  position: 'bottom-right',
  padding: '0px'
})

Map.add(buttonToggleControls)



addDem()

addCatchments(3, false, false, 0.5)
addCatchments(4, false, false, 0.5)
addCatchments(5, false, false, 0.5)
addCatchments(6, false, false, 0.5)
addCatchments(7, false, false, 0.5)
addCatchments(8, false, false, 0.5)
addCatchments(9, false, false, 0.5)

// Map.addLayer(ee.Image(1), {palette: ['000000']}, 'black', false, 0.5)
addLayer(ee.Image(1), {palette: ['000000']}, 'black', true, 0.5)
// exportMap(ee.Image(1).visualize({palette: ['000000'], forceRgbOutput: true}), 'black')


var waterOccurrence = ee.Image("JRC/GSW1_0/GlobalSurfaceWater")
  .select('occurrence')
// var waterOccurrence = jrc300m
  .divide(100)
  .unmask(0)
  .resample('bicubic')

// PuBu[9]
// var palette = ["fff7fb","ece7f2","d0d1e6","a6bddb","74a9cf","3690c0","0570b0","045a8d","023858"]
var palette = ["ffffcc","ffeda0","fed976","feb24c","fd8d3c","fc4e2a","e31a1c","bd0026","800026"].reverse().slice(1)

// var palette = ['ffffb2', 'fecc5c', 'fd8d3c', 'f03b20', 'bd0026'].reverse()

addLayer(waterOccurrence.mask(waterOccurrence.multiply(2).multiply(land)), {min: 0, max: 1, palette: palette}, 'water occurrence', false, 1, true)

var water = ee.FeatureCollection('users/gena/OpenStreetMap/water')
addLayer(water.style({ color: '0080ff', pointSize: 1, width: 1, fillColor: '0080ff33'}), {}, 'water (OSM)', false)

addRivers({ /*minZoom: 0, maxZoom: 6, */maxFA: 0, layer: { name: 'rivers-large-gte1 (zoom in)', opacity: 1, visible: false } })

// addRivers({ minZoom: 7, maxZoom: 25, autoToggle: true, maxFA: 0, layer: { name: 'rivers', opacity: 0.5, visible: true } })

// addRivers({ /*minZoom: 0, maxZoom: 6, */maxFA: 20000, layer: { name: 'rivers (large)', opacity: 0.7, visible: false } })
//addRivers({ minZoom: 0, maxZoom: 6, large: true, layer: { name: 'rivers (large)', opacity: 0.3 } })



var rivers = ee.FeatureCollection('users/gena/ne_10m_rivers_lake_centerlines_scale_rank')
addLayer(rivers.style({color: 'cyan', width: 1}), {}, 'rivers (Natural Earth)', true, 0.5)

// addLayer(ee.Image(), {}, 'rivers-large-gte100', true, 0.5)
addLayer(ee.Image(), {}, 'rivers-large-gte1', true, 0.85)




// load waterbodies
//var waterbodies = ee.FeatureCollection("users/rogersckw9/final-waterbodies/waterbodies")

// load waterbodies simplified based on zoom level
// speedup - 2-5x, size - 1/8

// TODO: EE should provide a way to cache layers or keep pyramidized goemetries out-of-the-box

// TODO: refactor this, introduce pyramidized feature collection class
//var waterbodies = ee.FeatureCollection("users/gena/eo-reservoirs/waterbodies");



// slow
//waterbodies = waterbodies.filterBounds(waterbodiesPoints.geometry())
//Export.table.toAsset(waterbodies)
//Export.table.toDrive(waterbodies)


// var waterbodies8 = ee.FeatureCollection("users/gena/eo-reservoirs/waterbodies-z8")
// var waterbodies5 = ee.FeatureCollection("users/gena/eo-reservoirs/waterbodies-z5")

/*
print(waterbodies.size())
print(waterbodies5.size())
print(waterbodies8.size())
*/

var waterbodiesAll = ee.FeatureCollection("users/gena/HydroLAKES_polys_v10")

var imageAll = waterbodiesAll.style({ color: 'cyan', width: 1 })

var imageReservoirsAll = reservoirsAll.style({ color: 'cyan', width: 1 })

//waterbodies = waterbodiesAll.filterBounds(waterbodiesPoints.geometry())

var image = waterbodies.style({ color: '7FFFD4', width: 1 })
//var image8 = waterbodies8.style({ color: 'cyan', width: 1 })
//var image5 = waterbodies5.style({ color: 'cyan', width: 1 })

// Map.addLayer(image, {}, 'waterbodies (high-res)', false)

var layerAll = ui.Map.Layer(imageAll, {}, 'waterbodies (all)', false, 0.5)
exportMap(imageAll, layerNameMap['waterbodies (all)'])
addLayer(imageAll, {}, 'waterbodies (all)', false, 0.5)

var layerReservoirsAll = ui.Map.Layer(imageReservoirsAll, {}, 'reservoirs (all)', true, 0.5)
exportMap(imageReservoirsAll, layerNameMap['reservoirs (all)'])
addLayer(imageReservoirsAll, {}, 'reservoirs (all)', false, 0.5, true)

// var layer = ui.Map.Layer(image, {}, 'reservoirs', true, 0.7)
// exportMap(image, layerNameMap['reservoirs'])
addLayer(image, {}, 'reservoirs', true, 0.7)

// turn waterbodies on when users zooms in >6 and turn off when zoom is <=6
// Map.onChangeZoom(function(zoom) {
//   if(zoom >= 6) {
//     if(!layer.getShown()) {
//       layer.setShown(true)
//     }
//   } else {
//     if(layer.getShown()) {
//       layer.setShown(false)
//     }
//   }
// })


addLayer(waterbodiesPoints.style({pointSize: 1, width: 1, color: '00000022', fillColor: '7FFFD4'}), {}, 'waterbodies (points, data available)', false)

var currentImage = image
function getImageByZoom(zoom) {
  if(zoom <= 5) {
    return image5
  }
  
  if(zoom > 5 && zoom <= 8) {
    return image8
  }
  
  return imagen
}
  
var zoomCurrent = 10

/*Map.onChangeZoom(function(zoom) {
  var i = getImageByZoom(zoom)
  
  if(i !== currentImage) {
    layer.setEeObject(i)
    currentImage = i
  }
})
*/

var waterbodiesPointsList = waterbodiesPoints.toList(10000)

/*
// show all dams
var damInfo = [
  { name: 'OpenStreetMaps (points)', table: 'ft:1Daksuvel4ZUAfZsxuAUV_qv5Y2nnD_XEpbrJFDSB', color: 'blue'}, 
  { name: 'OpenStreetMaps (lines)', table: 'ft:1sFKaX1Cc8OyYYfK5blfSBl_0d_8gxh7HC3UQVAmY', color: 'blue'}, 
  { name: 'AQUATAT', table: 'ft:1JEYbvAwi-hV915oLk4t4mNuhrdNU_kKQX-_HgGdW', color:'teal'}, // errorneous, was used as a main source for GRanD?
  { name: 'GRanD', table: 'ft:1gC7USkuJloeUn7Odw6hXTvodiDZI_XkDJEFk063p', color: 'yellow'},
  { name: 'Wikipedia', table: 'ft:1FJikDoJpylgifMoiMCUcvadyaUX6jgh0Hub6IfX_', color: 'green'},
  { name: 'NWIS (validation)', table: 'ft:10bIIDcBgxWa8yhZ1GrIIKkyc66yXZ0M6lBRjEj6k', color: 'orange'},
  { name: 'King`s College London', table: 'ft:1nq9e5ZyboA83h6U_shzn0eGP6obvvl4UfQEMSgy7', color: 'red'} // check license, seems to be free for research, but not for redistribution?
  ]

function mergeDams() {
  var dams = ee.FeatureCollection([])
  
  damInfo.map(function(i) {
    var features = ee.FeatureCollection(i.table).cache()
      .map(function(f) {
        return f.set({ source: i.name })
      })
    dams = dams.merge(features)
  })
  
  // print('Total: ', dams.size())
  
  return dams
}

var dams = mergeDams()

Export.table.toAsset(dams, 'dams', 'users/gena/dams')
*/


var dams = ee.FeatureCollection('users/gena/eo-reservoirs/dams-all')

addLayer(dams.style({ color: 'ff8000', pointSize: 1, width: 0 }), {}, 'dams', false)

var selection = ee.FeatureCollection([])
var selectionLayer = ui.Map.Layer(selection.style({ color: 'yellow', fillColor: 'ffff0005'}), {}, 'waterbody (selection)', false)

// var selection = ee.Feature(null)
// var selectionLayer = ui.Map.Layer(selection, { color: 'yellow' }, 'waterbody (selection)')

var selectedWaterbody = null
var selectedImageLayer = ui.Map.Layer(ee.Image(), { min: 0.05, max: 0.5 }, 'selected image', false)
Map.layers().add(selectedImageLayer)
 	
Map.layers().add(selectionLayer)

var showing = false


// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray(strData, strDelimiter){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );


    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;


    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){

        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[ 1 ];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){

            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push( [] );

        }

        var strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[ 2 ]){

            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );

        } else {

            // We found a non-quoted value.
            strMatchedValue = arrMatches[ 3 ];

        }


        // Now that we have our value string, let's add
        // it to the data array.
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }
    
    arrData = arrData.slice(0, arrData.length-1) // last element is empty

    // Return the parsed data.
    return( arrData );
}

function show(waterbodyPoint, skipCenterWaterbody) {
  if(showing) {
    return
  }
  
  showing = true

  // Map.addLayer(waterbodyPoint, { color: 'red'})

  // get filename 
  // var filename = waterbodyPoint.get('filename')
  var fid = waterbodyPoint.get('fid')
  
  log.info('Loading chart data ...')
  fid.evaluate(function(fid) {

    ui.url.set('fid', fid)
      
    // var useGeoJSON = true
    var useGeoJSON = false
    
      // GeoJSON
    if(useGeoJSON) {
      var filename = pad(fid, 7) + '.geojson'
  
      // var timeSeries = ee.Blob('gs://hydro-engine-waterbodies/time-series/' + filename)
      var timeSeries = ee.Blob('gs://global-water-watch/wps-reservoir-time-series-latest/time_series_area_raw/' + filename)
      
      timeSeries.string().evaluate(function (s) {
        if(!s) {
          panelCharts.clear()
          panelCharts.add(ui.Label('No data (yet) ...'))
          
          showing = false
        }
        
        var json = JSON.parse(s)
        
        var coords = json.features[0].geometry.coordinates
        
        var axis = 0
        
        var values = json.features[0].properties.water_area_filled
        values = values.map(function(v) { return v / 1000000 })
        var chart1 = ui.Chart.array.values(values, axis, json.features[0].properties.water_area_time)
          .setOptions({
            title: 'Area(t), km^2', 
            pointSize: 1, 
            lineWidth: 0.25, 
            legend: { 
              position: 'none' 
            },
            backgroundColor: '#fafafa',
            chartArea: { 
              backgroundColor: '#fafafa' 
            }
        })
        
    
        var values = json.features[0].properties.water_area_value_jrc
        values = values.map(function(v) { return v / 1000000 })
        var chart2 = ui.Chart.array.values(values, axis, json.features[0].properties.water_area_time_jrc)
          .setOptions({title: 'Area(t), JRC, km^2', pointSize: 1, lineWidth: 0.25})
    
        panelCharts.clear()
        panelCharts.add(chart1)
        // panelCharts.add(chart2)
  
        var feature = ee.Feature(json.features[0])
      
        if(!skipCenterWaterbody) {
          // slow?
          // Map.centerObject(waterbodies.filterBounds(feature.geometry()))
    
          // estimate zoom level from scale
          var scale = json.features[0].properties.scale
          var zoom = Math.ceil(Math.log(156543 / scale) / Math.log(2))
          
          Map.centerObject(feature, zoom)
        }
    
        var filtered = waterbodies.filterBounds(feature.geometry())
        // var filtered = waterbodiesAll.filterBounds(feature.geometry())
        var waterbody = ee.Feature(filtered.first())
    
        // print(dams.filterBounds(waterbody.geometry()))
        
        var name = ee.String(waterbody.get('name'))
        name = ee.Algorithms.If(ee.Algorithms.IsEqual(name, null), ee.String(''), name)
  
        var name_en = ee.String(waterbody.get('name_en'))
        name_en = ee.Algorithms.If(ee.Algorithms.IsEqual(name_en, null), ee.String(''), name_en)
        
        // name = ee.Algorithms.If(name.length().lte(3), '<unknown>', name)
  
        name = ee.String(name).cat(', ').cat(name_en)
      
  
        // var name = ee.String(ee.List(dams.filterBounds(waterbody.geometry()).aggregate_array('name')).iterate(function(c, p) {
        //   return ee.String(p).cat(ee.String(c)).cat(' ')
        // }, ''))
        
        // var name2 = ee.String(ee.List(dams.filterBounds(waterbody.geometry()).aggregate_array('ALT_NAME')).iterate(function(c, p) {
        //   return ee.String(p).cat(ee.String(c))
        // }, ''))
        
        // name = name.cat(' ').cat(name2).replace('None', '')
        
      
        // // add country name
        var countryName = ee.Feature(countries.filterBounds(waterbodyPoint.geometry()).first()).get('name')
        
        name = ee.String(name).cat(' ').cat(countryName)
    
        log.info('Searching for waterbody name ...')
        name.evaluate(function(name) {
          log.hide() // done
          labelName.setValue(name + ', file: ' + filename)
        })
      
        // ee.String(waterbody.get('Lake_name')).evaluate(function(name) {
        //   labelName.setValue(name)
        // })
    
    
        var s = Map.getScale() * 5
        //selection = ee.FeatureCollection(filtered.geometry(s).buffer(150, s)).style({ color: 'yellow', fillColor: 'ffff0011'})
        selection = filtered.style({ color: 'yellow', fillColor: 'ffff0011'})
        
        selectionLayer.setEeObject(selection)
        
        if(!selectionLayer.getShown()) {
          selectionLayer.setShown(true)
        }
        
        showing = false
      })
    } else {  
  
      var filename = pad(fid, 7) + '.csv'
      
      // var timeSeries = ee.Blob('gs://global-water-watch/reservoir-time-series-2021-Q3/time_series_area/' + filename)
      // var timeSeriesMonthly = ee.Blob('gs://global-water-watch/reservoir-time-series-2021-Q3/time_series_area_monthly/' + filename)
      var timeSeries = ee.Blob('gs://global-water-watch/reservoir-time-series-2022-Q2/time_series_area/' + filename)
      var timeSeriesMonthly = ee.Blob('gs://global-water-watch/reservoir-time-series-2022-Q2/time_series_area_monthly/' + filename)
  
      log.info('Querying daily data ...')
      timeSeries.string().evaluate(function (sDaily) {
        log.info('Querying monthly data ...')
        timeSeriesMonthly.string().evaluate(function (sMonthly) {
          if(!sMonthly) {
            panelCharts.clear()
            panelCharts.add(ui.Label('No data (yet) ...'))
            
            showing = false
          }
  
          var chart1 = createChart(sMonthly, sDaily)
        
          panelCharts.clear()
          panelCharts.add(chart1)
          
          var filtered = waterbodies.filterBounds(waterbodyPoint.geometry())
          
          var waterbody = ee.Feature(filtered.first())
      
          var name = ee.String(waterbody.get('name'))
          name = ee.Algorithms.If(ee.Algorithms.IsEqual(name, null), ee.String(''), name)
    
          var name_en = ee.String(waterbody.get('name_en'))
          name_en = ee.Algorithms.If(ee.Algorithms.IsEqual(name_en, null), ee.String(''), name_en)
          
          name = ee.String(name).cat(', ').cat(name_en)
        
          // add country name
          var countryName = ee.Feature(countries.filterBounds(waterbodyPoint.geometry()).first()).get('name')
          
          name = ee.String(name).cat(' ').cat(countryName)
      
          log.info('Searching for waterbody name ...')
          name.evaluate(function(name) {
            log.hide()
            labelName.setValue(name + ', file: ' + filename)
          })
        
          var s = Map.getScale() * 5
          selection = filtered.style({ color: 'yellow', fillColor: 'ffff0011'})
          
          selectionLayer.setEeObject(selection)
          
          if(!selectionLayer.getShown()) {
            selectionLayer.setShown(true)
          }
          
          panelMain.style().set({ shown: true })
          
          showing = false
        })
      })
    }
  })
}  

// monthly and daily data
function createChart(sMonthly, sDaily) {
  var table = 
  {
    cols: [
      {id: 't', type: 'date', role: 'domain'},
      {id: 'area', type: 'number', role: 'data'},
      {id: 'area_raw', type: 'number', role: 'data'}
    ],
    rows: []
  }

  var dataDaily = CSVToArray(sDaily).slice(1)
  var rowsDaily = dataDaily.map(function(o) {
    return { c: [{v: new Date(Date.parse(o[0]))}, { v: null }, {v: parseFloat(o[1]) / 1000000 }] }
  })

  var dataMonthly = CSVToArray(sMonthly).slice(1)
  var rowsMonthly = dataMonthly.map(function(o) {
    return { c: [{v: new Date(Date.parse(o[0]))}, {v: parseFloat(o[1]) / 1000000 }, { v: null }] }
  })

  table.rows = rowsDaily.concat(rowsMonthly)
  
  var chart = ui.Chart(table)
    .setOptions({
      chartArea: {width: '80%', height: '80%'},
      width: '700px', height: '240px',
      vAxis: { viewWindow: { min: 0 } },
      series: {
        0: { title: 'fit', lineWidth: 1, pointSize: 0, color: 'blue'},
        1: { title: 'raw', lineWidth: 0, pointSize: 1, color: 'red', dataOpacity: 0.3 }
      }
    })
    
  chart.setSeriesNames(['fit', 'raw'])
  
  chart.onClick(function(t) {
    if(selectedWaterbody == null) {
      return
    }
    
    if(t == null) {
      return
    }
    
    log.info('Adding image for selected date ...')
    
    var t0 = ee.Date(t).advance(1, 'hour') // BUG: time zone not UTC
    var t1 = t0.advance(10, 'day')
    
    var images = assets.getImages(selectedWaterbody.geometry(), {
      missions: ['L4', 'L5', 'L7', 'L8', 'S2'],
      filter: ee.Filter.date(t0, t1),
      resample: true
    })
    
    var image = images.sort('system:time_start').limit(3).mosaic()
    
    selectedImageLayer.setEeObject(image.clip(selectedWaterbody.geometry().buffer(selectedWaterbody.geometry().area().sqrt())))
    selectedImageLayer.setShown(true)
    
    log.hide()
  })
  
  return chart
}

// // a single series-only
// function createChart(s) {
//   var data = CSVToArray(s).slice(1)
//   data = data.slice(0, data.length-1) // bug
  
//   var times = data.map(function(o) {
//     return Date.parse(o[0])
//   })
  
//   var values = data.map(function(o) {
//     return parseFloat(o[1])
//   })
  
//   var axis = 0
  
//   values = values.map(function(v) { return v / 1000000 })
  
//   var chart = ui.Chart.array.values(values, axis, times)
//     .setOptions({
//       title: 'Area(t), km^2', 
//       pointSize: 1, 
//       lineWidth: 0.25, 
//       legend: { 
//         position: 'none' 
//       },
//       backgroundColor: '#fafafa',
//       chartArea: { 
//         backgroundColor: '#fafafa' 
//       }
//   })
  
//   return chart
// }

var catchmentSelectedLayer = ui.Map.Layer(ee.Image(), {}, 'selected catchment', true, 0.75)

function selectCatchment(pt) {
  var currentLevel = -1
  var currentLevelShown = 9

  var layers = Map.layers()
  for(var i=layers.length()-1; i>=0; i--) {
    var l = layers.get(i)
    
    if(l.getName().indexOf('catchments ') == 0) {
      if(l.getShown()) {
        currentLevelShown = currentLevelShown
        currentLevel = currentLevelShown
        break
      } else {
        currentLevelShown--
      }
    }
  }
  
  if(currentLevel == -1) {
    // nothing to select
    catchmentSelectedLayer.setEeObject(ee.Image())
    return
  }
  
  var pfaf = basins.select('PFAF_' + currentLevel)

  var id = pfaf.reduceRegion({
    reducer: ee.Reducer.first(), 
    geometry: pt, 
    scale: Map.getScale()
  }).values().get(0)
  
  id.evaluate(function(id) {
    if(id) {
      var catchmentMask = pfaf.eq(ee.Number(id))
      
      catchmentSelectedLayer.setEeObject(catchmentMask.updateMask(catchmentMask.not()).visualize({ palette: ['000000']}))
    } else {
      catchmentSelectedLayer.setEeObject(ee.Image())
    }
  })
}


function showTimeseriesByCoords(coords) {
  if(showing) {
    return
  }
  
  log.info('Loading chart data for selected waterbody ...')
  
  coords = ee.Dictionary(coords)
  var lon = coords.get('lon')
  var lat = coords.get('lat')
  
  var pt = ee.Geometry.Point([lon, lat])
  
  var waterbodiesClicked = waterbodies.filterBounds(pt)
  // var waterbodiesClicked = waterbodiesAll.filterBounds(pt.buffer(Map.getScale() * 10))

  panelCharts.clear()
  log.info('Searching for waterbody data  ...')
  waterbodiesClicked.size().evaluate(function(waterbodiesClickedSize) {
    if(!waterbodiesClickedSize) {
      log.info('Waterbody not found.')

      selectCatchment(pt)
      
      selectedWaterbody = null
      
      return
    }

    // show chart if it's not visible-
    if(!panelMain.style().get('shown')) {
      onToggleControlsClick()
    }

    var s = Map.getScale() 
    var waterbody = ee.Feature(waterbodiesClicked.map(function(f) {
      return f.set({distance: f.geometry().centroid(s).distance(pt, s)})
    }).sort('distance', false).limit(1).first())
    
    waterbody = waterbody.dissolve(s * 5)
    
    selectedWaterbody = waterbody
    
    var waterbodyPoints = waterbodiesPoints.filterBounds(waterbody.geometry())
      .map(function(f) {
        return f.set({distance: f.geometry().distance(pt, Map.getScale() * 5)})
      }).sort('distance', true).limit(1)
  
    log.info('Loading waterbody data ...')
    waterbodyPoints.size().evaluate(function(size) {
      if(!size) {
        // try with a buffer
        var waterbodyPoints2 = waterbodiesPoints.filterBounds(waterbody.geometry().buffer(300, 10)).limit(1)
        waterbodyPoints2.size().evaluate(function(size) {
          if(!size) {
            panelCharts.clear()
            panelCharts.add(ui.Label('No data yet.'))
            labelName.setValue('')
            return
          }
          
          var waterbodyPoint2 = ee.Feature(waterbodyPoints2.first())
          show(waterbodyPoint2, true)
        })
      } else {
        var waterbodyPoint = waterbodyPoints.first()
        
        // var waterbodyPoint = ee.Feature(waterbodyPoints.first())
        show(waterbodyPoint, true)
      }
    })

  })
  
}

Map.onClick(showTimeseriesByCoords)


// custom inspection
// var pt = ee.Geometry.Point([8.12734,47.17081])
// Map.addLayer(pt, { color: 'red' })
// Map.centerObject(pt, 13)


Map.layers().add(catchmentSelectedLayer)



// // mask out country
// var mozambique = countries.filter(ee.Filter.eq('country_na', 'Mozambique'))
// Map.addLayer(ee.Image(0).paint(mozambique, 1).not().selfMask(), { palette: ['000000']}, 'Mozambique', true, 0.5)

// Export.map.toCloudStorage({
//   image: ee.Image(0).paint(mozambique, 1).not().selfMask(), 
//   description: 'mozambique-mask', 
//   bucket: 'reservoir-monitor', 
//   fileFormat: 'auto', 
//   path: 'map-tiles/country-mask-mz', 
//   writePublicTiles: false, 
//   minZoom: 0, 
//   maxZoom: 7, 
//   skipEmptyTiles: true, 
//   mapsApiKey: 'AIzaSyDItV6jEwI7jdCEqLWL4zO-ZzPvKC4193E',
//   region: ee.Geometry.Polygon([[180,85],[0,85],[-180,85],[-180,-85],[0,-85],[180,-85],[180,85]], 'EPSG:4326', false)
//   // bucketCorsUris: ['https://code.earthengine.google.com', 'https://gena.users.earthengine.app']


var water_occurrence = ee.Image("JRC/GSW1_2/GlobalSurfaceWater").select('occurrence').unmask(0).resample('bilinear')
var water_99 = ee.Algorithms.CannyEdgeDetector(water_occurrence.gt(1), 0.1).selfMask()
water_99 = water_99.visualize({ 'palette': ['0000ff'] })

var water_50 = ee.Algorithms.CannyEdgeDetector(water_occurrence.gt(50), 0.1).selfMask()
water_50 = water_50.visualize({ 'palette': ['ffff00'] })

var water_20 = ee.Algorithms.CannyEdgeDetector(water_occurrence.gt(80), 0.1).selfMask()
water_20 = water_20.visualize({ 'palette': ['ff0000'] })


Map.addLayer(water_99, {}, 'water occurrence (1%)', false)
Map.addLayer(water_50, {}, 'water occurrence (50%)', false)
Map.addLayer(water_20, {}, 'water occurrence (80%)', false)


var selectedFid = ui.url.get('fid', -1)

if(selectedFid != -1) {
  showWaterbodyByFid(selectedFid.toString())
} else {
  Map.setCenter(18.4, 23, 3)
}
