import { schema, SenderError, table, t, type InferSchema, type ReducerCtx } from 'spacetimedb/server';

const requestFields = {
  emergencyType: t.string(),
  description: t.string(),
  latitude: t.f64(),
  longitude: t.f64(),
  urgency: t.string(),
};

const spacetimedb = schema({
  rescueRequest: table(
    { public: false },
    {
      id: t.u64().primaryKey().autoInc(),
      ...requestFields,
      created_at: t.timestamp(),
      status: t.string(),
    }
  ),
  rescueRequestDetails: table(
    { public: false, indexes: [{ accessor: 'owner', algorithm: 'btree', columns: ['owner'] }] },
    {
      requestId: t.u64().primaryKey(),
      owner: t.identity(),
      submissionId: t.string(),
      hasCoordinates: t.bool(),
      location: t.string(),
      affected: t.u16(),
      assistance: t.string(),
      assignedAt: t.timestamp().optional(),
      startedAt: t.timestamp().optional(),
      teamId: t.string().optional(),
      acknowledgedAt: t.timestamp().optional(),
      deliveredAt: t.timestamp().optional(),
      verifiedAt: t.timestamp().optional(),
    }
  ),
});
export default spacetimedb;

type Context = ReducerCtx<InferSchema<typeof spacetimedb>>;
type RequestFields = { emergencyType: string; description: string; latitude: number; longitude: number; urgency: string };

const requestViewRow = t.row('MyRescueRequest', {
  id: t.u64().primaryKey(),
  ...requestFields,
  createdAt: t.timestamp(),
  status: t.string(),
  submissionId: t.string(),
  hasCoordinates: t.bool(),
  location: t.string(),
  affected: t.u16(),
  assistance: t.string(),
  assignedAt: t.timestamp().optional(),
  startedAt: t.timestamp().optional(),
  teamId: t.string().optional(),
  acknowledgedAt: t.timestamp().optional(),
  deliveredAt: t.timestamp().optional(),
  verifiedAt: t.timestamp().optional(),
});

export const myRescueRequests = spacetimedb.view(
  { public: true },
  t.array(requestViewRow),
  ctx => [...ctx.db.rescueRequestDetails.owner.filter(ctx.sender)].flatMap(details => {
    const request = ctx.db.rescueRequest.id.find(details.requestId);
    if (!request) return [];
    const { created_at, ...fields } = request;
    return [{
      ...fields,
      createdAt: created_at,
      submissionId: details.submissionId,
      hasCoordinates: details.hasCoordinates,
      location: details.location,
      affected: details.affected,
      assistance: details.assistance,
      assignedAt: details.assignedAt,
      startedAt: details.startedAt,
      teamId: details.teamId,
      acknowledgedAt: details.acknowledgedAt,
      deliveredAt: details.deliveredAt,
      verifiedAt: details.verifiedAt,
    }];
  })
);

export const init = spacetimedb.init(_ctx => {});
export const onConnect = spacetimedb.clientConnected(_ctx => {});
export const onDisconnect = spacetimedb.clientDisconnected(_ctx => {});

function insertRequest(ctx: Context, fields: RequestFields, details: {
  submissionId: string; hasCoordinates: boolean; location: string; affected: number; assistance: string;
}) {
  if (!Number.isFinite(fields.latitude) || Math.abs(fields.latitude) > 90
      || !Number.isFinite(fields.longitude) || Math.abs(fields.longitude) > 180) {
    throw new SenderError('Invalid request coordinates.');
  }
  const request = ctx.db.rescueRequest.insert({
    id: 0n,
    ...fields,
    created_at: ctx.timestamp,
    status: 'pending',
  });
  ctx.db.rescueRequestDetails.insert({
    requestId: request.id,
    owner: ctx.sender,
    ...details,
    teamId: undefined,
    assignedAt: undefined,
    startedAt: undefined,
    acknowledgedAt: undefined,
    deliveredAt: undefined,
    verifiedAt: undefined,
  });
}

export const createRescueRequest = spacetimedb.reducer(requestFields, (ctx, fields) => {
  insertRequest(ctx, fields, { submissionId: '', hasCoordinates: true, location: '', affected: 0, assistance: 'Other' });
});

export const submitBrowserRequest = spacetimedb.reducer(
  { ...requestFields, submissionId: t.string(), hasCoordinates: t.bool(), location: t.string(), affected: t.u16(), assistance: t.string() },
  (ctx, { submissionId, hasCoordinates, location, affected, assistance, ...fields }) => {
    if (submissionId.length !== 36 || location.trim().length < 3 || location.length > 160
        || fields.description.trim().length < 12 || fields.description.length > 1000
        || affected < 1 || affected > 9999
        || !['Rescue', 'Medical Assistance', 'Evacuation', 'Food and Water', 'Shelter', 'Other'].includes(assistance)) {
      throw new SenderError('Invalid demo request.');
    }
    if ([...ctx.db.rescueRequestDetails.owner.filter(ctx.sender)].some(row => row.submissionId === submissionId)) return;
    insertRequest(ctx, fields, { submissionId, hasCoordinates, location, affected, assistance });
  }
);

function ownedRequest(ctx: Context, id: bigint) {
  const request = ctx.db.rescueRequest.id.find(id);
  const details = ctx.db.rescueRequestDetails.requestId.find(id);
  if (!request || !details?.owner.equals(ctx.sender)) throw new SenderError('Request not found.');
  return { request, details };
}

export const updateRequesttatus = spacetimedb.reducer(
  { id: t.u64(), status: t.string() },
  (ctx, { id, status }) => {
    const { request } = ownedRequest(ctx, id);
    ctx.db.rescueRequest.id.update({ ...request, status });
  }
);

const transitions: Record<string, string[]> = {
  pending: ['Under Review', 'Assigned'],
  Reported: ['Under Review', 'Assigned'],
  'Under Review': ['Assigned'],
  Assigned: ['In Progress'],
  'In Progress': ['Assistance Delivered'],
  'Assistance Delivered': ['Verified Closed'],
};

export const coordinateBrowserRequest = spacetimedb.reducer(
  { id: t.u64(), expectedStatus: t.string(), status: t.string(), teamId: t.string().optional() },
  (ctx, { id, expectedStatus, status, teamId }) => {
    const { request, details } = ownedRequest(ctx, id);
    if (request.status !== expectedStatus || !transitions[request.status]?.includes(status)) {
      throw new SenderError('The request status changed. Review it and try again.');
    }
    if (status === 'Assigned') {
      if (!teamId || !['alpha', 'bravo', 'charlie', 'delta', 'foxtrot'].includes(teamId)) {
        throw new SenderError('Choose an available response team.');
      }
      if ([...ctx.db.rescueRequestDetails.owner.filter(ctx.sender)].some(row => row.teamId === teamId)) {
        throw new SenderError('That team already has an assignment.');
      }
    }
    ctx.db.rescueRequest.id.update({ ...request, status });
    ctx.db.rescueRequestDetails.requestId.update({
      ...details,
      teamId: status === 'Verified Closed' ? undefined : status === 'Assigned' ? teamId : details.teamId,
      acknowledgedAt: details.acknowledgedAt ?? ctx.timestamp,
      assignedAt: status === 'Assigned' ? ctx.timestamp : details.assignedAt,
      startedAt: status === 'In Progress' ? ctx.timestamp : details.startedAt,
      deliveredAt: status === 'Assistance Delivered' ? ctx.timestamp : details.deliveredAt,
      verifiedAt: status === 'Verified Closed' ? ctx.timestamp : details.verifiedAt,
    });
  }
);
