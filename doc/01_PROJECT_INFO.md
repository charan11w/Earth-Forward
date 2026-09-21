# Earth Forward — Smart Community Waste Collection Platform

## 1. Project Summary

Earth Forward is a technology-based community waste-management platform that connects residents, collection trucks, and waste-management teams.

The goal is to reduce roadside/common-area waste, improve household waste collection, optimize truck routes, and encourage people to dispose of waste responsibly through a reward system.

This is a software prototype for the hackathon. No physical truck, smart bin, GPS device, or sensor is required.

---

## 2. Problem

In many communities:

- People do not know when or where waste will be collected.
- Household waste may remain outside when collection is missed.
- Collection trucks may follow inefficient routes.
- Some roads or locations may not be accessible to trucks.
- Public/common areas can accumulate waste.
- Communities may lack enough public dustbins.
- People have little incentive to report or dispose of waste responsibly.
- Waste-management teams may not have a clear view of repeated problem locations.

---

## 3. Solution

Earth Forward provides one application where users can:

1. Register their household/location.
2. Request a household dustbin when needed.
3. Raise a waste-pickup request when their bin is full.
4. Earn TrashPoints when waste is successfully handed over.
5. Redeem TrashPoints for cleaning-related items.
6. Request a larger community bin for an area.
7. Report illegal/common-place dumping.
8. View nearby public/community bins.
9. Track the status of their requests.

The backend groups nearby requests using address/location coordinates and creates an optimized collection route for the truck.

---

## 4. Main Users

### Resident

Can:

- Register/login.
- Save an address.
- Request a household bin.
- Request waste pickup.
- Request intentional/on-demand bin cleaning.
- Report roadside/common-area waste.
- Request a community/public bin.
- View request status.
- Earn and spend TrashPoints.
- View nearby bins.
- View pickup history.

### Collection Worker / Truck Operator

Can:

- View assigned route.
- See pickup locations in route order.
- See waste-pickup requests.
- Open a location/details screen.
- Mark a pickup as completed.
- Confirm that waste was received.
- Record whether the truck could access the location.
- Mark an alternate/drop-off point when direct access is impossible.

### Waste Manager / Admin

Can:

- View all requests.
- View problem areas.
- View repeated complaints.
- View community-bin requests.
- Approve/assign bins.
- Create/manage collection routes.
- View route efficiency.
- Manage TrashPoints rules.
- Manage rewards.
- Take action on repeated dumping locations.
- Add public-bin/board deployment actions.

---

## 5. Core User Flow

### Household Registration

User:

Register → Login → Add address → Address is geocoded → User profile is created.

The backend stores:

- Address text
- Latitude
- Longitude
- Area/locality
- Access notes

The latitude/longitude values are used for proximity grouping and route generation.

---

### Household Bin Request

User:

Dashboard → Request Bin → Select bin type → Confirm address → Submit.

Admin/manager:

Pending request → Approve/assign → Status becomes scheduled → Delivered → Completed.

---

### Waste Pickup

User:

Bin is full → Open app → Raise Pickup Request → Confirm location → Submit.

Request contains:

- User
- Address
- Latitude/longitude
- Waste type
- Approximate quantity
- Request time
- Access instructions
- Status

Status flow:

`CREATED → QUEUED → ASSIGNED → PICKED_UP → COMPLETED`

Alternative:

`CREATED → QUEUED → ASSIGNED → FAILED_ACCESS → ALTERNATE_POINT`

---

## 6. Automatic Nearby-Request Grouping

The important backend idea is to group requests geographically.

Example:

10 users in the same locality raise pickup requests.

Instead of treating them as 10 unrelated trips, the backend:

1. Gets coordinates for each request.
2. Finds nearby requests.
3. Groups them into a collection zone.
4. Creates a list of pickup locations.
5. Calculates a practical route.
6. Assigns the route to a truck.

For the prototype, use a configurable proximity threshold such as 500m–1km.

Example:

```text
Area A
  User 1 ─┐
  User 2 ─┤
  User 3 ─┤ → Collection Cluster A
  User 4 ─┘

Truck Route:
Depot → User 3 → User 1 → User 4 → User 2 → Disposal/Depot
```

