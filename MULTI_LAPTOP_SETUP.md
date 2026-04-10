# Multi-Laptop Setup Guide

Run the Student Evaluation System across multiple laptops. Choose the approach that fits your needs.

---

## **Option 1: Local Network Setup (Recommended for LAN)**

Perfect for students/staff on the same WiFi or network.

### Step 1: Identify Server Laptop IP

**On the server laptop (where API + Frontend run):**

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" (typically `192.168.x.x` or `10.0.x.x`)

**Mac/Linux:**
```bash
ifconfig
```
Look for `inet` address

**Example:** `192.168.1.100`

### Step 2: Start API Server on Server Laptop

```bash
cd Student-Evaluation-System
pnpm --filter @workspace/api-server dev
```

API runs on: `http://192.168.1.100:3001`

### Step 3: Configure Frontend for Network Access

**On the server laptop**, before starting frontend:

Edit `.env` or create it:
```
VITE_API_BASE_URL=http://192.168.1.100:3001
```

Or set it via environment variable (PowerShell):
```powershell
$env:VITE_API_BASE_URL = "http://192.168.1.100:3001"
```

### Step 4: Start Frontend on Server Laptop

```bash
pnpm --filter @workspace/eval-portal dev
```

Frontend runs on: `http://192.168.1.100:3000`

### Step 5: Access from Other Laptops

**On other laptops, open browser:**
```
http://192.168.1.100:3000
```

**Login credentials:**
- Guide: `guide1` / `password123`
- Student: `CS2021001` / `password123`

### Troubleshooting Local Network

**Can't connect from other laptop?**

1. **Check firewall** - Allow ports 3000, 3001 through Windows Firewall:
   - Windows: Settings → Privacy & Security → Firewall → Allow apps through firewall
   - Enable "Private" for Node.js

2. **Verify IP is correct** - Run on server:
   ```powershell
   ipconfig | findstr "IPv4"
   ```

3. **Test connectivity** - From another laptop:
   ```
   ping 192.168.1.100
   ```

4. **Check both servers running:**
   - Terminal 1: API on port 3001
   - Terminal 2: Frontend on port 3000

---

## **Option 2: Cloud Deployment (Internet Access)**

Deploy to cloud platforms for access from anywhere (requires internet).

### 2A: Deploy API + Database to Render

1. **Create Render account:** https://render.com
2. **Connect GitHub repo** to Render
3. **Create blueprint deployment** using `render.yaml`:
   - Render auto-provisions PostgreSQL + Node API
4. **Note the API URL:** `https://your-api-name.onrender.com`

### 2B: Deploy Frontend to Vercel

1. **Create Vercel account:** https://vercel.com
2. **Import repository** and select `artifacts/eval-portal`
3. **Add environment variable:**
   ```
   VITE_API_BASE_URL=https://your-api-name.onrender.com
   ```
4. **Deploy** - Get frontend URL: `https://your-project.vercel.app`

### Access from Anywhere

Open in any browser:
```
https://your-project.vercel.app
```

---

## **Option 3: Hybrid Setup (Local API + Cloud Frontend)**

Run API locally, serve frontend from cloud.

1. Use ngrok to expose local API to internet:
   ```bash
   ngrok http 3001
   ```
   - Get public URL: `https://xxxx-xx-xxx-xxx.ngrok.io`

2. Deploy frontend to Vercel with:
   ```
   VITE_API_BASE_URL=https://xxxx-xx-xxx-xxx.ngrok.io
   ```

3. Access from anywhere via Vercel URL

---

## **Option 4: Docker Deployment (Production)**

Run on any machine with Docker installed.

### Create Docker Compose File

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: eval_portal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build:
      context: ./artifacts/api-server
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/eval_portal
      PORT: 3001
      SESSION_SECRET: your-secret-key
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  frontend:
    build:
      context: ./artifacts/eval-portal
    environment:
      VITE_API_BASE_URL: http://192.168.1.100:3001
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

### Run on Any Machine

```bash
docker-compose up
```

Access at: `http://192.168.1.100:3000`

---

## **Comparison Table**

| Approach | Setup Time | Internet | Cost | Best For |
|----------|-----------|----------|------|----------|
| Local Network | 5 min | No | Free | Same WiFi |
| Cloud (Render+Vercel) | 15 min | Yes | Free tier | Global access |
| Ngrok + Cloud | 10 min | Yes | Free tier | Quick demo |
| Docker | 20 min | Optional | Free | Production |

---

## **Production Checklist**

- [ ] Use PostgreSQL instead of mock DB
- [ ] Set `SESSION_SECRET` environment variable
- [ ] Enable HTTPS (cloud platforms do this)
- [ ] Set strong database password
- [ ] Configure CORS for allowed domains
- [ ] Set up regular database backups
- [ ] Monitor API health (`/api/healthz`)

---

## **Common Issues**

### API/Frontend on Different Machines?
Set `VITE_API_BASE_URL` to the API machine's IP:port

### Database Not Persisting?
Ensure PostgreSQL is running and `DATABASE_URL` is correct

### SSL Certificate Errors?
Use `http://` for local networks, HTTPS auto-works on cloud

### Port Already in Use?
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

---

For detailed cloud deployment, see [DEPLOY.md](./DEPLOY.md)
