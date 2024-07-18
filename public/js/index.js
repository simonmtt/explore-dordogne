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
    console.log(recoData)

    if (recoData.error) {
      throw new Error(recoData.error);
    }

    initMap(recoData.recommendations);

    const ulElement = document.querySelector("#responseList");
    if (ulElement) {
      ulElement.innerHTML = buildListItems(recoData);

      // activate bootstrap carousels
      recoData.recommendations.forEach((item) => {
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

function buildListItems(data) {
  const { recommendations } = data;
  const listItemsString = recommendations
    .map((item, i) => {
      return `
      <li class="card mb-4 focus-ring" id="${item.id}">
           ${buildCarousel(item)}          
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">
            ${
              item.fields["Nom du lieu"]
                ? `${i + 1} - ${item.fields["Nom du lieu"][0]}`
                : "-"
            }
            </h5>
            <span class="badge ${
              item.tagColor ? "" : "text-bg-primary"
            } rounded-pill" ${
        item.tagColor ? `style="background-color: ${item.tagColor}"` : ""
      }>${item.fields["Catégorie"][0] || 0}</span>
          </div>
           <p class="card-text">${item.fields["Description"][0]}</p>
           ${
             item.fields["Description personnalisée"]
               ? `<p class="card-text fw-medium mt-4 mb-1">A word from us, to you:</p>
             <p class="card-text fw-light">${item.fields["Description personnalisée"]}</p>`
               : ``
           }
           ${
             item.fields["Lien"]
               ? `<a class="btn btn-secondary" href="${item.fields["Lien"]}" target="_blank">${
                   item.fields["Message du lien"] || "Access"
                 }</a>`
               : ``
           }
        </div>
     </li>
  `;
    })
    .join("");
  const description = `
  <div class="mb-4">
    <blockquote class="blockquote">
      ${data.description}
    </blockquote>
    <figcaption class="blockquote-footer mt-0">
      Explore Dordogne Team
    </figcaption>
  </div>
  `;
  const mobileLine = `<div class="list-group_mobile-line"></div>`;
  return `${description}${listItemsString}${mobileLine}`;
}

async function initMap(data) {
  const mapCoordinates = {
    lat: 44.682658,
    lng: 1.753015,
  };
  const zoom = 8;
  const mapId = "8b0247e6d638ccc9";

  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

  const map = new Map(document.querySelector("#map"), {
    center: mapCoordinates,
    zoom,
    mapId,
  });

  // Attach event listener to the reset zoom button
  const resetZoomElement = document.querySelector(".reset-zoom");
  if (resetZoomElement) {
    resetZoomElement.addEventListener("click", () => {
      resetZoom(map, mapCoordinates, zoom);
    });
  }

  //const infoWindow = new google.maps.InfoWindow();
  let markers = [];
  data.forEach((item, i) => {
    const borderColor = darkenHexColor(item.tagColor, 25) || "#000000";
    const pin = new PinElement({
      background: item.tagColor,
      borderColor,
      glyph: `${i+1}`,
      scale: 1.4,
    });

    const marker = new AdvancedMarkerElement({
      map,
      position: item.coordinates,
      title: item.fullAddress,
      content: pin.element,
      gmpClickable: true,      
    });

    marker.customId = item.id;
    markers.push(marker);

    // Function to handle marker click
    const handleMarkerClick = () => {
      if (marker.customId) {
        const element = document.querySelector(`#${marker.customId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          setMapZoom();
          element.focus();
        } else {
          console.warn(`Element with ID ${marker.customId} not found`);
        }
      }
    };

    marker.addListener("click", handleMarkerClick);

    if (item.id) {
      const element = document.querySelector(`#${item.id}`);
      if (element) {
        element.setAttribute("tabindex", "-1");
        element.addEventListener("click", () => {
          setMapZoom();
          element.focus();
        });
      }
    }

    // Helper function to set zoom level
    const setMapZoom = () => {
      map.setZoom(14);
      map.panTo(item.coordinates);
    };
  });

  // Map event listeners for mobile behavior
  if (window.innerWidth < 768) {
    handleMobileList(map, markers);
  }
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

function handleMobileList(map, markers) {
  let isExpanded = false; // Track whether the list is expanded
  const listGroup = document.querySelector("#responseList"); // Get the list group element

  // Function to update the list's state (expanded/collapsed)
  const updateListState = () => {
    if (isExpanded) {
      // console.log("Expanding list group");
      listGroup.classList.add("expanded");
      listGroup.classList.remove("hidden");
    } else {
      // console.log("Collapsing list group");
      listGroup.classList.remove("expanded");
      //listGroup.scrollTop = 0; // Scroll back to the top when collapsing
    }
  };

  // Function to hide the list due to map interaction
  const hideList = () => {
    // console.log("Hiding list due to map interaction");
    isExpanded = false; // Collapse the list
    listGroup.classList.add("hidden");
    updateListState();
  };

  // Add event listeners for map interactions (drag and click)
  ["drag", "click"].forEach((event) => {
    map.addListener(event, () => {
      // console.log(`Map event triggered: ${event}`);
      hideList(); // Hide the list on map interaction
      listGroup.scrollTop = 0;
    });
  });

  // Used by 2 functions
  const itemOffset = 16;

  // Add click event listener for the list group
  listGroup.addEventListener("click", (event) => {
    // console.log("Click event on list group");
    // console.log(`isExpanded before click: ${isExpanded}`);

    if (
      event.target.closest(".carousel-control-next") ||
      event.target.closest(".carousel-control-prev") ||
      event.target.closest(".carousel-control-next-icon") ||
      event.target.closest(".carousel-control-prev-icon") ||
      event.target.closest(".btn")
    ) {
      // console.log("Clicked on carousel control, ignoring click event.");
      return; // Do nothing if a carousel control was clicked
    }

    if (event.target.closest("li")) {
      const item = event.target.closest("li");
      const itemTop = item.offsetTop - itemOffset; // Get the top position of the clicked item

      // Scroll to the top of the clicked item
      isExpanded = !isExpanded;
      listGroup.scrollTop = itemTop;
      updateListState();
      return;
    }

    if (isExpanded) {
      // If the list is expanded, collapse it without hiding
      // console.log("Collapsing list group without hiding");
      isExpanded = false;
      listGroup.scrollTop = 0;
      updateListState(); // Update the list state
    } else {
      // If the list is hidden, remove hidden and expand it
      listGroup.classList.remove("hidden");
      isExpanded = true; // Expand the list
      // console.log("Removing hidden class from list group");
      updateListState(); // Update the list state
    }
  });

  markers.forEach((marker) => {
    marker.addListener("click", () => {
      listGroup.classList.remove("hidden");
      isExpanded = true;
      updateListState();
      if (marker.customId) {
        const element = document.querySelector(`#${marker.customId}`);
        if (element) {
          const itemTop = element.offsetTop - itemOffset;
          listGroup.scrollTop = itemTop;
          element.focus();
        }
      }
    });
  });
}

function resetZoom(map, coordinates, zoom) {
  map.setCenter(coordinates);
  map.setZoom(zoom);
}
