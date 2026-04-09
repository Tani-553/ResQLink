# Render Backend Deployment

## Service settings

- Service type: `Web Service`
- Root directory: `smart-disaster-coordination`
- Build command: `npm install`
- Start command: `npm start`

## Required environment variables

- `NODE_ENV=production`
- `PORT=10000`
- `MONGO_URI=<your MongoDB Atlas URI>`
- `JWT_SECRET=<strong secret>`
- `JWT_EXPIRE=7d`
- `CLIENT_URL=<frontend origin>`
- `FIREBASE_PROJECT_ID=<optional>`
- `FIREBASE_PRIVATE_KEY=<optional>`
- `FIREBASE_CLIENT_EMAIL=<optional>`
- `FIREBASE_DATABASE_URL=<optional>`
- `VAPID_PUBLIC_KEY=<optional>`
- `VAPID_PRIVATE_KEY=<optional>`
- `VAPID_MAILTO=<optional>`

## Health check

- Path: `/api/health`

## Post-deploy smoke test

1. Open `/api/health` and confirm the API returns `status: OK`.
2. Register a test victim and volunteer through `/api/auth/register`.
3. Update volunteer GPS with `/api/auth/update-location`.
4. Create a victim SOS request and confirm `/api/requests/nearby` returns it.
5. Verify admin routes with `/api/admin/dashboard`.

## Notes

- The backend already exposes Socket.io on the same service process.
- File uploads are stored locally under `uploads/`, so persistent object storage should be added for production-grade NGO document handling.
