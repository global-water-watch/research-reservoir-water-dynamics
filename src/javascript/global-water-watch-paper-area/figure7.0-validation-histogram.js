/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var validation = ee.FeatureCollection("projects/global-water-watch/assets/reservoirs-locations-validation-v1-0");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
print(validation.first())

var r2_threshold = 0.7

print(ui.Chart.feature.histogram(validation, 'r2_fit', 20))
print('% of reservoirs with r2 > ' + r2_threshold, validation.filter(ee.Filter.gte('r2_fit', r2_threshold)).size().divide(validation.size()))

print('Spain')
var valivation_Spain = validation.filter(ee.Filter.inList('country', ['Spain']))
print(ui.Chart.feature.histogram(valivation_Spain, 'r2_fit', 20))
print('% of reservoirs with r2 > ' + r2_threshold, valivation_Spain.filter(ee.Filter.gte('r2_fit', r2_threshold)).size().divide(valivation_Spain.size()))

print('South Africa')
var valivation_SouthAfrica = validation.filter(ee.Filter.inList('country', ['SouthAfrica']))
print(ui.Chart.feature.histogram(valivation_SouthAfrica, 'r2_fit', 20))
print('% of reservoirs with r2 > ' + r2_threshold, valivation_SouthAfrica.filter(ee.Filter.gte('r2_fit', r2_threshold)).size().divide(valivation_SouthAfrica.size()))

print('India')
var valivation_India = validation.filter(ee.Filter.inList('country', ['India']))
print(ui.Chart.feature.histogram(valivation_India, 'r2_fit', 20))
print('% of reservoirs with r2 > ' + r2_threshold, valivation_India.filter(ee.Filter.gte('r2_fit', r2_threshold)).size().divide(valivation_India.size()))

print('USA')
var valivation_USA = validation.filter(ee.Filter.inList('country', ['USA']))
print(ui.Chart.feature.histogram(valivation_USA, 'r2_fit', 20))
print('% of reservoirs with r2 > ' + r2_threshold, valivation_USA.filter(ee.Filter.gte('r2_fit', r2_threshold)).size().divide(valivation_USA.size()))
