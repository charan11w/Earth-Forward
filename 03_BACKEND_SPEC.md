# Earth Forward — Backend Specification

## 1. Backend Goal

The backend manages users, addresses, waste requests, geographic grouping, route generation, worker confirmations, rewards, complaints, community bins, and admin actions.

Recommended stack:

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication
- Zod validation

Optional:

- Redis for queues/caching
- Cloud storage for complaint photos
- Geocoding/routing provider for real map data

---

# 2. Backend Architecture

```text
src/
├── config/
├── middleware/
│   ├── auth.ts
│   ├── role.ts
│   └── errorHandler.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── addresses/
│   ├── bins/
│   ├── pickups/
│   ├── routes/
│   ├── workers/
│   ├── complaints/
│   ├── communityBins/
│   ├── rewards/
│   └── admin/
├── services/
│   ├── geo.service.ts
│   ├── clustering.service.ts
│   ├── route.service.ts
│   ├── hotspot.service.ts
│   └── points.service.ts
├── prisma/
├── app.ts
└── server.ts
```

---

# 3. Roles

```text
RESIDENT
WORKER
ADMIN
```

Role middleware:

```text
requireAuth()
requireRole("WORKER")
requireRole("ADMIN")
```

---

# 4. Core Database Models

## User

```text
User
- id
- name
- email
- phone
- passwordHash
- role
- trashPoints
- createdAt
- updatedAt
```

---

## Address

```text
Address
- id
- userId
- addressLine
- area
- landmark
- latitude
- longitude
- accessNotes
- createdAt
- updatedAt
```

Important:

**Store latitude and longitude. Do not rely only on address text for proximity calculations.**

---

## Bin

```text
Bin
- id
- ownerUserId nullable
- type
- size
- latitude
- longitude
- address
- status
- createdAt
- updatedAt
```

Types:

```text
HOUSEHOLD
COMMUNITY
PUBLIC
```

Statuses:

```text
REQUESTED
APPROVED
ACTIVE
DAMAGED
REMOVED
```

---

## BinRequest

```text
BinRequest
- id
- userId
- type
- size
- reason
- addressId
- status
- createdAt
- updatedAt
```

Status:

```text
REQUESTED
APPROVED
SCHEDULED
DELIVERED
REJECTED
```

---

## PickupRequest

```text
PickupRequest
- id
- userId
- addressId
- binId
- wasteType
- quantity
- latitude
- longitude
- accessNotes
- serviceType
- status
- pointsAwarded
- routeId nullable
- completedAt nullable
- createdAt
- updatedAt
```

Service types:

```text
NORMAL_PICKUP
EXTRA_CLEANING
```

Statuses:

```text
CREATED
QUEUED
ASSIGNED
IN_PROGRESS
PICKED_UP
COMPLETED
FAILED_ACCESS
CANCELLED
```

---

## Truck

```text
Truck
- id
- name
- registrationNumber
- capacity
- status
- currentLatitude
- currentLongitude
- active
```

For the hackathon, truck location can be simulated.

---

## Route

```text
Route
- id
- truckId
- date
- clusterId
- totalDistance
- estimatedMinutes
- status
- startedAt
- completedAt
```

Statuses:

```text
PLANNED
ASSIGNED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

## RouteStop

```text
RouteStop
- id
- routeId
- pickupRequestId
- sequence
- latitude
- longitude
- status
- alternatePointId nullable
- completedAt nullable
```

---

## AlternatePoint

```text
AlternatePoint
- id
- name
- latitude
- longitude
- address
- active
```

---

## TrashPointTransaction

```text
TrashPointTransaction
- id
- userId
- amount
- type
- referenceId
- description
- createdAt
```

Types:

```text
PICKUP_REWARD
COMMUNITY_REWARD
REDEMPTION
EXTRA_SERVICE_DEDUCTION
ADMIN_ADJUSTMENT
```

Never update points without creating a transaction record.

---

## Reward

```text
Reward
- id
- name
- description
- pointsCost
- stock
- active
- createdAt
```

Examples:

```text
Trash Covers
Household Dustbin
Cleaning Brush
Cleaning Cloth
```

---

## RewardRedemption

```text
RewardRedemption
- id
- userId
- rewardId
- pointsCost
- status
- createdAt
```

---

## Complaint

```text
Complaint
- id
- userId
- latitude
- longitude
- address
- category
- description
- photoUrl nullable
- status
- hotspotId nullable
- createdAt
```

Statuses:

```text
OPEN
UNDER_REVIEW
ACTION_PLANNED
RESOLVED
REJECTED
```

---

## WasteHotspot

```text
WasteHotspot
- id
- latitude
- longitude
- address
- complaintCount
- uniqueReporterCount
- priority
- status
- createdAt
- updatedAt
```

Priority:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

## HotspotAction

```text
HotspotAction
- id
- hotspotId
- type
- description
- assignedTo
- status
- createdAt
- completedAt
```

Types:

```text
DEPLOY_COMMUNITY_BIN
DEPLOY_BOARD
SEND_MANAGER
CONTACT_NEARBY_HOUSEHOLDS
SCHEDULE_CLEANUP
```

---

## CommunityBinRequest

```text
CommunityBinRequest
- id
- userId
- latitude
- longitude
- address
- reason
- householdEstimate
- description
- photoUrl
- status
- createdAt
- updatedAt
```

Statuses:

```text
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
DEPLOYED
```

---

# 5. API Design

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

---

## User

```http
GET /api/users/me
PUT /api/users/me
```

---

## Address

```http
POST /api/addresses
GET /api/addresses
PUT /api/addresses/:id
```

---

## Household Bin

```http
POST /api/bin-requests
GET /api/bin-requests/my
GET /api/bin-requests/:id
```

Admin:

```http
GET /api/admin/bin-requests
PATCH /api/admin/bin-requests/:id
```

---

# 6. Pickup Request Flow

Resident:

```http
POST /api/pickups
```

Backend:

1. Authenticate user.
2. Load saved address.
3. Validate coordinates.
4. Create pickup request.
5. Set status to `CREATED`.
6. Return request.

Then:

```text
CREATED
   ↓
