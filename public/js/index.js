const searchParams = new URLSearchParams(window.location.search);
const progId = searchParams.get("id");

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/.netlify/functions/main", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: progId }),
    });

    const recoData = await response.json();
    console.log(recoData);

    if (recoData.error) {
      throw new Error(recoData.error);
    }

    initMap(recoData);

    const ulElement = document.querySelector("#responseList");
    if (ulElement) {
      ulElement.innerHTML = buildListItems(recoData);
    }
  } catch (error) {
    //
  }
});

function buildListItems(dataArray) {
  return dataArray
    .map(
      (data) => `
      <li class="card mb-4" id="${data.id}">
        <div class="card-img-top_wrapper">
          <img src="${data.fields['Miniature'][0].url}" class="card-img-top" alt="">
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="card-title d-flex justify-content-between align-items-center">
            ${data.fields["Nom du lieu"] ? data.fields["Nom du lieu"][0] : "-"}
            </h5>
            <span class="badge text-bg-primary rounded-pill">${
              data.fields["Catégorie"][0] || 0
            }</span>
          </div>
        </div>
     </li>
  `
    )
    .join("");
}

async function initMap(data) {
  let map;
  const mapCoordinates = {
    lat: 45.136532,
    lng: 0.5639767,
  };
  const zoom = 9;
  const mapId = "8b0247e6d638ccc9";

  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  map = new Map(document.querySelector("#map"), {
    center: mapCoordinates,
    zoom,
    mapId,
  });

  data.forEach((item) => {
    const marker = new AdvancedMarkerElement({
      map,
      position: item.coordinates,
      title: item.fullAdress,
    });

    const itemId = item.id;
    if (itemId) {
      const element = document.querySelector(`#${item.id}`);
      element.addEventListener("click", () => {
        map.setCenter(item.coordinates);
        map.setZoom(14);
      });
    }
  });
}
