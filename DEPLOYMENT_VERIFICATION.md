# ReliefNet Production Deployment Verification Checklist

This document tracks items that require actual deployment environment to verify. These cannot be fully tested in CI/local development.

---

## ✅ Already Verified (CI/Local)

| Item | Status | Verification Method |
|------|--------|---------------------|
| Token version invalidation logic | ✅ | 14 unit tests pass |
| Rate limiter configuration | ✅ | Code review + lint |
| Redis fallback logic | ✅ | Code review |
| Enum compatibility (7 categories, 8 units) | ✅ | Model validation |
| Emoji removal | ✅ | Build + lint |
| Duplicate password validation removed | ✅ | Code review |
| Docker healthcheck (wget) | ✅ | Dockerfile syntax |
| Nginx CSP config | ✅ | nginx.conf syntax |
| CSS @import order | ✅ | Build passes |
| CategoryIcon component | ✅ | Build passes |
| Server lint | ✅ | 0 errors, 0 warnings |
| Server tests | ✅ | 23/23 pass |
| Client build | ✅ | Vite build succeeds |
| **Client bundle size (code-splitting)** | ✅ | **Main bundle 263KB (was 788KB), pages lazy-loaded** |

---

## 🔄 Requires Production Deployment

### 1. Token Version Invalidation Flow (End-to-End)

**Status: Unit tests complete (14 tests). Integration test requires deployed environment.**

**What to test:**
- User registers → gets access token with `tokenVersion: 0`
- User logs in → gets new access token with `tokenVersion: 0`
- Access token works for `/api/auth/me`
- Refresh token rotation works (new access token issued)
- **Critical:** Simulate token reuse → old refresh token rejected, `tokenVersion` incremented
- **Critical:** Old access token rejected after `tokenVersion` increment (401 with "Token invalidated. Please login again.")
- Logout invalidates refresh token
- Access token still works until expiry (15 min) after logout

**Test commands:**
```bash
# 1. Register
curl -X POST http://api.reliefnet.org/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"SecurePass123!","role":"coordinator"}'

# 2. Login (get accessToken + refreshToken cookie)
curl -X POST http://api.reliefnet.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}' \
  -c cookies.txt

# 3. Use access token
curl -X GET http://api.reliefnet.org/api/auth/me \
  -H "Authorization: Bearer <accessToken>"

# 4. Refresh token
curl -X POST http://api.reliefnet.org/api/auth/refresh \
  -b cookies.txt

# 5. Simulate token reuse (manually call refresh with old token)
# Should get 401 "Invalid refresh token - possible token reuse detected"

# 6. Verify old access token rejected after reuse
# Should get 401 "Token invalidated. Please login again."
```

**Expected headers in response:**
- `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Lax`

---

### 2. Rate Limiter Behavior Under Load (Valkey Cluster)

**Status: Code complete with Valkey + memory fallback. Load testing requires deployed environment.**

**What to test:**
- Valkey connection established on startup
- Rate limits shared across multiple backend instances
- Fallback to memory store when Valkey unavailable
- Graceful shutdown closes Valkey connection
- Rate limit headers present: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

**Test setup:**
```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - REDIS_URL=redis://valkey-cluster:6379
      - REDIS_REQUIRED=true
  valkey-cluster:
    image: valkey/valkey:7-alpine
    command: valkey-server --cluster-enabled yes
```

**Test commands:**
```bash
# Start 3 backend instances
docker-compose -f docker-compose.prod.yml up --scale backend=3

# Test rate limiting from multiple IPs
for i in {1..10}; do
  curl -I http://api.reliefnet.org/api/auth/login \
    -H "X-Forwarded-For: 192.168.1.$i" \
    -X POST -d '{"email":"test","password":"test"}'
done

# Check rate limit headers
curl -I http://api.reliefnet.org/api/auth/login \
  -X POST -d '{"email":"test","password":"test"}'

# Expected headers:
# RateLimit-Limit: 5
# RateLimit-Remaining: 4
# RateLimit-Reset: <timestamp>
```

**Verify Valkey fallback:**
```bash
# Stop Valkey
docker stop valkey-cluster

# Requests should still work (memory fallback)
curl -X POST http://api.reliefnet.org/api/auth/login \
  -d '{"email":"test","password":"test"}'

# Logs should show: "Rate limiter: Valkey unavailable, falling back to memory store"
```

**Verify graceful shutdown:**
```bash
# Stop backend
docker-compose -f docker-compose.prod.yml stop backend

# Check logs for: "Rate limiters shut down"
```

