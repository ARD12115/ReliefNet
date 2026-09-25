# ReliefNet — Product Requirements Document (PRD)

**Tagline:** Aid, precisely delivered.

---

## 1. Overview

ReliefNet is a real-time relief coordination platform that matches supply surplus at one relief camp with unmet demand at another, and recommends optimal delivery routes to move aid efficiently during disaster response.

## 2. Problem Statement

During disasters (floods, earthquakes, humanitarian crises), relief camps often operate in isolation:
- Camps don't know what nearby camps have in surplus or shortage.
- Coordinators lack visibility into real-time inventory across the network.
- Aid movement relies on manual phone calls / guesswork instead of optimized routing.
- Result: wasted resources, delayed aid, preventable suffering.

## 3. Goals

| Goal | Success Metric |
|---|---|
| Real-time visibility into camp inventory | All camps update stock within 15 min of change |
| Automated supply-demand matching | System surfaces matches within seconds of a new request |
| Efficient routing of aid | Suggested route is within 10% of shortest-path optimum |
| Usable by non-technical field staff | Task completed in <2 min without training |

## 4. Target Users

- **Camp Coordinators** — log inventory, raise requirement requests
- **Dispatch/Logistics Team** — view prioritized transfer recommendations, mark deliveries complete
- **NGO/Admin Command Center** — monitor the full network, view analytics, manage camps/users

## 5. Core Features (MVP Scope)

1. **Camp Registration & Inventory Management**
   - Add/edit camp profile (location, capacity, contact)
   - Log current stock by category (food, water, medicine, shelter, other)
2. **Need/Request Reporting**
   - Camp raises a request with item, quantity, urgency level
3. **Supply-Demand Matching Engine**
   - Detects surplus vs. shortage across camps for the same item category
   - Ranks matches by urgency + distance
4. **Route Optimization**
   - Given a matched pair of camps, compute shortest/fastest route
   - Account for road/accessibility status if available
5. **Dispatch Dashboard**
   - Prioritized action list: what to move, from → to, urgency, ETA
   - Mark transfer as "in transit" / "delivered"
6. **Real-Time Updates**
   - Inventory and request changes reflect across the system without manual refresh
7. **Basic Analytics (Admin)**
   - Camps by status, total aid moved, average response time

## 6. Out of Scope (MVP)

- Live GPS tracking of vehicles (future phase)
- SMS/offline-first sync for no-connectivity zones (future phase)
- Multi-language support
- Payment/procurement integration

## 7. User Flows (Summary)

**Flow A — Reporting a shortage**
Camp Coordinator logs in → selects camp → adds request (item, qty, urgency) → system flags it as an open need.

**Flow B — Matching & dispatch**
System detects a camp with surplus of the same item → generates a match → computes route → surfaces to Dispatch dashboard → dispatcher assigns a vehicle/team → marks in transit → marks delivered → both camps' inventories auto-update.

## 8. Non-Functional Requirements

- **Real-time**: updates propagate in <5 seconds (WebSocket-based)
- **Reliability**: system should degrade gracefully if map/routing API is unavailable (fallback to straight-line distance)
- **Scalability**: support at least 200 concurrent camps for MVP/demo scale
- **Usability**: mobile-responsive, works on low-end Android devices
- **Security**: role-based access (Coordinator / Dispatcher / Admin)

## 9. Milestones (Suggested for a mini project timeline)

1. Week 1–2: Requirements, DB schema, wireframes
2. Week 3–4: Auth + Camp/Inventory CRUD
3. Week 5–6: Matching engine + basic routing
4. Week 7: Dispatch dashboard + real-time updates
5. Week 8: Testing, polish, demo prep

## 10. Open Questions

- Which routing provider will be used (Google Maps API, OSRM self-hosted, or Leaflet + OSM)?
- Will urgency levels be manually set or auto-derived from stock-to-population ratio?
- Should the demo use simulated camp data or real test users?
