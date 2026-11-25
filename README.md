# ReliefNet - Aid Precisely Delivered

A real-time relief coordination platform that matches supply surplus at one relief camp with unmet demand at another, and recommends optimal delivery routes to move aid efficiently during disaster response.

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS + shadcn/ui components
- Leaflet.js / React-Leaflet for maps
- Zustand for state management
- Socket.IO client for real-time updates

### Backend
- Node.js + Express.js
- PostgreSQL + Sequelize
- Socket.IO for WebSocket
- JWT authentication
- OSRM (Open Source Routing Machine) for routing

### DevOps
- Docker + docker-compose
- PostgreSQL / Local PostgreSQL
- GitHub Actions CI

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Using Docker (Recommended)

1. Clone and navigate to the project:
```bash
cd ReliefNet
```

2. Copy environment files:
```bash
cp server/.env.example server/.env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- OSRM Routing: http://localhost:5000

### Local Development

1. Install dependencies:
```bash
cd server && npm install
cd ../client && npm install
```

2. Start PostgreSQL and Redis (using Docker):
```bash
docker-compose up -d postgres redis osrm
```

3. Configure environment:
```bash
cp server/.env.example server/.env
# Edit server/.env with your settings
```

4. Start development servers:
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

## Project Structure

```
ReliefNet/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand stores
│   │   ├── services/      # API & Socket services
│   │   └── hooks/         # Custom hooks
│   └── package.json
│
├── server/                 # Node/Express backend
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Auth, error handling
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## API Endpoints
## (Done in Postman)
### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Camps
- `GET /api/camps` - List camps
- `POST /api/camps` - Create camp (admin)
- `GET /api/camps/:id` - Get camp details
- `PATCH /api/camps/:id` - Update camp
- `DELETE /api/camps/:id` - Delete camp (admin)
- `GET /api/camps/nearby?lat=&lng=&radius=` - Find nearby camps

### Inventory
- `GET /api/inventory` - List inventory items
- `GET /api/inventory/camp/:campId` - Get camp inventory (grouped)
- `POST /api/inventory` - Create inventory item
- `POST /api/inventory/camp/:campId/bulk` - Bulk update
- `PATCH /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `GET /api/inventory/summary` - Inventory summary stats

### Requests
- `GET /api/requests` - List requests
- `POST /api/requests` - Create request
- `GET /api/requests/:id` - Get request details
- `PATCH /api/requests/:id` - Update request
- `POST /api/requests/:id/cancel` - Cancel request
- `GET /api/requests/stats` - Request statistics

### Transfers
- `GET /api/transfers` - List transfers
- `GET /api/transfers/:id` - Get transfer details
- `POST /api/transfers/:id/assign` - Assign driver (dispatcher)
- `PATCH /api/transfers/:id/status` - Update status
- `DELETE /api/transfers/:id` - Delete transfer (admin)
- `GET /api/transfers/stats` - Transfer statistics

## Real-time Events (Socket.IO)

### Client → Server
- `joinCamp(campId)` - Join camp room
- `leaveCamp(campId)` - Leave camp room

### Server → Client
- `inventory:updated` - Inventory changed
- `request:created` - New request
- `request:updated` - Request updated
- `transfer:created` - New transfer proposed
- `transfer:updated` - Transfer status changed
- `match:found` - New supply-demand match
- `stats:updated` - Dashboard stats updated

## User Roles

| Role        | Permissions                                       |
|------|----------------------------------------------------------|
| Coordinator | Manage own camp inventory, create requests        |
| Dispatcher  | View all transfers, assign drivers, update status |
| Admin       | Full access, manage camps/users, system config    |

## Matching Algorithm

The matching engine runs every 5 minutes (configurable via cron) and:

1. Finds all open/partial requests
2. For each request, finds camps with surplus of the same item
3. Scores matches by: `urgency_weight * quantity_factor / distance_factor`
4. Creates transfer proposals for best matches
5. Emits real-time events for new matches

## Routing

- Primary: OSRM (self-hosted via Docker)
- Fallback: Haversine distance calculation
- Supports: Driving routes with geometry

## Environment Variables

See `server/.env.example` for all options:

```env
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:***@localhost:5432/reliefnet
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
OSRM_URL=http://localhost:5000
```

## Development

### Running Tests
```bash
cd server && npm test
cd client && npm test
```

### Linting
```bash
cd server && npm run lint
cd client && npm run lint
```

### Building for Production
```bash
cd client && npm run build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## License

MIT