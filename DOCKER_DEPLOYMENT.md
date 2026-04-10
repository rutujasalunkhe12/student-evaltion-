# Docker Deployment Guide

Deploy the Student Evaluation System using Docker on any machine.

## Prerequisites

- **Docker**: https://www.docker.com/products/docker-desktop
- **Docker Compose**: Usually included with Docker Desktop

## Quick Start

### 1. Install Docker

**Windows/Mac:**
1. Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install and start Docker Desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Deploy with Docker Compose

```bash
# Navigate to project root
cd Student-Evaluation-System

# Start all services
docker-compose up

# Or run in background
docker-compose up -d
```

**You'll see:**
```
✓ PostgreSQL database running on port 5432
✓ API server running on port 3001
✓ Frontend running on port 3000
```

### 3. Access the Application

**Local machine:**
```
http://localhost:3000
```

**From other machine on same network:**
```
http://<YOUR_SERVER_IP>:3000
```

**Login:**
- Guide: `guide1` / `password123`
- Student: `CS2021001` / `password123`

---

## Docker Commands

### Start Services
```bash
# Start in foreground (see logs)
docker-compose up

# Start in background
docker-compose up -d
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Execute Commands Inside Container
```bash
# Open API container shell
docker-compose exec api sh

# Run database command
docker-compose exec postgres psql -U postgres -d eval_portal
```

### Rebuild Services
```bash
# Rebuild images after code changes
docker-compose build

# Rebuild and start
docker-compose up --build
```

---

## Configuration

### Environment Variables

Edit `docker-compose.yml` to customize:

```yaml
environment:
  NODE_ENV: production
  PORT: 3001
  SESSION_SECRET: your-secret-key-change-in-production
  DATABASE_URL: postgresql://postgres:password@postgres:5432/eval_portal
```

### Change Database Password
Edit `docker-compose.yml` under `postgres` service:
```yaml
POSTGRES_PASSWORD: your-new-password
```

Then update API's `DATABASE_URL`:
```yaml
DATABASE_URL: postgresql://postgres:your-new-password@postgres:5432/eval_portal
```

---

## Production Deployment

### On a VPS or Server

1. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

2. **Clone Repository:**
   ```bash
   git clone https://github.com/your-repo/Student-Evaluation-System.git
   cd Student-Evaluation-System
   ```

3. **Start Services:**
   ```bash
   docker-compose up -d
   ```

4. **Check Status:**
   ```bash
   docker-compose ps
   ```

### Nginx Reverse Proxy (Optional)

For production, use Nginx to proxy requests:

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d your-domain.com

# Renew automatically
sudo systemctl enable certbot.timer
```

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Stop conflicting service
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check database logs
docker-compose logs postgres

# Verify database is running
docker-compose ps
```

### API Returns 500 Errors
```bash
# Check API logs
docker-compose logs api

# Rebuild API image
docker-compose build api
docker-compose up api
```

### Frontend Can't Reach API
- Verify API is running: `http://localhost:3001/api/healthz`
- Check `VITE_API_BASE_URL` in frontend environment
- Check firewall allows port 3001

### Seed Database

```bash
# Access API container
docker-compose exec api sh

# Run seed command
curl -X POST http://localhost:3001/api/seed
```

---

## Scaling Across Multiple Machines

### Method 1: Shared Database

**On server machine:**
```bash
docker-compose up -d postgres
```

**On other machines:**
Update docker-compose.yml to reference server's database:
```yaml
DATABASE_URL: postgresql://postgres:password@server-ip:5432/eval_portal
```

Then start only API and frontend:
```bash
docker-compose up -d api frontend
```

### Method 2: Swarm or Kubernetes

For enterprise deployments with load balancing:
```bash
# Initialize Docker Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml eval-portal
```

---

## Performance Tips

1. **Use Alpine images** (already done - reduces image size)
2. **Limit container resources:**
   ```yaml
   api:
     deploy:
       resources:
         limits:
           cpus: '0.5'
           memory: 512M
   ```

3. **Enable log rotation:**
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

---

## Monitoring

### Health Checks
```bash
# API health
curl http://localhost:3001/api/healthz

# View container health
docker-compose ps
```

### View Resource Usage
```bash
docker stats
```

### Container Logs with Timestamps
```bash
docker-compose logs --timestamps
```

---

## Cleanup

### Remove Everything
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Also remove images
docker-compose down --rmi all
```

### Remove Unused Docker Resources
```bash
docker system prune
docker system prune -a  # More aggressive
```

---

For additional help, see [MULTI_LAPTOP_SETUP.md](./MULTI_LAPTOP_SETUP.md)
