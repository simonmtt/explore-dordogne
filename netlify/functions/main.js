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

    if (!recommandationIds) {
      throw new Error(
        `Failed to fetch data: Program has no linked recommendations.`
      );
    }

    const recoOutput = await fetchRecommendations(recommandationIds);
    if (!recoOutput.length) {
      throw new Error(`Failed to fetch data. Recommendations are empty.`);
    }

    const enrichedData = await enrichData(recoOutput);
    const result = {
      description: progData.fields["Description"],      
      recommendations: enrichedData,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error(`Error in handler: ${error.message}`);
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

async function getRecommendationsTagsColor(recommendations) {
  try {
    const url = `${AIRTABLE_BASE_URL}/meta/bases/${AIRTABLE_BASE_ID}/tables`;
    const baseSchemaResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!baseSchemaResponse.ok) {
      console.error(`Failed to access base schema`);
      return recommendations;
    }

    const baseSchemaData = await baseSchemaResponse.json();

    if (!baseSchemaData) {
      console.error(`Failed to access base schema (json step)`);
      return recommendations;
    }

    const tables = baseSchemaData.tables;

    if (!tables || tables.length === 0) {
      console.error(`Failed to access base schema (no tables)`);
      return recommendations;
    }

    const fields = tables.filter((table) => table.name === "Adresses")[0]
      .fields;
    const categories = fields.filter((field) => field.name === "Catégorie")[0]
      .options.choices;

    const defaultColor = airtableColors.filter(
      (color) => color.name === "darken3"
    )[0].value;

    recommendations.forEach((reco) => {
      const fields = reco.fields;
      if (fields) {
        const recoCategory = fields["Catégorie"][0];
        const recoCatObj = categories.filter(
          (cat) => cat.name === recoCategory
        )[0];
        if (recoCatObj) {
          const airtableColor = recoCatObj.color;
          const tagColor = airtableColors.filter(
            (color) => color.name === airtableColor
          )[0];
          reco.tagColor = tagColor ? tagColor.value : defaultColor;
        } else {
          reco.tagColor = defaultColor;
        }
      }
    });

    return recommendations;
  } catch (error) {
    console.error(`Error in getTagColors: ${error.message}`);
    return recommendations;
  }
}

async function enrichData(data) {
  data = await getRecommendationsTagsColor(data);
  data = await getRecommendationsGeoLoc(data);
  return data;
}

// array with all of Airtable Colors
const airtableColors = [
  {
    name: "blue",
    value: "#1283DA",
  },
  {
    name: "blueLight1",
    value: "#9CC7FF",
  },
  {
    name: "blueLight2",
    value: "#CFDFFF",
  },
  {
    name: "blueBright",
    value: "#2D7FF9",
  },
  {
    name: "blueDark1",
    value: "#2750AE",
  },
  {
    name: "cyan",
    value: "#01A9DB",
  },
  {
    name: "cyanLight1",
    value: "#77D1F3",
  },
  {
    name: "cyanLight2",
    value: "#D0F0FD",
  },
  {
    name: "cyanBright",
    value: "#18BFFF",
  },
  {
    name: "cyanDark1",
    value: "#0B76B7",
  },
  {
    name: "teal",
    value: "#02AAA4",
  },
  {
    name: "tealLight1",
    value: "#72DDC3",
  },
  {
    name: "tealLight2",
    value: "#C2F5E9",
  },
  {
    name: "tealBright",
    value: "#20D9D2",
  },
  {
    name: "tealDark1",
    value: "#06A09B",
  },
  {
    name: "green",
    value: "#11AF22",
  },
  {
    name: "greenLight1",
    value: "#93E088",
  },
  {
    name: "greenLight2",
    value: "#D1F7C4",
  },
  {
    name: "greenBright",
    value: "#20C933",
  },
  {
    name: "greenDark1",
    value: "#338A17",
  },
  {
    name: "yellow",
    value: "#E08D00",
  },
  {
    name: "yellowLight1",
    value: "#FFD66E",
  },
  {
    name: "yellowLight2",
    value: "#FFEAB6",
  },
  {
    name: "yellowBright",
    value: "#FCB400",
  },
  {
    name: "yellowDark1",
    value: "#B87503",
  },
  {
    name: "orange",
    value: "#F7653B",
  },
  {
    name: "orangeLight1",
    value: "#FFA981",
  },
  {
    name: "orangeLight2",
    value: "#FEE2D5",
  },
  {
    name: "orangeBright",
    value: "#FF6F2C",
  },
  {
    name: "orangeDark1",
    value: "#D74D26",
  },
  {
    name: "red",
    value: "#EF3061",
  },
  {
    name: "redLight1",
    value: "#FF9EB7",
  },
  {
    name: "redLight2",
    value: "#FFDCE5",
  },
  {
    name: "redBright",
    value: "#F82B60",
  },
  {
    name: "redDark1",
    value: "#BA1E45",
  },
  {
    name: "pink",
    value: "#E929BA",
  },
  {
    name: "pinkLight1",
    value: "#F99DE2",
  },
  {
    name: "pinkLight2",
    value: "#FFDAF6",
  },
  {
    name: "pinkBright",
    value: "#FF08C2",
  },
  {
    name: "pinkDark1",
    value: "#B2158B",
  },
  {
    name: "purple",
    value: "#7C39ED",
  },
  {
    name: "purpleLight1",
    value: "#CDB0FF",
  },
  {
    name: "purpleLight2",
    value: "#EDE2FE",
  },
  {
    name: "purpleBright",
    value: "#8B46FF",
  },
  {
    name: "purpleDark1",
    value: "#6B1CB0",
  },
  {
    name: "gray",
    value: "#666666",
  },
  {
    name: "grayLight1",
    value: "#CCCCCC",
  },
  {
    name: "grayLight2",
    value: "#EEEEEE",
  },
  {
    name: "grayBright",
    value: "#666666",
  },
  {
    name: "grayDark1",
    value: "#444444",
  },
  {
    name: "darken1",
    value: "rgba(0,0,0,0.05)",
  },
  {
    name: "darken2",
    value: "rgba(0,0,0,0.1)",
  },
  {
    name: "darken3",
    value: "rgba(0,0,0,0.25)",
  },
  {
    name: "darken4",
    value: "rgba(0,0,0,0.5)",
  },
];
