# Smart Disaster Coordination API

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

### GET `/auth/me`
Get current user profile.

Auth: `Bearer <token>`

### PUT `/auth/update-location`
Update current user GPS location in MongoDB and attempt live sync to Firebase Realtime Database.

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
Victim creates an SOS request with duplicate prevention, volunteer matching, in-app notifications, and push notification fanout for nearby volunteers.

Auth: `victim`

### GET `/requests/nearby`
Get nearby pending requests.

Auth: `volunteer`, `ngo`

### GET `/requests/my`
Get victim-owned requests.

Auth: `victim`

### GET `/requests/all`
Get all requests with filters.

Auth: `admin`

### PUT `/requests/:id/accept`
Volunteer accepts a request. This creates a `request-accepted` notification for the victim.

Auth: `volunteer`

### PUT `/requests/:id/status`
Update request status. This creates:
- `task-update` for victim and admins when moving to non-resolved states
- `request-resolved` for victim and assigned volunteer when resolved

Auth: `volunteer`, `ngo`, `admin`

Request body:
```json
{
  "status": "in-progress"
}
```

## Volunteers

### GET `/volunteers/active`
List active volunteers.

Auth: `ngo`, `admin`

### GET `/volunteers/my-tasks`
Get volunteer assigned active tasks.

Auth: `volunteer`

## NGO

### POST `/ngo/register`
Create NGO profile with document upload and notify admins that verification is pending.

Auth: `ngo`

Content type: `multipart/form-data`

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

### GET `/admin/ngos`
Get NGO verification queue.

Auth: `admin`

### PUT `/admin/ngos/:id/verify`
Approve or reject NGO. This creates an in-app notification and attempts push delivery to the NGO user.

Auth: `admin`

### POST `/admin/broadcast`
Broadcast an emergency message to active users. This creates in-app notifications and attempts FCM plus Web Push delivery.

Auth: `admin`

## Notifications

### GET `/notifications`
Get the logged-in user's notifications.

Auth: any logged-in user

### PUT `/notifications/:id/read`
Mark one notification as read.

Auth: any logged-in user

### PUT `/notifications/read-all`
Mark all notifications as read.

Auth: any logged-in user

### POST `/notifications/subscribe`
Persist a browser push subscription on the current user so Web Push can be used for future events.

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
