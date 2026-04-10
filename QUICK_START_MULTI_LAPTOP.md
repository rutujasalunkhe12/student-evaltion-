# Quick Start: Multi-Laptop Setup

## 🚀 Fastest Way (Local Network, Same WiFi)

### On Server Laptop (Master Machine)

**1. Get Your IP Address**
```powershell
ipconfig
# Find "IPv4 Address" like 192.168.1.100
```

**2. Update .env**
```
VITE_API_BASE_URL=http://192.168.1.100:3001
```

**3. Start API (Terminal 1)**
```bash
pnpm --filter @workspace/api-server dev
```
✓ API runs on: `http://192.168.1.100:3001`

**4. Start Frontend (Terminal 2)**
```bash
pnpm --filter @workspace/eval-portal dev
```
✓ Frontend runs on: `http://192.168.1.100:3000`

### On Other Laptops

**Open browser:**
```
http://192.168.1.100:3000
```

**Login:**
- Guide: `guide1` / `password123`
- Student: `CS2021001` / `password123`

---

## 🌐 Cloud Deployment (Internet Access)

### Deploy API
Use **Render.com** with `render.yaml`:
1. Create Render account
2. Connect your GitHub repo
3. Deploy blueprint
4. Save API URL: `https://your-api.onrender.com`

### Deploy Frontend
Use **Vercel.com**:
1. Import repo
2. Set Root Directory: `artifacts/eval-portal`
3. Add env var: `VITE_API_BASE_URL=https://your-api.onrender.com`
4. Deploy

### Access Anywhere
```
https://your-project.vercel.app
```

---

## ⚙️ Auto-Setup Scripts

**Windows (PowerShell):**
```powershell
.\setup-multi-laptop.ps1
```

**Mac/Linux (Bash):**
```bash
bash setup-multi-laptop.sh
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect from other laptop | Check firewall (allow ports 3000, 3001) |
| Wrong API URL | Verify IP with `ipconfig` |
| Port already in use | Kill process: `lsof -ti:3001 \| xargs kill -9` |
| API 401 errors | Run seed: `POST http://IP:3001/api/seed` |

---

## 📚 More Info

- Full guide: [MULTI_LAPTOP_SETUP.md](./MULTI_LAPTOP_SETUP.md)
- Cloud deployment: [DEPLOY.md](./DEPLOY.md)
- Docker setup: See MULTI_LAPTOP_SETUP.md Option 4

---

## 💡 Setup Comparison

| Method | Setup Time | Free | Internet? | Best For |
|--------|-----------|------|-----------|----------|
| Local Network | 5 min | ✓ | ✗ | Classroom/Lab |
| Cloud (Render+Vercel) | 15 min | ✓ | ✓ | Remote access |
| Docker | 20 min | ✓ | ✓/✗ | Production |
