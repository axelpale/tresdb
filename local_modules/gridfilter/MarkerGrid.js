const Mapper = require('./Mapper')
const circle = require('./circle')

// Build key strings for cells to help putting them into dictionary.
// Define the structure of the key here.
const stringify = (x, y) => x + ';' + y

const MarkerGrid = function (bounds, gridSize) {
  // Parameters:
  //   bounds is a google.maps.LatLngBoundsLiteral
  //     Is the grid area in geographical coordinates.
  //     Has structure { east, north, south, west }
  //   gridSize is { width, height } in integers.
  //     Only width is used because height seems unstable in GMaps API

  // Store size
  this.width = gridSize.width
  this.height = gridSize.height

  // Ensure correct handling over map edges.
  // For example, usually west < east, except when east goes over
  // the international date line.
  // TODO

  // Grid stabilization. The grid must not filter locations differently
  // when bounds are slightly different which happens when users pan.
  // The grid dimensions must depend on viewport size instead of zoom level
  // to ensure intented visual density regardless of coordinates.
  // Still, grid origin must be fixed on map.
  const eyeGeoSize = (bounds.east - bounds.west) / this.width
  // Let a grid be placed to match world origin.
  // Find the closest grid cross north-west from viewport top-left corner.
  // There will be a margin outside the viewport with max width of an eye.
  const stableWest = Math.floor(bounds.west / eyeGeoSize) * eyeGeoSize
  const stableNorth = Math.ceil(bounds.north / eyeGeoSize) * eyeGeoSize
  const stableEast = Math.ceil(bounds.east / eyeGeoSize) * eyeGeoSize
  const stableSouth = Math.floor(bounds.south / eyeGeoSize) * eyeGeoSize

  // Maps from geo coords to grid coords
  this.lngToWidth = new Mapper(
    stableWest,
    stableEast,
    0,
    gridSize.width
  )
  this.latToHeight = new Mapper(
    stableNorth,
    stableSouth,
    0,
    gridSize.height
  )

  // Maintain an index of filled cells. A map from Key to Marker
  this.cells = {}

  // Maintain a list of added markers.
  // It would be a pain to extract the list from cells object.
  this.addedMarkers = []
}

const proto = MarkerGrid.prototype

module.exports = MarkerGrid

proto.add = function (marker) {
  const self = this
  const lnglat = marker.geom.coordinates // array [lng, lat]

  // Map to grid coords. Floating point.
  const x = this.lngToWidth.map(lnglat[0])
  const y = this.latToHeight.map(lnglat[1])

  // Marker radius, the area the marker reserves.
  const r = 1

  // Find grid index. Use it to test if the grid cell is taken.
  const i = Math.floor(x)
  const j = Math.floor(y)

  // Skip markers outside the boundary.
  // TODO: leave some margin to prevent hysteria in child count
  if (i < 0 || i >= this.width || j < 0 || j >= this.height) {
    return
  }

  // Find cell by key
  const key = stringify(i, j)

  if (this.cells[key]) {
    let parent = this.cells[key]
    // The cell is already taken. Marker is not added.
    // Mark that the occupying marker has a child.
    parent.childCount += 1
    // HACK ensure child mark by setting absurd childLayer.
    // Fix hack by using childCount in client.
    parent.childLayer = 32
  } else {
    // Add the marker.
    this.addedMarkers.push(marker)
    // Init children counting.
    marker.childCount = 0
    // HACK ensure the filtered markers have visible layer.
    // To fix hack, use childCount also in non-filtered queries.
    marker.layer = 0
    marker.childLayer = 0
    // The marker reserves a circular area.
    // Determine circle indices. Attach marker to each index.
    const circleIndices = circle.getIndices(x, y, r)
    circleIndices.forEach(index => {
      const ci = index[0]
      const cj = index[1]
      if (ci >= 0 && ci < self.width && cj >= 0 && cj < self.height) {
        const k = stringify(index[0], index[1])
        self.cells[k] = marker
      }
    })
  }
}

proto.getMarkers = function () {
  // List of filtered markers
  return this.addedMarkers
}

proto.toString = function () {
  let str = ''
  for (let j = 0; j < this.height; j += 1) {
    for (let i = 0; i < this.width; i += 1) {
      const m = this.cells[stringify(i, j)]
      // Output number of stacked markers.
      if (m) {
        // a marker
        str += '' + (m.childCount + 1)
      } else {
        // no marker in this cell
        str += '0'
      }

      // If last in row
      if (i === this.width - 1) {
        str += '\n'
      } else {
        str += ', '
      }
    }
  }
  return str
}
