# Analytics Quick Start Script
# Run this after installing Docker Desktop

Write-Host "🚀 Starting Analytics Infrastructure..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "1️⃣ Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Start services
Write-Host "2️⃣ Starting Redis and ClickHouse..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services started successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Wait for services to be ready
Write-Host "3️⃣ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check Redis
Write-Host "Checking Redis..." -ForegroundColor Cyan
docker exec timessea_redis redis-cli ping 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Redis is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️ Redis may not be ready yet" -ForegroundColor Yellow
}

# Check ClickHouse
Write-Host "Checking ClickHouse..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "http://localhost:8123" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "✅ ClickHouse is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️ ClickHouse may not be ready yet (wait 10-15 seconds)" -ForegroundColor Yellow
}
Write-Host ""

# Show running containers
Write-Host "4️⃣ Running containers:" -ForegroundColor Yellow
docker ps --filter "name=timessea" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Write-Host ""

# Instructions
Write-Host "🎉 Analytics infrastructure is starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 10-15 seconds for ClickHouse to initialize"
Write-Host "2. Run: npm run start:dev"
Write-Host "3. Check logs for: ✅ Redis connected / ✅ ClickHouse connected"
Write-Host ""
Write-Host "📊 Access:" -ForegroundColor Cyan
Write-Host "- Redis: localhost:6379"
Write-Host "- ClickHouse HTTP: http://localhost:8123"
Write-Host "- ClickHouse Native: localhost:9000"
Write-Host ""
Write-Host "📚 Read ANALYTICS_SETUP.md for full documentation" -ForegroundColor Yellow