---

## 7. Route Optimization

The hackathon prototype does not need to solve a perfect real-world vehicle-routing problem.

Use a practical approximation:

1. Start from the truck/depot location.
2. Select the nearest pending pickup.
3. Add it to the route.
4. Move to the next nearest unvisited pickup.
5. Continue until all assigned pickups are covered.
6. Return to depot.

This is a simple nearest-neighbor route optimization strategy.

The UI should clearly communicate:

- Number of pickups
- Total estimated distance
- Estimated route time
- Pickup sequence
- Locations on the map

For a stronger prototype, the backend can later replace the simple algorithm with a routing service/API.

---

## 8. Inaccessible Locations

Sometimes the truck cannot reach the exact household.

The worker can select:

`Truck cannot access location`

Then the app shows/records an alternate nearby collection point.

Example:

```text
House → narrow road → Truck cannot enter

User's assigned point:
Community Collection Point A

Worker:
Mark pickup completed at alternate point
```

The worker confirms the actual handover in the app.

---

## 9. Pickup Confirmation and TrashPoints

When the truck reaches a requested location:

Worker opens request → Confirms waste received → Marks pickup completed.

After successful pickup:

`TrashPoints += reward amount`

Example rules:

- Normal household pickup: +10 points
- Properly separated/recyclable waste: bonus points
- Community cleanup participation: bonus points

The exact points can be configured by admin.

Important:

**TrashPoints are only awarded after the worker confirms the waste was actually collected.**

This prevents users from repeatedly raising fake requests just to collect points.

---

## 10. Intentional Bin-Cleaning Request

A user may intentionally request a bin cleaning/pickup even when it is not part of the normal collection cycle.

Example:

User → Request extra bin cleaning → Submit → Manager/route includes it → Worker completes it.

Because this creates an additional service request, the system can deduct TrashPoints.

Example:

`TrashPoints -= 5`

The deduction should happen when the extra service is successfully completed, not simply when the request is created.

---

## 11. Community/Public Bin Request

The platform also handles larger waste problems.

A user can select:

`Request Community Bin`

They provide:

- Location
- Reason
- Estimated number of nearby households
- Optional photo
- Description

Example:

```text
Problem location:
Near apartment entrance

Problem:
Many households are leaving waste outside.

Suggested solution:
Deploy a large community bin.
```

The manager can review and approve the request.

---

## 12. Common-Place Waste Complaint

Users can report places where waste is repeatedly dumped.

Complaint fields:

- Location
- Category
- Description
- Photo (optional)
- Severity
- Nearby landmark

Categories:

- Roadside dumping
- Hotel/shop waste
- Overflowing public bin
- Construction waste
- Open dumping
- Other

---

## 13. Repeated Complaint Detection

This is an important feature for the hackathon story.

If multiple users report the same/similar location:

```text
Complaint 1 → Location A
Complaint 2 → Location A
Complaint 3 → Location A
Complaint 4 → Location A
```

The backend detects that the location has repeated complaints.

The admin dashboard shows:

`High Priority Waste Hotspot`

The manager can create an action:

- Deploy public/community bin.
- Put a waste-disposal direction board.
- Send a waste manager/community worker.
- Contact nearby establishments/households.
- Schedule additional cleaning.

This turns individual complaints into community-level action.

---

## 14. Nearby Public Bin Discovery

Users can open:

`Nearby Bins`

The application displays public/community bins around their location.

Each bin can contain:

- Name/ID
- Location
- Distance
- Capacity status
- Waste type supported
- Last serviced time

For the hackathon prototype, capacity can be simulated rather than coming from a physical sensor.

---

## 15. TrashPoints Rewards

Users have a wallet:

```text
TrashPoints
----------------
Current balance: 120

+10  Waste pickup
+5   Community cleanup
-30  Redeemed dustbin
-5   Extra bin cleaning
```

Possible rewards:

