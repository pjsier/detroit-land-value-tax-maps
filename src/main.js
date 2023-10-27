import maplibregl from "maplibre-gl"
import * as pmtiles from "pmtiles"

import "maplibre-gl/dist/maplibre-gl.css"
import "./css/style.css"

let protocol = new pmtiles.Protocol()
maplibregl.addProtocol("pmtiles", protocol.tile)

const mapContainer = document.getElementById("map")

const TOOLTIP_LAYERS = ["parcels"]

const map = new maplibregl.Map({
  container: mapContainer,
  style: "style.json",
  center: [-83.08193, 42.37004],
  zoom: 12,
  minZoom: 12,
  maxZoom: 18,
  hash: true,
  dragRotate: false,
  attributionControl: true,
})

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
    <p><strong>Taxpayer City</strong> ${properties.taxpayer_city}</p>
    <p><strong>Taxpayer State</strong> ${properties.taxpayer_state}</p>
    <p><strong>Property Class</strong> ${properties.property_class_desc}</p>
    <p><strong>Assessed Value</strong> $${properties.assessed_value.toLocaleString()}</p>
    <p><strong>2023 Tax Bill</strong> $${properties.bill.toLocaleString()}</p>
    <p><strong>Estimated Land Value Tax Bill</strong> $${(
      properties.bill + properties.final_change_c
    ).toLocaleString()}</p>
    <p><strong>Estimated Change</strong> ${properties.pct_change.toFixed(
      2
    )}%</p>
    ${
      properties.final_lvt_bill_nez_c > 0
        ? `
    <p>Parcel is in NEZ, owner can pay whichever is lower</p>
    `
        : ``
    }`
    )
    .join("")

const removePopup = (popup) => {
  map.getCanvas().style.cursor = ""
  popup.remove()
}

const onMouseMove = (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: TOOLTIP_LAYERS,
  })
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
  removePopup(hoverPopup)
}

const onMapClick = (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: TOOLTIP_LAYERS,
  })
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