QUEUED
   ↓
Cluster generation
   ↓
Route generation
   ↓
ASSIGNED
```

---

# 7. Geographic Clustering

Create:

```text
clustering.service.ts
```

Input:

```text
Pending pickup requests
```

Each request has:

```text
latitude
longitude
```

For the MVP, use a simple radius.

Example:

```text
MAX_CLUSTER_DISTANCE = 1000 meters
```

Pseudo-flow:

```text
pendingRequests = getPendingRequests()

clusters = []

for request in pendingRequests:
    find an existing cluster whose center is within 1km

    if found:
        add request to cluster
    else:
        create new cluster
```

This is enough to demonstrate the core concept.

---

# 8. Route Optimization

Create:

```text
route.service.ts
```

Input:

```text
Truck start location
+
Cluster pickup locations
```

Algorithm:

```text
current = truck/depot

while unvisited locations exist:

    choose nearest unvisited pickup

    add pickup to route

    current = selected pickup
```

Output:

```text
Route
RouteStop[]
Total distance
Estimated time
```

For the demo, this is a practical approximation rather than a perfect mathematical vehicle-routing solver.

---

# 9. Optional Routing API

If available, send the ordered coordinates to a routing service to get:

- Road distance
- Road duration
- Actual road path

The application can still work without this integration by calculating approximate straight-line distances.

---

# 10. Worker Pickup Confirmation

Endpoint:

```http
POST /api/worker/pickups/:id/complete
```

Backend transaction:

```text
1. Verify worker.
2. Verify pickup is assigned to worker's route.
3. Change pickup status to COMPLETED.
4. Change route stop to COMPLETED.
5. Create TrashPointTransaction.
6. Increase user's TrashPoints.
7. Set completedAt.
```

Example:

```text
Normal pickup = +10 points
```

Use a database transaction so the pickup and points cannot become inconsistent.

---

# 11. Extra Cleaning Request

When user requests:

```text
EXTRA_CLEANING
```

Do not deduct immediately.

When worker completes it:

```text
Create transaction:
amount = -5
type = EXTRA_SERVICE_DEDUCTION
```

Then reduce balance.

---

# 12. TrashPoints Redemption

Endpoint:

```http
POST /api/rewards/:rewardId/redeem
```

Backend:

1. Lock/check user balance.
2. Check reward stock.
3. Verify enough points.
4. Deduct points.
5. Create redemption record.
6. Create negative points transaction.
7. Reduce stock.

All should happen inside one database transaction.

---

# 13. Nearby Bins

Endpoint:

```http
GET /api/bins/nearby?lat=...&lng=...&radius=2000
```

Use a geographic distance calculation.

For PostgreSQL/PostGIS, use geospatial functions if enabled.

For a simpler MVP, calculate Haversine distance in application code.

---

# 14. Complaint Flow

Resident:

```http
POST /api/complaints
```

Backend:

1. Save complaint.
2. Find nearby existing complaints.
3. If complaints are within configured radius:
   - associate with the same hotspot.
4. Otherwise create a new hotspot.

Example:

```text
HOTSPOT_RADIUS = 300 meters
```

---

# 15. Hotspot Escalation

Example rule:

```text
1–2 complaints → LOW
3–5 complaints → MEDIUM
6–9 complaints → HIGH
10+ complaints → CRITICAL
```

Also count unique reporters.

This prevents one user repeatedly creating many reports from being treated exactly like many residents reporting the same problem.

Example:

```text
14 complaints
9 unique reporters
```

Admin sees:

```text
HIGH PRIORITY WASTE HOTSPOT
```

---

# 16. Admin Action Flow

```text
Hotspot detected
      ↓