- Garbage bags/trash covers
- Household dustbin
- Cleaning brush
- Mop
- Cleaning cloth
- Other cleaning-related items

The reward catalog is managed by the admin.

---

## 16. Admin Dashboard

The admin dashboard should show:

### KPIs

- Pending pickups
- Completed pickups
- Active trucks
- Waste hotspots
- Community-bin requests
- Total TrashPoints issued
- Total waste pickups

### Map

Show:

- Pickup requests
- Truck routes
- Community bins
- Complaint hotspots

### Waste Hotspots

Example:

```text
Hotspot #1
23 complaints
Priority: HIGH
Action: Deploy community bin
```

### Route Management

```text
Truck 01
12 pickups
Estimated distance: 18.4 km
Status: IN PROGRESS
```

---

## 17. Suggested MVP Scope

Build these first:

### Must Have

1. User registration/login
2. Address registration
3. Household bin request
4. Waste pickup request
5. Pickup request list
6. Nearby request grouping
7. Optimized route generation
8. Worker route screen
9. Pickup confirmation
10. TrashPoints wallet
11. Rewards
12. Community-bin request
13. Waste complaint
14. Repeated complaint/hotspot detection
15. Admin dashboard

### Nice to Have

- Map visualization
- Photos
- Push notifications
- Waste categories
- Analytics
- Route distance/time
- Alternate collection points

### Avoid for the first version

- Real IoT sensors
- Real truck GPS tracking
- Complex AI
- Real payment integration
- Fully autonomous routing
- Hardware integration

The goal is to demonstrate a convincing working software flow.

---

## 18. Hackathon Pitch

### Problem

Waste collection is often reactive and fragmented. Residents raise individual complaints, trucks follow inefficient routes, and repeated dumping locations may not receive a systematic response.

### Solution

Earth Forward turns waste collection into a coordinated community system.

Residents request pickups and report waste problems. The platform groups nearby requests, generates optimized collection routes, confirms pickups through workers, rewards responsible disposal, and identifies repeated waste hotspots so managers can deploy community bins or awareness boards.

### Impact

The platform aims to:

- Reduce unnecessary truck travel.
- Improve collection reliability.
- Reduce roadside dumping.
- Encourage responsible waste disposal.
- Identify waste hotspots.
- Improve community access to bins.
- Create measurable waste-management data.

---

## 19. Demo Story for the 5-Minute Video

### 0:00–0:30 — Problem

Show a simple example of waste accumulating on roads/common areas.

### 0:30–1:00 — Resident

Register → add address → request bin.

### 1:00–1:40 — Pickup

Bin becomes full → resident raises pickup request.

### 1:40–2:20 — Multiple Residents

Show several nearby users raising requests.

The backend groups them into one collection cluster.

### 2:20–3:00 — Truck Route

Show the optimized route and pickup sequence.

### 3:00–3:40 — Worker

Worker opens route → reaches location → confirms waste pickup → points are awarded.

### 3:40–4:20 — Community Problem

Several residents report the same dumping location.

System identifies a hotspot.

### 4:20–4:45 — Manager

Manager approves community bin / awareness board deployment.

### 4:45–5:00 — Impact

Show dashboard metrics and finish with:

**“From individual waste requests to smarter community-wide waste management.”**

---

## 20. Hackathon Requirement Mapping

Theme: **Earth Forward**

Environmental problem:
Inefficient waste collection and community waste accumulation.

Technology solution:
Web application + backend + geographic clustering + route optimization + community reporting + rewards.

Meaningful environmental impact:
Less unnecessary travel, better waste collection, fewer dumping hotspots, and improved community participation.

Repository:
Submit the source-code repository.

Live application:
Submit the deployed frontend URL if available.

Video:
Submit a demo/pitch of maximum 5 minutes.

Old project:
If this project existed before the hackathon, clearly state what was already built before the hackathon and what was newly built during the hackathon.

---

## 21. Suggested Project Name

Primary:

**Earth Forward — Smart Waste Collection**

Alternative names:

- CleanRoute
- TrashFlow
- EcoRoute
- CleanCircle
- WasteWise
- GreenPickup
