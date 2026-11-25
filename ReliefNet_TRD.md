# ReliefNet — Technical Requirements Document (TRD)

## 1. Tech Stack

### Frontend
- **React.js** (with Vite) — dashboard UI for coordinators/dispatchers/admin
- **Tailwind CSS** — styling
- **shadcn/ui** — component library
- **Leaflet.js** (or Google Maps JS SDK) — map visualization of camps & routes
- **Socket.IO client** — real-time updates
- **Zustand / Redux Toolkit** — state management

### Backend
- **Node.js + Express.js** — REST API server
- **Socket.IO** — WebSocket layer for real-time inventory/request updates
- **JWT (jsonwebtoken)** — authentication
- **bcrypt** — password hashing

### Database
- **PostgreSQL** (with Sequelize ORM) — relational schema for camps, inventory, requests
  - *Alternative:* PostgreSQL + PostGIS for strong geospatial querying
- **Redis** (optional) — caching active matches, pub/sub for real-time scaling

### Routing / Geospatial
- **OSRM (Open Source Routing Machine)** self-hosted, or **Google Directions API**
- **Turf.js** — geospatial calculations (distance, nearest-neighbor) if not using a full routing engine

### Matching Engine
- Custom Node.js service (or Python microservice using **FastAPI**) implementing:
  - Greedy/priority-queue matching (urgency + distance weighted score)
  - Optional: simple linear optimization via **Google OR-Tools** or **PuLP** (Python) for optimal assignment

### DevOps / Infra
- **Docker** + docker-compose for local dev (API, DB, OSRM)
- **GitHub Actions** — CI (lint, test)
- **Render / Railway / AWS EC2** — deployment (demo-scale)
- **PostgreSQL (managed)** — hosted DB (if not self-hosting)

### Testing
- **Jest** + **Supertest** (backend API tests)
- **React Testing Library** (frontend)

---

## 2. High-Level Architecture

```
[React Dashboard] <--HTTP/WS--> [Express API + Socket.IO] <---> [PostgreSQL]
                                        |
                                        |--> [Matching Engine Service]
                                        |--> [Routing Service (OSRM/Google Directions)]
```

- Client subscribes to camp/request channels over WebSocket for live updates.
- API layer handles CRUD for camps, inventory, requests.
- Matching engine runs on new request creation (or periodic cron) to detect surplus↔shortage pairs.
- Routing service is called per match to compute distance/ETA.

---

## 3. Suggested File Structure

```
reliefnet/
├── client/                        # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CampCard.jsx
│   │   │   ├── InventoryForm.jsx
│   │   │   ├── RequestForm.jsx
│   │   │   ├── DispatchTable.jsx
│   │   │   └── MapView.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── CoordinatorDashboard.jsx
│   │   │   ├── DispatchDashboard.jsx
│   │   │   └── AdminOverview.jsx
│   │   ├── store/                 # Zustand/Redux slices
│   │   ├── services/               # API + socket client wrappers
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/                        # Node/Express backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── models/
│   │   │   ├── Camp.js
│   │   │   ├── InventoryItem.js
│   │   │   ├── Request.js
│   │   │   ├── Transfer.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── camp.routes.js
│   │   │   ├── inventory.routes.js
│   │   │   ├── request.routes.js
│   │   │   └── transfer.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── camp.controller.js
│   │   │   ├── inventory.controller.js
│   │   │   ├── request.controller.js
│   │   │   └── transfer.controller.js
│   │   ├── services/
│   │   │   ├── matching.service.js   # supply-demand matching logic
│   │   │   ├── routing.service.js    # calls OSRM/Google Directions
│   │   │   └── socket.service.js     # emits real-time events
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── error.middleware.js
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml
├── README.md
└── .github/workflows/ci.yml
```

---

## 4. Core Data Models (Simplified)

**Camp**
```
{
  name, location: { lat, lng }, capacity,
  contactPerson, contactPhone, status
}
```

**InventoryItem**
```
{
  campId, category (food|water|medicine|shelter|other),
  itemName, quantity, unit, lastUpdated
}
```

**Request**
```
{
  campId, itemCategory, itemName, quantityNeeded,
  urgency (low|medium|high|critical), status (open|matched|fulfilled),
  createdAt
}
```

**Transfer**
```
{
  fromCampId, toCampId, requestId, itemName, quantity,
  routeDistanceKm, etaMinutes,
  status (proposed|assigned|in_transit|delivered),
  createdAt, updatedAt
}
```

---

## 5. Dependency List

### Backend (`server/package.json`)
```
express
pg
sequelize
socket.io
jsonwebtoken
bcryptjs
dotenv
cors
helmet
express-validator
axios              # for calling routing APIs
node-cron          # periodic matching runs (optional)

# dev
nodemon
jest
supertest
eslint
```

### Frontend (`client/package.json`)
```
react
react-dom
react-router-dom
vite
tailwindcss
zustand              # or @reduxjs/toolkit + react-redux
socket.io-client
axios
leaflet
react-leaflet
@shadcn/ui (via CLI)
lucide-react

# dev
@vitejs/plugin-react
eslint
prettier
```

### Optional Python Microservice (if using OR-Tools for optimal matching)
```
fastapi
uvicorn
ortools
pydantic
```

### Infra
```
docker
docker-compose
osrm-backend (Docker image, if self-hosting routing)
```

---

## 6. Key Algorithms (Notes)

- **Matching:** For each open `Request`, find camps with surplus of the same item (`quantity - safety_threshold > 0`), score candidates by `(urgency_weight * urgency) + (1 / distance)`, pick top match.
- **Routing:** Call OSRM `/route/v1/driving/{lng1},{lat1};{lng2},{lat2}` → get distance/duration; fallback to Haversine distance via Turf.js if routing service is down.
- **Real-time propagation:** On inventory/request/transfer change, emit Socket.IO event scoped to relevant camp/admin rooms so dashboards update without polling.

---

## 7. Security Considerations

- Role-based access control: `coordinator`, `dispatcher`, `admin`
- JWT with short expiry + refresh token
- Input validation on all POST/PUT routes (express-validator)
- Rate limiting on auth endpoints
