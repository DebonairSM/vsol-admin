# ngrok Tunnel URLs

## Current Tunnels

### API Tunnel (Port 2020)
- **Public URL**: `https://b5986cf8c3fe.ngrok-free.app`
- **Local Target**: `http://localhost:2020`
- **Status**: Running

### Web Tunnel (Port 5173)
- **Status**: Not started (see instructions below)

## Configuration

To use these ngrok URLs, update your environment variables:

### `apps/api/.env`
```
CORS_ORIGIN=https://YOUR-WEB-NGROK-URL.ngrok-free.app
```

### `apps/web/.env`
```
VITE_API_URL=https://b5986cf8c3fe.ngrok-free.app/api
```

Replace `YOUR-WEB-NGROK-URL` with the web tunnel URL once started.

## Starting Web Tunnel

To start the web tunnel for the frontend:

1. Open a new terminal window
2. Run: `ngrok http 5173`
3. Copy the HTTPS URL from the ngrok output (e.g., `https://xxxxx.ngrok-free.app`)
4. Update `apps/api/.env` with `CORS_ORIGIN=https://xxxxx.ngrok-free.app`
5. Update `apps/web/.env` with `VITE_API_URL=https://b5986cf8c3fe.ngrok-free.app/api`
6. Restart both servers

## Access

- **API Health Check**: https://b5986cf8c3fe.ngrok-free.app/health
- **Frontend**: Use the web tunnel URL once started

## Notes

- ngrok free tier requires browser verification on first access
- Tunnel URLs change when ngrok is restarted (unless using reserved domains)
- Both servers must be running for the tunnels to work

