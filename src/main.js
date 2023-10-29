import maplibregl from "maplibre-gl"
import * as pmtiles from "pmtiles"

import { setupGeocoder } from "./geocoder"

import "maplibre-gl/dist/maplibre-gl.css"
import "./css/style.css"

let protocol = new pmtiles.Protocol()
maplibregl.addProtocol("pmtiles", protocol.tile)

const mapContainer = document.getElementById("map")

const TOOLTIP_LAYERS = ["parcels"]

let mapData = { hoverId: null, clickId: null, clickFeat: null }

const map = new maplibregl.Map({
  container: mapContainer,
  style: "style.json",
  center: [-83.08193, 42.37004],
  zoom: 11,
  minZoom: 11,
  maxZoom: 18,
  hash: true,
  dragRotate: false,
  attributionControl: true,
})

map.touchZoomRotate.disableRotation()

const isMobile = () => window.innerWidth <= 600

const hoverPopup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
})

const clickPopup = new maplibregl.Popup({
  closeButton: true,
  closeOnClick: true,
})

const popupContent = (features) =>
  features
    .map(
      ({ properties }) => `<p><strong>Address</strong> ${properties.address}</p>
    <p><strong>PIN</strong> ${properties.parcel_num}</p>
    <p><strong>Taxpayer City</strong> ${properties.taxpayer_city}, ${
      properties.taxpayer_state
    }</p>
    <p><strong>Assessed Value</strong> $${properties.assessed_value.toLocaleString()}</p>
    <p><strong>2023 Tax Bill</strong> $${properties.bill.toLocaleString()}</p>
    <p><strong>Estimated Land Value Tax Bill</strong> $${(
      properties.bill + properties.final_change_c
    ).toLocaleString()}</p>
    <p><strong>Estimated Change</strong> ${properties.pct_change.toFixed(
      2
    )}%</p>
    ${
      properties.post_nez_bill_c !== 0
        ? `
        <p><strong>Bill After NEZ Expiration</strong>$${properties.post_nez_bill_c.toLocaleString()}</p>
        <p><strong>Estimated Bill After NEZ Expiration</strong>$${properties.final_lvt_bill_nez_c.toLocaleString()}</p>
        <p>Parcel is in NEZ, owner could pay the lower of land value or NEZ rate</p>
    `
        : ``
    }`
    )
    .join("")

const removePopup = (popup) => {
  map.getCanvas().style.cursor = ""
  popup.remove()
}

const handleFeaturesHover = (features) => {
  if (mapData.hoverId) {
    map.setFeatureState(
      { source: "parcels", sourceLayer: "parcels", id: mapData.hoverId },
      { hover: false }
    )
  }
  if (features.length > 0) {
    map.setFeatureState(
      { source: "parcels", sourceLayer: "parcels", id: features[0].id },
      { hover: true }
    )
    mapData.hoverId = features[0].id
  }
}

const handleFeaturesClick = (features) => {
  if (features.length === 0) {
    map.setFeatureState(
      {
        source: "parcels",
        sourceLayer: "parcels",
        id: mapData.clickId,
      },
      { click: false }
    )
    mapData.clickId = null
    mapData.clickFeat = null
  } else {
    map.setFeatureState(
      {
        source: "parcels",
        sourceLayer: "parcels",
        id: features[0].id,
      },
      { click: true }
    )
    mapData.clickId = features[0].id
    mapData.clickFeat = features[0]
  }
}

clickPopup.on("close", () => handleFeaturesClick([]))

const onMouseMove = (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: TOOLTIP_LAYERS,
  })
  handleFeaturesHover(features)
  if (features.length > 0 && !clickPopup.isOpen()) {
    map.getCanvas().style.cursor = "pointer"
    if (!isMobile()) {
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(`<div class="popup hover">${popupContent(features)}</div>`)
        .addTo(map)
    }
  } else {
    removePopup(hoverPopup)
  }
}

const onMouseOut = () => {
  handleFeaturesHover([])
  removePopup(hoverPopup)
}

const onMapClick = (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: TOOLTIP_LAYERS,
  })
  handleFeaturesHover(features)
  handleFeaturesClick(clickPopup.isOpen() ? [] : features)
  if (features.length > 0) {
    map.getCanvas().style.cursor = "pointer"
    removePopup(hoverPopup)
    clickPopup
      .setLngLat(e.lngLat)
      .setHTML(`<div class="popup click">${popupContent(features)}</div>`)
      .addTo(map)
  }
}

TOOLTIP_LAYERS.forEach((layer) => {
  map.on("mousemove", layer, onMouseMove)
  map.on("mouseout", layer, onMouseOut)
  map.on("click", layer, onMapClick)
})

setupGeocoder(({ lat, lon }) => {
  clickPopup.remove()
  map.flyTo({
    center: [lon, lat],
    zoom: 16,
  })
  map.resize()

  map.once("idle", () => {
    onMapClick({ point: map.project([lon, lat]), lngLat: [lon, lat] })
  })
})
