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
    <li class="list-group-item d-flex justify-content-between align-items-center" id="${data.id}">
      ${
        data.fields["Nom (from Adresse)"]
          ? data.fields["Nom (from Adresse)"][0]
          : "-"
      }
      <span class="badge text-bg-primary rounded-pill">${
        data.fields.Index || 0
      }</span>
    </li>
  `
    )
    .join("");
}
