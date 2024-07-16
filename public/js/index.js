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

      // activate bootstrap carousels
      recoData.forEach((item) => {
        const carouselId = `#${item.id}-slider`;
        const carousel = document.querySelector(carouselId);
        if (carousel) {
          new bootstrap.Carousel(carousel);
        }
      });
    }
  } catch (error) {
    //
  }
});

function buildListItems(dataArray) {
  return dataArray
    .map((data) => {
      return `
      <li class="card mb-4 focus-ring" id="${data.id}">
           ${buildCarousel(data)}          
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="card-title d-flex justify-content-between align-items-center">
            ${data.fields["Nom du lieu"] ? data.fields["Nom du lieu"][0] : "-"}
            </h5>
            <span class="badge ${
              data.tagColor ? "" : "text-bg-primary"
            } rounded-pill" ${
        data.tagColor ? `style="background-color: ${data.tagColor}"` : ""
      }>${data.fields["Catégorie"][0] || 0}</span>
          </div>
           <p class="card-text">${data.fields["Description"][0]}</p>
           ${
             data.fields["Description personnalisée"]
               ? `<p class="card-text fw-medium mt-4 mb-1">A word from us, to you:</p>
             <p class="card-text fw-light">${data.fields["Description personnalisée"]}</p>`
               : ``
           }
        </div>
     </li>
  `;
    })
    .join("");
}

async function initMap(data) {
  let map;
  const mapCoordinates = {
    lat: 45.2156806,
    lng: 1.2922841,
  };
  const zoom = 9;
  const mapId = "8b0247e6d638ccc9";

  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const { PinElement } = await google.maps.importLibrary("marker");

  map = new Map(document.querySelector("#map"), {
    center: mapCoordinates,
    zoom,
    mapId,
  });

  data.forEach((item) => {
    const borderColor = darkenHexColor(item.tagColor, 25) || '#000000';
    const pin = new PinElement({
      background: item.tagColor,
      borderColor,
      glyphColor: borderColor
    });
    const marker = new AdvancedMarkerElement({
      map,
      position: item.coordinates,
      title: item.fullAdress,
      content: pin.element,
      gmpClickable: true
    });

    const itemId = item.id;
    if (itemId) {
      const element = document.querySelector(`#${item.id}`);
      if (element) {
        element.setAttribute("tabindex", "-1"); // Make the element focusable
        // element.querySelector(".card-body").addEventListener("click", () => {
        element.addEventListener("click", () => {
          map.panTo(item.coordinates);
          map.setZoom(14);
          element.focus();
        });
      }
    }
  });
}

function buildCarousel(data) {
  const photosAdresse = data.fields["Photos adresse"] || [];
  const photosSupp = data.fields["Photos supplémentaires"] || [];
  const miniature = data.fields["Miniature"]
    ? [data.fields["Miniature"][0]]
    : [];
  const allPhotos = [...miniature, ...photosAdresse, ...photosSupp];
  const carouselId = `${data.id}-slider`;

  const carousel =
    allPhotos.length > 1
      ? `
      <div id="${carouselId}" class="carousel slide">
        <div class="carousel-inner">
          ${allPhotos
            .map((photo, i) => {
              return `
                <div class="carousel-item${i === 0 ? ` active` : ``}">
                  <img src="${photo.url}" class="d-block w-100" alt="">
                </div>`;
            })
            .join("")}
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>`
      : `
      <div class="card-img-top_wrapper">
        <img src="${data.fields["Miniature"][0].url}" class="card-img-top" alt="">
      </div>
      `;

  return carousel;
}

function darkenHexColor(hex, percent) {
  // Ensure the hex color starts with a '#'
  if (hex.charAt(0) === "#") {
    hex = hex.slice(1);
  }

  // Parse the r, g, b values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Calculate the darker color
  r = Math.floor(r * (1 - percent / 100));
  g = Math.floor(g * (1 - percent / 100));
  b = Math.floor(b * (1 - percent / 100));

  // Ensure the values are within the valid range
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Convert the r, g, b values back to hex
  const newHex = `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

  return newHex;
}
