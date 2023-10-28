const DEBOUNCE_TIME = 350

/* eslint-disable */
// Debounce function from underscore
export const debounce = (func, wait, immediate) => {
  let timeout
  return function () {
    const context = this
    const args = arguments
    const later = () => {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}
/* eslint-enable */

const getAddress = ({ address: { freeformAddress: address } }) => address

const getResults = (query, azureMapsKey) =>
  fetch(
    `https://atlas.microsoft.com/search/fuzzy/json?${new URLSearchParams({
      "api-version": 1.0,
      topLeft: "42.450239,-83.287959",
      btmRight: "42.255192,-82.910439",
      countrySet: "US",
      idxSet: ["Addr", "PAD"].join(","),
      limit: 15,
      typeahead: true,
      "subscription-key": azureMapsKey,
      query,
    })}`
  )
    .then((res) => res.json())
    .then(({ results }) =>
      results
        .filter(
          ({ address: { countrySubdivision: state, municipality } }) =>
            state === "MI" && municipality === "Detroit"
        )
        .map(({ type, position: { lat, lon }, ...result }) => ({
          type,
          lat,
          lon,
          address: getAddress(result),
        }))
    )
    .catch(() => [])

export function setupGeocoder(onSelect) {
  const azureMapsKey = document.head.querySelector(
    `meta[name="azure-maps-key"]`
  ).content
  const combobox = document.getElementById("geocoder")
  const input = document.getElementById("geocoder-search")
  const resultList = document.getElementById("geocoder-results")
  const clearButton = document.getElementById("geocoder-clear")
  let results = []
  let activeIndex = -1

  const openGeocoder = () => {
    resultList.classList.toggle("hidden", false)
    combobox.setAttribute("aria-expanded", "true")
  }

  const closeGeocoder = () => {
    setActiveIndex(-1)
    resultList.classList.toggle("hidden", true)
    combobox.setAttribute("aria-expanded", "false")
  }

  const clearInput = () => {
    input.value = ``
    results = []
    resultList.innerHTML = ``
    input.classList.toggle("has-value", false)
  }

  const updateClearButtonVisibility = () => {
    if (input.classList.contains("has-value") && input.value.trim() === ``) {
      input.classList.toggle("has-value", false)
    } else if (
      !input.classList.contains("has-value") &&
      input.value.trim() !== ``
    ) {
      input.classList.toggle("has-value", true)
    }
  }

  const setActiveIndex = (idx) => {
    const resultVals = resultList.querySelectorAll(`[role="option"]`)
    if (activeIndex > -1 && resultVals.length >= activeIndex - 1) {
      resultVals[activeIndex].removeAttribute("aria-selected")
    }
    if (idx !== -1 && resultVals.length >= idx - 1) {
      resultVals[idx].setAttribute("aria-selected", "true")
    }
    activeIndex = idx
  }

  const selectResult = (index) => {
    input.value = results[index].address
    closeGeocoder()
    onSelect(results[index])
  }

  const updateResults = (text) => {
    getResults(text, azureMapsKey).then((queryResults) => {
      results = queryResults
      resultList.innerHTML = results
        .map(
          ({ address }, idx) =>
            `<li id="result-${idx}" role="option" class="result">${address}</li>`
        )
        .join(``)
      resultList
        .querySelectorAll(`li[role="option"]`)
        .forEach((r, i) => r.addEventListener("click", () => selectResult(i)))
    })
  }

  const debouncedUpdateResults = debounce(updateResults, DEBOUNCE_TIME)

  input.addEventListener("input", (e) => {
    if (e.target.value.trim().length > 1) debouncedUpdateResults(e.target.value)
    updateClearButtonVisibility()
  })

  input.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowRight"].includes(e.code)) {
      if (e.code === "ArrowDown" || activeIndex > -1) e.preventDefault()
      if (activeIndex < results.length - 1) {
        setActiveIndex(activeIndex + 1)
      }
    } else if (["ArrowUp", "ArrowLeft"].includes(e.code)) {
      if (e.code === "ArrowUp" || activeIndex > -1) e.preventDefault()
      if (activeIndex > -1) {
        setActiveIndex(activeIndex - 1)
      }
    } else if (e.code === "Enter") {
      e.preventDefault()
      if (activeIndex > -1) {
        selectResult(activeIndex)
      }
    } else if (e.code === "Space") {
      if (activeIndex > -1) {
        e.preventDefault()
        selectResult(activeIndex)
      }
    }
  })

  input.addEventListener("blur", () => window.setTimeout(closeGeocoder, 100))
  input.addEventListener("focus", openGeocoder)
  input.addEventListener("change", updateClearButtonVisibility)
  clearButton.addEventListener("click", clearInput)
  document.body.addEventListener("click", (e) => {
    if (!combobox.contains(e.target) && !resultList.contains(e.target)) {
      closeGeocoder()
    }
  })
}
