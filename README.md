# Life Line

Life Line is a frontend-only demo for reporting and tracking incidents. It starts with fictional incidents and teams in Seattle. Demo reports do not contact emergency services. In a real emergency, contact official emergency services directly.

## Run locally

Use Node.js 22 and run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. On subsequent runs, `npm run dev` is enough.

## What you can do

- **Overview** shows a 2D OpenStreetMap map with clickable markers and recent incidents.
- **Incidents** supports search, filters, assignment, status updates, duplicate review, and coordinator verification.
- **Follow-up** lists reports that need acknowledgment, assignment, verification, or review.
- **Responders** lets you select a demo team and record observations or progress on its assignment.
- **Report an incident** adds a fictional report to the local workspace. Choose a listed Seattle neighborhood to place it on the map.

The default demo runs in memory and resets on reload. An optional SpacetimeDB mode stores reports and coordination status. The map uses online street tiles, subject to the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Reports outside the listed demo areas stay in the incident list.

## Connect to local SpacetimeDB

Use the [SpacetimeDB 2.14 CLI](https://spacetimedb.com/install) and a Node.js version supported by the 2.14 SDK, such as Node.js 22.23.4 or newer in the 22.x series. From the repository root:

```sh
npm install
npm ci --prefix spacetimedb/spacetimedb
spacetime start --listen-addr 127.0.0.1:3000
```

In another terminal, publish to the local instance, copy the example configuration, and start the frontend.

```sh
spacetime publish life-line --server http://127.0.0.1:3000 --module-path spacetimedb/spacetimedb --anonymous
cp .env.example .env.local
npm run dev
```

The anonymous publish command creates a one-off local database. To republish under the same name, use a stable CLI identity from the first publish.

Connected mode starts with the requests owned by the browser's demo identity. The browser stores its database token locally so the same origin and browser profile can load its requests again. Reports, status, assignments, and verification persist in SpacetimeDB. Field observations, review flags, and duplicate decisions stay in the current tab. Connected mode uses fictional reports only and omits reporter name and contact fields. To return to the in-memory demo, remove the two SpacetimeDB settings and restart Vite.

The original `rescue_request` table remains private. The frontend subscribes to `my_rescue_requests`, which returns only the caller's rows. Records created before ownership tracking remain in the private table. The original reducer names, including `update_requesttatus`, are retained.

After changing the module schema, regenerate the checked-in client bindings:

```sh
spacetime generate --lang typescript --module-path spacetimedb/spacetimedb --out-dir src/module_bindings
```

## Request data

The frontend stores each incident's API-shaped data in `incident.request`.

```json
{
  "Id": "RP-1048",
  "EmergencyType": "Flooding",
  "Description": "Water is covering the access road.",
  "Latitude": 47.5775,
  "Longitude": -122.3533,
  "Urgency": "Critical",
  "Time": "2026-11-07T18:38:00.000Z",
  "Status": "Under Review"
}
```

`Time` is the submission timestamp in UTC. Both coordinates are `null` when the location cannot be mapped. `EmergencyType` uses the incident category, and `Urgency` is `Critical`, `Elevated`, or `Routine`. New demo reports start as `Routine` and `Reported`. Reporter details and incident activity stay outside the payload.

## Checks

```sh
npm run typecheck
npm test
npm run build
```
