# Earth Forward — Frontend Specification

## 1. Frontend Goal

Build a clean, modern waste-management application with three role experiences:

- Resident
- Collection Worker
- Admin/Manager

The UI should make the environmental impact obvious while keeping the main actions simple.

Recommended stack:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Map library such as Leaflet/React Leaflet
- Recharts for admin analytics
- Axios or fetch for API communication

---

# 2. Application Structure

```text
src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   └── api.ts
├── components/
│   ├── ui/
│   ├── layout/
│   ├── map/
│   ├── requests/
│   ├── rewards/
│   └── charts/
├── pages/
│   ├── auth/
│   ├── resident/
│   ├── worker/
│   └── admin/
├── hooks/
├── services/
├── types/
├── utils/
└── assets/
```

---

# 3. Visual Design

Use a modern environmental SaaS dashboard.

### Design principles

- Clean white/light background.
- Green as the primary environmental accent.
- Dark text for readability.
- Rounded cards.
- Clear status badges.
- Large action buttons.
- Maps used only where they add value.
- Mobile responsive resident experience.
- Desktop-first worker/admin dashboards.

Avoid making the application look like a generic ecommerce website.

---

# 4. Authentication

## Login

Fields:

- Email/phone
- Password

Actions:

- Login
- Register
- Forgot password

## Register

Fields:

- Full name
- Phone
- Email
- Password
- Confirm password

After registration:

`Add Address`

---

# 5. Resident Screens

## Resident Dashboard

Top:

```text
Good morning, Charan

Your neighborhood is cleaner when we act together.
```

Main cards:

```text
TrashPoints
120

Pending Pickup
1

Nearby Community Bins
3
```

Primary actions:

```text
[ Request Pickup ]
[ Request Bin ]
[ Report Waste ]
[ Community Bin ]
```

Bottom section:

`Recent Activity`

---

## Address Screen

Fields:

- House/address
- Area
- Landmark
- Latitude
- Longitude
- Access instructions

Button:

`Save Address`

Map:

Pin the user's location.

---

## Request Pickup Screen

Show:

```text
Pickup Address
123 Example Street

Waste Type
[ General ] [ Recyclable ] [ Organic ]

Approximate Quantity
[ Small ] [ Medium ] [ Large ]

Access Notes
Optional text

[ Raise Pickup Request ]
```

Confirmation:

```text
Pickup request created.
We'll group it with nearby requests for efficient collection.
```

---

## My Requests

Tabs:

- Active
- Completed
- Cancelled

Request card:

```text
Waste Pickup
Request #WP-1024

Status: Assigned
Scheduled: Today

Location:
Example Street

[ View Details ]
```

---

## Request Details

Timeline:

```text
✓ Request created
✓ Added to collection queue
✓ Assigned to Truck 01
○ Waste pickup
○ Completed
```

If inaccessible:

```text
Truck cannot access the location.
Please use Collection Point A.
```

---

# 6. Household Bin Request

Screen:

```text
Request a Household Bin

Select size

[ Small ]
[ Medium ]
[ Large ]

Reason
[ New household ]
[ Damaged bin ]
[ Need additional bin ]

Delivery Address

[ Submit Request ]
```

Status:

`REQUESTED → APPROVED → SCHEDULED → DELIVERED`

---

# 7. Community Bin Request

Screen:

```text
Request a Community Bin

Where is the problem?

[ Select location ]

Why is a community bin needed?

[ Overflowing waste
  No nearby bin
  Repeated dumping
  Many households
  Other ]

Nearby households:
[ 10+ ]

Description:
[________________]

Photo:
[ Upload ]

[ Submit Request ]
```

---

# 8. Report Waste

Screen:

```text
Report Waste Problem

Location
[ Map ]

Problem Type
[ Roadside dumping ]
[ Overflowing bin ]
[ Open dumping ]
[ Shop/hotel waste ]
[ Construction waste ]
[ Other ]

Description

Photo

[ Submit Report ]
```

After submission:

```text
Report submitted.

If other residents report the same location,
it may be escalated as a community hotspot.
```

---

# 9. Nearby Bins

Map screen:

```text
Nearby Public Bins

● Bin A — 300m
● Bin B — 650m
● Community Bin C — 1.1km
```

Bin card:

```text
Community Bin C
1.1 km away

Waste type: General
Status: Available

[ View Location ]
```

---

# 10. TrashPoints Wallet

Header:

```text
120 TrashPoints
```

Cards:

```text
+10
Waste pickup completed

+5
Community cleanup

-30
Redeemed household dustbin

-5
Extra bin cleaning
```

