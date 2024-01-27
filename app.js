const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dataBasePath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dataBasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server Running at "http://localhost:3000/"`);
    });
  } catch (error) {
    console.log(`Data Base Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
const convertDistrictCase = (each) => {
  return {
    districtId: each.district_id,
    districtName: each.district_name,
    stateId: each.state_id,
    cases: each.cases,
    cured: each.cured,
    active: each.active,
    deaths: each.deaths,
  };
};

//API 1 Returns a list of all states in the state table
app.get("/states/", async (request, response) => {
  const allStatesQuery = `
      SELECT 
        state_id AS stateId,
        state_name AS stateName,
        population AS population
      FROM 
        state;`;
  const statesArray = await db.all(allStatesQuery);
  response.send(statesArray);
});

//API 2 Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const allStatesQuery = `
      SELECT 
        state_id AS stateId,
        state_name AS stateName,
        population AS population
      FROM 
        state
      WHERE
        state_id=${stateId};`;
  const state = await db.get(allStatesQuery);
  response.send(state);
});

//API 3 Create a district in the district table
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDistrictQuery = `
      INSERT INTO 
        district (district_name, state_id, cases, cured, active, deaths)
      VALUES
        (
          '${districtName}',
          ${stateId},
          ${cases},
          ${cured},
          ${active},
          ${deaths}
        );`;
  await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

//API 4 Returns a district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
      SELECT
        *
      FROM
        district
      WHERE
        district_id=${districtId}`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictCase(district));
});

//API 5 Deletes a district from the district table based on the district ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
      DELETE FROM
        district
      WHERE
        district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//API 6 Updates the details of a specific district based on the district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
      UPDATE 
        district
      SET
        district_id=${districtId} ,
        district_name='${districtName}',
        state_id=${stateId},
        cases= ${cases},
        cured= ${cured},
        active= ${active},
        deaths= ${deaths}
      WHERE
        district_id=${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//API 7 Returns the statistics
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statsQuery = `
      SELECT
        SUM(cases) AS totalCases,
        SUM(cured) AS totalCured,
        SUM(active) AS totalActive,
        SUM(deaths) AS totalDeaths
      FROM
        district
      WHERE
        state_id=${stateId};`;
  const statistics = await db.get(statsQuery);
  response.send(statistics);
});

//API 8 Returns an object containing the state name of a district
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `
      SELECT
        state.state_name AS stateName
      FROM
        state NATURAL JOIN district
      WHERE
        district_id=${districtId};`;
  const state = await db.get(getStateQuery);
  response.send(state);
});
module.exports = app;
