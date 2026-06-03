# nginx-fail2ban-stack

A production-ready containerized stack with a Node.js REST API behind Nginx reverse proxy, rate limiting, and Fail2ban auto-banning — tested on a real cloud server.

## Stack

```
Internet
    ↓
DOCKER-USER iptables chain  ←  Fail2ban bans land here
    ↓
Nginx  (reverse proxy + rate limiting → 429)
    ↓
Node.js API  (internal only, not exposed)
```

| Service | Image | Role |
|---|---|---|
| `api` | custom build | Node.js REST API on port 3000 (internal) |
| `nginx` | nginx:alpine | Reverse proxy, rate limiting, access logging |
| `fail2ban` | crazymax/fail2ban | Reads Nginx logs, bans abusive IPs via iptables |

## Features

- Node.js API is not directly reachable from outside — only through Nginx
- Rate limiting: 1 req/s per IP, burst of 5, returns `429 Too Many Requests`
- Real client IP logging via `map` directive (handles `X-Forwarded-For`)
- Fail2ban monitors access.log and bans IPs that trigger 10+ rate limit violations
- Ban rules injected into `DOCKER-USER` chain — works correctly with Docker networking
- Health check endpoint with automatic container restart on failure
- Non-root user inside the Node container

## Project structure

```
.
├── docker-compose.yml
├── Dockerfile
├── server.js
├── package.json
├── package-lock.json
├── nginx.conf
├── jail.local
├── fail2ban/
│   └── filter.d/
│       └── nginx-limit-req.conf
└── logs/               # created automatically, gitignored
```

## Requirements

- Docker Engine 24+
- Docker Compose v2+
- Linux host (for iptables / Fail2ban to work at network level)
- Port 80 open in your firewall / cloud security group

## Quick start

```bash
git https://github.com/Amin-Shahamiri/nginx-fail2ban-stack
cd nginx-fail2ban-stack

# Create logs directory
mkdir -p logs

# Start the stack
docker compose up -d

# Verify all containers are running
docker ps
```

The API will be available at `http://your-server-ip/api/health`

## API endpoints

| Method | Endpoint | Response |
|---|---|---|
| GET | `/` | `{"message":"Welcome to the API"}` |
| GET | `/api/health` | `{"status":"ok","timestamp":"..."}` |

## Configuration

### Rate limiting

Edit `nginx.conf` to adjust the rate limit:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=1r/s;
```

And the burst in the location block:

```nginx
limit_req zone=api_limit burst=5 nodelay;
```

### Fail2ban

Edit `jail.local` to adjust ban behavior:

```ini
bantime  = 3600   # how long to ban (seconds)
findtime = 60     # detection window (seconds)
maxretry = 10     # failures before ban
```

### App port

The Node app reads `APP_PORT` from environment. Default is `3000`.
Set it in `docker-compose.yml` under the `api` service environment.

## Monitoring

```bash
# View all running containers
docker ps

# Check Fail2ban jail status
docker exec fail2ban fail2ban-client status nginx-limit-req

# View currently banned IPs in iptables
sudo iptables -L f2b-nginx-limit -n -v

# Watch ban activity live
watch -n 1 'sudo iptables -L f2b-nginx-limit -n -v'

# Tail Nginx access log
tail -f logs/access.log

# Tail Fail2ban activity
docker logs fail2ban -f
```

## Manual ban / unban

```bash
# Ban an IP manually
docker exec fail2ban fail2ban-client set nginx-limit-req banip 1.2.3.4

# Unban an IP
docker exec fail2ban fail2ban-client set nginx-limit-req unbanip 1.2.3.4
```

## Important notes

**Fail2ban requires a Linux host with real iptables.**
On Docker Desktop (Mac/Windows), the ban rules are applied inside Docker Desktop's Linux VM — they will not block traffic at the host network level. Deploy to a real Linux server (Ubuntu, AlmaLinux, Debian, etc.) for full functionality.

**Add your own IP to ignoreip in jail.local before deploying** to avoid accidentally banning yourself:

```ini
ignoreip = 127.0.0.1/8 ::1 YOUR.STATIC.IP.HERE
```

**Cloud providers have two firewall layers.**
If you are on Oracle Cloud, AWS, or similar, make sure port 80 is open in the cloud-level security group/security list, not just the OS firewall.

## How it was built

This project was built step by step as part of a DevOps learning roadmap covering:

- Docker multi-stage builds and production Dockerfile best practices
- Docker Compose service dependencies and health checks
- Nginx reverse proxy, rate limiting, and real IP logging
- Fail2ban filter writing and iptables chain targeting for Docker

## License

MIT