Admin reviews
      ↓
Create action
      ↓
DEPLOY_COMMUNITY_BIN
or
DEPLOY_BOARD
or
SEND_MANAGER
      ↓
Action assigned
      ↓
Action completed
      ↓
Hotspot marked resolved
```

---

# 17. Important Business Rules

### Pickup points

Only award points after confirmed pickup.

### Duplicate requests

A resident should not have multiple active pickup requests for the same bin.

Suggested rule:

```text
One active NORMAL_PICKUP per bin.
```

### Cancellation

Allow cancellation while:

```text
CREATED
QUEUED
```

Do not allow normal cancellation after worker has started the pickup.

### Extra service

Extra cleaning deducts points only after successful completion.

### Rewards

Do not allow redemption if:

```text
user.trashPoints < reward.pointsCost
```

### Complaint spam

Rate-limit complaint creation.

### Hotspots

Use both:

- Geographic proximity
- Number of unique reporters

---

# 18. Suggested End-to-End Backend Flow

```text
Resident registers
      ↓
Adds address
      ↓
Coordinates stored
      ↓
Requests bin
      ↓
Bin approved/delivered
      ↓
Bin becomes full
      ↓
Resident requests pickup
      ↓
Pickup enters queue
      ↓
Multiple nearby pickups collected
      ↓
Geographic clusters generated
      ↓
Route optimized
      ↓
Truck assigned
      ↓
Worker starts route
      ↓
Worker confirms waste pickup
      ↓
Pickup completed
      ↓
TrashPoints awarded
```

Parallel community flow:

```text
Residents report same dumping location
      ↓
Backend groups nearby complaints
      ↓
Waste hotspot created
      ↓
Complaint count increases
      ↓
Priority increases
      ↓
Admin reviews
      ↓
Community bin / board / manager action
      ↓
Location cleaned
      ↓
Hotspot resolved
```

---

# 19. Suggested Prisma Relationships

```text
User
 ├── Address[]
 ├── Bin[]
 ├── PickupRequest[]
 ├── Complaint[]
 ├── TrashPointTransaction[]
 └── RewardRedemption[]

PickupRequest
 └── RouteStop?

Route
 ├── Truck
 └── RouteStop[]

RouteStop
 └── PickupRequest

WasteHotspot
 ├── Complaint[]
 └── HotspotAction[]
```

---

# 20. Backend Security

Implement:

- Password hashing.
- JWT authentication.
- Role-based authorization.
- Input validation.
- Request rate limiting.
- Ownership checks.
- Transaction-safe point updates.
- Admin-only endpoints.
- Worker-only pickup completion endpoints.

Never trust user-supplied:

- userId
- role
- TrashPoints
- pickup ownership
- admin status

Always derive sensitive values from authenticated server-side identity.

---

# 21. Demo Seed Data

Create a seed script containing:

```text
1 admin
2 workers
10 residents
10 addresses
8 household bins
12 pickup requests
2 trucks
3 community bins
6 complaints
1 hotspot
5 rewards
```

Create pickup coordinates intentionally close together so the clustering/route feature is visually obvious.

Example:

```text
Cluster A:
12.9716, 77.5946
12.9721, 77.5950
12.9730, 77.5942
12.9719, 77.5960

Cluster B:
12.9800, 77.6000
12.9810, 77.6010
12.9795, 77.5990
```

Use fictional/demo locations rather than exposing real residents' addresses.

---

# 22. MVP Implementation Order

### Day 1

- Express + TypeScript
- Prisma
- PostgreSQL
- Auth
- User
- Address

### Day 2

- Bin requests
- Pickup requests
- Request statuses

### Day 3

- Geographic clustering
- Route generation
- Truck/worker models

### Day 4

- Worker route
- Pickup confirmation
- TrashPoints

### Day 5

- Rewards
- Community-bin requests
- Complaints

### Day 6

- Hotspot detection
- Admin dashboard APIs
- Demo seed data

### Day 7

- Integration
- Error handling
- Demo polish
- Deployment

---

# 23. Most Important Demo APIs

If time is limited, make these work perfectly:

```text
POST /auth/register
POST /auth/login

POST /addresses

POST /bin-requests

POST /pickups
GET  /pickups/my

POST /routes/generate
GET  /routes/:id

POST /worker/pickups/:id/complete

GET /wallet
GET /rewards
POST /rewards/:id/redeem

POST /complaints
GET /hotspots

POST /community-bin-requests

GET /admin/dashboard
```

The hackathon judges should be able to see one complete flow from resident → request → route → worker → points, plus one community hotspot flow.
