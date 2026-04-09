# Smart Disaster Coordination API (Member 2 Ownership)

Base URL: `http://localhost:5000/api`

## Authentication

### POST `/auth/register`
Register a user.

Request body:
```json
{
  "name": "Test User",
  "email": "user@test.com",
  "phone": "9000000000",
  "password": "Test@1234",
  "role": "victim"
}
```

### POST `/auth/login`
Login and receive JWT.

Request body:
```json
{
  "email": "user@test.com",
  "password": "Test@1234"
}
```

### GET `/auth/me`
Get current user profile.

Auth: `Bearer <token>`

### PUT `/auth/update-location`
Update current user GPS location.

Auth: `Bearer <token>`

Request body:
```json
{
  "longitude": 80.2707,
  "latitude": 13.0827
}
```

## Help Requests

### POST `/requests`
Victim creates SOS request with duplicate prevention and volunteer matching.

Auth: `victim`

Request body:
```json
{
  "type": "rescue",
  "description": "Flood victim trapped on rooftop",
  "longitude": 80.2707,
  "latitude": 13.0827,
  "address": "Zone 4, Chennai",
  "priority": "critical"
}
```

### GET `/requests/nearby?longitude=80.27&latitude=13.08&maxDistance=15000`
Get nearby pending requests.

Auth: `volunteer`, `ngo`

### GET `/requests/my`
Get victim's own requests.

Auth: `victim`

### GET `/requests/all?status=pending&type=rescue&page=1&limit=20`
Get all requests with filters.

Auth: `admin`

### PUT `/requests/:id/accept`
Volunteer accepts request.

Auth: `volunteer`

### PUT `/requests/:id/status`
Update request status.

Auth: `volunteer`, `ngo`, `admin`

Request body:
```json
{
  "status": "in-progress"
}
```

## Volunteers

### GET `/volunteers/active`
List all active volunteers.

Auth: `ngo`, `admin`

### GET `/volunteers/my-tasks`
Get volunteer assigned active tasks.

Auth: `volunteer`

## NGO

### POST `/ngo/register`
Create NGO profile with document upload.

Auth: `ngo`

Content type: `multipart/form-data`

Fields:
- `orgName` (string)
- `description` (string)
- `contactEmail` (string)
- `contactPhone` (string)
- `documents` (files, max 5)

### GET `/ngo/profile`
Get NGO profile.

Auth: `ngo`

### PUT `/ngo/resources`
Update NGO resources.

Auth: `ngo`

### POST `/ngo/assign-volunteer`
Assign volunteer and zone.

Auth: `ngo`

## Admin

### GET `/admin/dashboard`
Get system KPI stats.

Auth: `admin`

### GET `/admin/ngos?approved=false`
Get NGO verification queue.

Auth: `admin`

### PUT `/admin/ngos/:id/verify`
Approve or reject NGO.

Auth: `admin`

Request body:
```json
{
  "approved": true
}
```

### POST `/admin/broadcast`
Broadcast emergency message to active users.

Auth: `admin`

Request body:
```json
{
  "title": "Cyclone Alert",
  "message": "Move to nearest shelter immediately.",
  "zone": "Zone 4"
}
```

### GET `/admin/users?role=volunteer`
Get users, optional role filter.

Auth: `admin`

## Notifications

### GET `/notifications`
Get logged-in user notifications.

Auth: any logged-in user

### PUT `/notifications/:id/read`
Mark one notification as read.

Auth: any logged-in user

### PUT `/notifications/read-all`
Mark all notifications as read.

Auth: any logged-in user

### POST `/notifications/subscribe`
Save web push subscription for user.

Auth: any logged-in user

Request body:
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "key",
      "auth": "key"
    }
  }
}
```

## Health

### GET `/health`
Server health check.
