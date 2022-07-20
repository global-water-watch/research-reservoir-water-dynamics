/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var reservoirs = ee.FeatureCollection("projects/global-water-watch/assets/reservoirs-v1-0");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
Map.setOptions('TERRAIN')

Map.addLayer(reservoirs, {}, 'reservoirs (features)', false)

Map.addLayer(reservoirs.style({
  color: '#1088FC', 
  width: 1, 
  fillColor: '1088FC30'
}), {}, 'reservoirs')