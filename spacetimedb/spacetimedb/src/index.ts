import { schema, table, t } from 'spacetimedb/server';

const spacetimedb = schema({
  rescueRequest: table(
    { public: false },
    {
      id: t.u64().primaryKey().autoInc(),
      emergencyType: t.string(),
      description: t.string(),
      latitude: t.f64(),
      longitude: t.f64(),
      urgency: t.string(),
      created_at: t.timestamp(),
      status: t.string(),

    }
  ),
});
export default spacetimedb;

export const init = spacetimedb.init(_ctx => {
  // Called when the module is initially published
});

export const onConnect = spacetimedb.clientConnected(_ctx => {
  // Called every time a new client connects
});

export const onDisconnect = spacetimedb.clientDisconnected(_ctx => {
  // Called every time a client disconnects
});

export const createRescueRequest = spacetimedb.reducer(
  {
    emergencyType: t.string(),
    description: t.string(),
    latitude: t.f64(),
    longitude: t.f64(),
    urgency: t.string(),
  },
  (ctx, {emergencyType, description, latitude, longitude, urgency}) => {
    ctx.db.rescueRequest.insert({
      id: 0n,
      emergencyType,
      description,
      latitude,
      longitude,
      urgency,
      created_at: ctx.timestamp,
      status: "pending" 
    });
  }
);

export const updateRequesttatus = spacetimedb.reducer (
  {
    id: t.u64(),
    status: t.string(),
  },
  (ctx, { id, status }) => {
    const request = ctx.db.rescueRequest.id.find(id)
    if (!request) {
      throw new Error ("Request not found!")
    }
    ctx.db.rescueRequest.id.update({
      ...request,
      status,
    });
    }
  );