CTA:

`Redeem Rewards`

---

# 11. Rewards

Grid:

```text
Trash Covers
30 points
[ Redeem ]

Household Dustbin
100 points
[ Redeem ]

Cleaning Brush
50 points
[ Redeem ]
```

Before redemption:

```text
Redeem Household Dustbin?

Cost: 100 points
Balance after redemption: 20

[ Confirm ]
```

---

# 12. Intentional Bin Cleaning

Resident can request extra service:

```text
Extra Bin Cleaning

This is an on-demand cleaning request.
5 TrashPoints will be deducted after successful completion.

[ Confirm Request ]
```

The deduction should only occur after worker completion.

---

# 13. Worker Dashboard

Worker home:

```text
Truck 01

Today's Route
12 pickups

Completed
5

Remaining
7
```

Primary button:

`Start Route`

---

# 14. Worker Route Screen

Map:

```text
Depot
 ↓
1. House A
 ↓
2. House B
 ↓
3. Community Point
 ↓
4. House C
 ↓
Depot
```

Route information:

```text
12 pickups
18.4 km
~52 min
```

---

# 15. Worker Pickup Screen

```text
Pickup #5

Resident:
User Name

Location:
Example Street

Waste:
Household waste

[ Confirm Waste Received ]
[ Cannot Access Location ]
```

If cannot access:

```text
Select alternate point

[ Community Point A ]
[ Community Point B ]
[ Other ]

[ Confirm ]
```

---

# 16. Admin Dashboard

Navigation:

```text
Overview
Pickup Requests
Routes
Waste Hotspots
Community Bins
Users
Rewards
Reports
```

KPI cards:

```text
Pending Pickups
42

Completed Today
118

Active Routes
6

Waste Hotspots
9
```

---

# 17. Admin Map

Map layers:

- Pickup requests
- Collection routes
- Public/community bins
- Complaint hotspots

Use different marker icons for each category.

---

# 18. Waste Hotspot Screen

Table:

```text
Location | Complaints | Priority | Action | Status

Market Road | 14 | HIGH | Deploy Bin | Pending
Main Street | 8 | MEDIUM | Awareness Board | In Review
```

Hotspot detail:

```text
Market Road

14 reports
9 unique residents

Recommended Action:
Deploy community bin + awareness board

[ Create Action ]
```

---

# 19. Route Management

Admin sees:

```text
Truck 01
12 pickups
18.4 km
Status: Assigned

Truck 02
9 pickups
13.2 km
Status: In Progress
```

Route detail:

```text
Pickup sequence
1. A
2. B
3. C
4. D

[ Recalculate Route ]
[ Assign Truck ]
```

---

# 20. Important UI States

Every API-driven screen must handle:

- Loading
- Empty
- Error
- Success
- Unauthorized
- Offline/network failure

Example empty state:

```text
No pickup requests yet.

When your bin is full, raise a request here.
```

---

# 21. Frontend API Modules

Create:

```text
authApi
userApi
addressApi
binApi
pickupApi
routeApi
workerApi
complaintApi
communityBinApi
rewardApi
adminApi
```

Example frontend calls:

```text
POST /auth/register
POST /auth/login

GET /users/me
PUT /users/me/address

POST /bins/request
GET /bins/requests

POST /pickups
GET /pickups/my
GET /pickups/:id

GET /routes/my
POST /routes/:id/start

POST /pickups/:id/complete
POST /pickups/:id/alternate-point

GET /bins/nearby

POST /complaints
GET /complaints/my

POST /community-bin-requests

GET /rewards
POST /rewards/:id/redeem

GET /admin/dashboard
GET /admin/hotspots
POST /admin/hotspots/:id/actions
```

---

# 22. Frontend Route Map

```text
/auth/login
/auth/register

/app
/app/dashboard
/app/address
/app/pickups
/app/pickups/new
/app/pickups/:id
/app/bins/request
/app/bins/nearby
/app/community-bin
/app/report
/app/wallet
/app/rewards

/worker
/worker/route
/worker/pickup/:id

/admin
/admin/dashboard
/admin/pickups
/admin/routes
/admin/hotspots
/admin/community-bins
/admin/users
/admin/rewards
```

---

# 23. Demo-Friendly Frontend

Seed the application with realistic demo data:

- 8–15 residents
- 10 pickup requests
- 2–3 collection clusters
- 1–2 trucks
- 3 community bins
- 4–5 complaints
- 1 repeated hotspot
- 5 rewards

This makes the route optimization and hotspot detection visible immediately during the demo.
