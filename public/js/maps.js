let map;
const mapCoordinates = {
  lat: 45.136532,
  lng: 0.5639767,
};

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.querySelector("#map"), {
    center: mapCoordinates,
    zoom: 9,
  });
}

initMap();
