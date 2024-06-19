const fetchButton = document.querySelector("#fetchButton");
const responseText = document.querySelector("#responseText");
fetchButton.addEventListener("click", async () => {
  const response = await fetch("../netlify/functions/main.js").then(
    (response) => response.json()
  );

  responseText.innerText = response;
});
