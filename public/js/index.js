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
            <span class="badge text-bg-primary rounded-pill">${
              data.fields["Catégorie"][0] || 0
            }</span>
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
      if (element) {
        element.setAttribute("tabindex", "-1"); // Make the element focusable
        element.querySelector(".card-body").addEventListener("click", () => {
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
