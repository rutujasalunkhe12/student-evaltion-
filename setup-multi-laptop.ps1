#!/usr/bin/env pwsh

# Multi-Laptop Setup Script for Student Evaluation System
# This script helps you set up the system for local network access

$ErrorActionPreference = "Stop"

function Get-PreferredIPv4Address {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Select-Object -ExpandProperty IPAddress

    foreach ($candidate in $candidates) {
        if ($candidate -match "^10\." -or
            $candidate -match "^192\.168\." -or
            $candidate -match "^172\.(1[6-9]|2[0-9]|3[0-1])\.") {
            return $candidate
        }
    }

    if ($candidates.Count -gt 0) {
        return $candidates[0]
    }

    return $null
}

function Backup-IfExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (Test-Path $Path) {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupPath = "$Path.$timestamp.bak"
        Copy-Item $Path $backupPath -Force
        Write-Host "Backed up $Path -> $backupPath" -ForegroundColor Yellow
    }
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Student Evaluation System Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Ensure commands run from repository root regardless of caller location.
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

# Get local IP address
$ip = Get-PreferredIPv4Address

if (-not $ip) {
    Write-Host "Could not auto-detect IP. Please enter your laptop's IP address:" -ForegroundColor Yellow
    $ip = Read-Host "IP Address"
}

while (-not ($ip -as [ipaddress])) {
    Write-Host "Invalid IP address format. Try again (example: 192.168.1.100)." -ForegroundColor Red
    $ip = Read-Host "IP Address"
}

Write-Host "Your Server IP: $ip" -ForegroundColor Green
Write-Host ""
Write-Host "Access from other laptops at:" -ForegroundColor Green
Write-Host "  Frontend: http://$ip`:3000" -ForegroundColor Cyan
Write-Host "  API: http://$ip`:3001" -ForegroundColor Cyan
Write-Host ""

# API server reads from root .env (see artifacts/api-server/src/index.ts)
$rootEnvPath = Join-Path $scriptRoot ".env"
$rootEnvContent = @"
## API
# Postgres connection string (for production)
DATABASE_URL=postgresql://postgres:password@localhost:5432/eval_portal
# Port the API listens on
PORT=3001

## Optional
SESSION_SECRET=change-me
"@

Backup-IfExists -Path $rootEnvPath
$rootEnvContent | Set-Content $rootEnvPath -Encoding UTF8
Write-Host "Root .env configured for API server ✓" -ForegroundColor Green
Write-Host ""

# Frontend reads env from artifacts/eval-portal/.env.local
$portalEnvPath = Join-Path $scriptRoot "artifacts/eval-portal/.env.local"
$portalEnvContent = @"
VITE_API_BASE_URL=http://$ip`:3001
"@

Backup-IfExists -Path $portalEnvPath
$portalEnvContent | Set-Content $portalEnvPath -Encoding UTF8
Write-Host "Frontend env configured at artifacts/eval-portal/.env.local ✓" -ForegroundColor Green
Write-Host ""

# Check if Node.js and npm are installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required but was not found. Install Node.js (LTS) and rerun this script."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is required but was not found. Install Node.js (which includes npm) and rerun this script."
}

# Check if pnpm is installed
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "pnpm not found. Installing with npm..." -ForegroundColor Yellow
    npm install -g pnpm
}

Write-Host "Installing dependencies (if needed)..." -ForegroundColor Cyan
pnpm install
Write-Host ""

Write-Host "Starting API + Frontend together..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow
pnpm dev

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access from other laptops:" -ForegroundColor Green
Write-Host "  http://$ip`:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "If others cannot connect, allow Node.js through Windows Firewall (Private network)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Login:" -ForegroundColor Green
Write-Host "  Guide: guide1 / password123" -ForegroundColor White
Write-Host "  Student: CS2021001 / password123" -ForegroundColor White
