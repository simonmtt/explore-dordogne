import { config } from "dotenv";
import fetch from "node-fetch";

config();

const AIRTABLE_BASE_URL = "https://api.airtable.com/v0";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_PROG_TABLE_ID = process.env.AIRTABLE_PROG_TABLE_ID;
const AIRTABLE_RECO_TABLE_ID = process.env.AIRTABLE_RECO_TABLE_ID;

export const handler = async (event) => {
  try {
    const { id } = JSON.parse(event.body);

    const progUrl = `${AIRTABLE_BASE_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_PROG_TABLE_ID}/${id}`;
    const progResponse = await fetch(progUrl, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!progResponse.ok) {
      throw new Error(`Failed to fetch data: ${progResponse.statusText}`);
    }

    const progData = await progResponse.json();
    const recommandationIds = progData.fields["Recommandations"];

    // Airtable does not return property if it is empty. Hence we check for existance of variable instead of !length>0
    if (!recommandationIds) {
      throw new Error(
        `Failed to fetch data: Program has no linked recommandations.`
      );
    }

    const recoOutput = await fetchRecommendations(recommandationIds);
    if (!recoOutput.length > 0) {
      throw new Error(`Failed to fetch data. Recommandations are empty.`);
    }

    const recoOuputGeoCoded = await getRecommendationsGeoLoc(recoOutput);
    console.log(recoOuputGeoCoded);

    return {
      statusCode: 200,
      body: JSON.stringify(recoOuputGeoCoded),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function fetchRecommendations(recommandationIds) {
  const recoPromises = recommandationIds.map(async (recoId) => {
    const recoUrl = `${AIRTABLE_BASE_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_RECO_TABLE_ID}/${recoId}`;

    try {
      const recoResponse = await fetch(recoUrl, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      if (recoResponse.ok) {
        return await recoResponse.json();
      } else {
        console.error(
          `Failed to fetch data for recoId ${recoId}: ${recoResponse.statusText}`
        );
        return null;
      }
    } catch (error) {
      console.error(
        `Failed to fetch data for recoId ${recoId}: ${error.message}`
      );
      return null;
    }
  });

  const recoOutput = (await Promise.all(recoPromises)).filter(Boolean); // Filter out null values
  return recoOutput;
}

async function getRecommendationsGeoLoc(data) {
  const mapsKey = "AIzaSyDNRCNw9iqXO0kLf1GKzcKIdKzHcPBWrRo";

  const geoLocPromises = data.map(async (item) => {
    const fields = item.fields;
    const nom = fields["Nom du lieu"][0];
    const adresse = fields["Adresse postale"][0];
    const query = `${nom} ${adresse}`.replace(/ /g, "+");
    console.log(query);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${mapsKey}`;

    try {
      const geoLocResponse = await fetch(url);
      if (geoLocResponse.ok) {
        const geoLocData = await geoLocResponse.json();
        const result = geoLocData.results[0];

        if (!result) {
          console.error(`Failed to fetch geo loc for ${nom} ${adresse}`);
          return null;
        }

        const geo = result.geometry;
        const lat = geo.location.lat;
        const lng = geo.location.lng;
        const fullAddress = result.formatted_address;

        item.coordinates = { lat, lng };
        item.fullAddress = fullAddress;

        return item;
      } else {
        console.error(`Failed to fetch geo loc for ${nom} ${adresse}`);
        return null;
      }
    } catch (error) {
      console.error(
        `Failed to fetch geo loc for ${nom} ${adresse}: ${error.message}`
      );
      return null;
    }
  });

  const geoLocOutput = (await Promise.all(geoLocPromises)).filter(Boolean);
  return geoLocOutput;
}