---

### 3. Production Nginx Config with Real Domain

**What to test:**
- CSP allows WebSocket connections to production domain
- HTTPS enforced (HSTS)
- Security headers present
- Static asset caching works
- API proxy works
- WebSocket proxy works

**Production nginx.conf changes needed:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.reliefnet.org;
    
    ssl_certificate /etc/letsencrypt/live/api.reliefnet.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.reliefnet.org/privkey.pem;
    
    # CSP for production - allow WSS to actual domain
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self' wss://api.reliefnet.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";
    
    # ... rest of config
}
```

**Test commands:**
```bash
# Check CSP header
curl -I https://api.reliefnet.org/
# Should have: content-security-policy: default-src 'self' ... connect-src 'self' wss://api.reliefnet.org ...

# Check HSTS
curl -I https://api.reliefnet.org/
# Should have: strict-transport-security: max-age=31536000; includeSubDomains; preload

# Check static asset caching
curl -I https://api.reliefnet.org/assets/index-*.js
# Should have: cache-control: public, immutable; expires: <1 year>

# Check API proxy
curl -I https://api.reliefnet.org/api/health
# Should return 200 from backend

# Check WebSocket upgrade
curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  https://api.reliefnet.org/socket.io/
# Should return 101 Switching Protocols
```

---

### 4. WebSocket Connection Through Nginx Proxy

**What to test:**
- Socket.IO connection establishes through nginx
- WebSocket frames pass through correctly
- Reconnection works after network interruption
- Multiple tabs/sessions work
- Events emit/receive correctly

**Test commands:**
```bash
# Using wscat or similar
wscat -c wss://api.reliefnet.org/socket.io/?EIO=4&transport=websocket

# Should see:
# Connected to wss://api.reliefnet.org/socket.io/?EIO=4&transport=websocket
# < 0{"sid":"...","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000}
# < 40{"sid":"..."}

# Test event emission
> 42["joinCamp",{"campId":"..."}]
< 42["campJoined",{"campId":"..."}]

# Test reconnection
# Kill network temporarily, verify auto-reconnect
```

**Browser console test:**
```javascript
// In browser devtools on production site
const socket = io('https://api.reliefnet.org');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('joinCamp', { campId: '...' });
});

socket.on('campJoined', (data) => {
  console.log('Joined camp:', data);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});
```

---

## 📋 Pre-Deployment Checklist

| Item | Done? | Notes |
|------|-------|-------|
| JWT secrets rotated for production | ☐ | `JWT_SECRET`, `JWT_REFRESH_SECRET` |
|| `REDIS_REQUIRED=true` in production | ☐ | |
|| `REDIS_URL` points to production Valkey cluster | ☐ | |
| `NODE_ENV=production` | ☐ | |
| SSL certificates installed | ☐ | Let's Encrypt or similar |
| Domain DNS configured | ☐ | `api.reliefnet.org` |
| CSP updated for production domain | ☐ | `connect-src wss://api.reliefnet.org` |
| Rate limiter `REDIS_REQUIRED=true` | ☐ | |
| Health checks configured in orchestrator | ☐ | Kubernetes/Docker Swarm |
| Log aggregation configured | ☐ | ELK/Datadog/CloudWatch |
| Monitoring alerts for rate limiter | ☐ | Redis down, rate limit exceeded |
| Backup strategy for PostgreSQL/Redis | ☐ | |

---

## 🚀 Post-Deployment Verification

Run these commands after deployment:

```bash
# 1. Health checks
curl https://api.reliefnet.org/health
curl https://api.reliefnet.org/api/health

# 2. Auth flow
./scripts/test-auth-flow.sh

# 3. Rate limiting
./scripts/test-rate-limits.sh

# 4. WebSocket
./scripts/test-websocket.sh

# 4. Full integration
./scripts/test-full-flow.sh
```

---

## 📝 Notes for Future Iterations

1. **Token version unit tests** - 14 tests passing, covers core logic
2. **Integration tests** - Need Valkey + multiple backend instances (not available in CI)
3. **Load testing** - Use k6 or Artillery for rate limiter validation
4. **Chaos engineering** - Test Valkey failover, network partitions
5. **Security audit** - Run OWASP ZAP or similar on production
6. **Client bundle optimization** - Main bundle 263KB, pages lazy-loaded. Consider further splitting if needed.

---

*Last updated: 2026-11-09*
*All CI-verified items passing. Production items require deployment.*