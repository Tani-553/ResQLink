# Smart Disaster Resource Coordination System

A Progressive Web App that connects victims, volunteers, NGOs, and administrators during disaster situations.

## Problem Statement

During disasters, help requests are often scattered across calls, chats, and social posts. This project centralizes requests, coordination, notifications, and response tracking.

## Objectives

- Centralize disaster coordination
- Track help requests in real time
- Connect victims with nearby volunteers and NGOs
- Reduce duplicate allocation of relief resources
- Improve response speed and visibility

## Team Roles

| Member | Role | Responsibilities |
|--------|------|------------------|
| Member 1 | Frontend Developer & UI/UX Designer | React UI, PWA, maps, GPS |
| Member 2 | Backend Developer & Team Lead | Node.js API, auth, coordination |
| Member 3 | Database Engineer & Notification Specialist | MongoDB, Firebase, push notifications, testing |

## Project Structure

```text
smart-disaster-coordination/
├── database/
│   ├── seed.js
│   └── schemas/
├── docs/
├── public/
├── src/
│   ├── backend/
│   ├── frontend/
│   └── notifications/
├── tests/
├── .env.example
├── package.json
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose, Firebase Realtime Database |
| Auth | JWT |
| Notifications | Firebase Cloud Messaging, PWA Web Push |
| Testing | Jest, Supertest |

## Member 3 Deliverables

- MongoDB schemas for `User`, `HelpRequest`, `NGOProfile`, and `Notification`
- schema reference in `database/schemas/schemaDefinitions.js`
- seed data in `database/seed.js`
- FCM and Web Push notification services
- notification APIs for fetch/read/read-all/subscribe
- Firebase Realtime Database live-location sync hook
- Jest test coverage in:
  - `tests/auth.test.js`
  - `tests/requests.test.js`
  - `tests/notifications.test.js`

## Setup

### Prerequisites

- Node.js 18+
- MongoDB
- Firebase project for FCM and Realtime Database

### Install

```bash
npm install
cd src/frontend
npm install
```

### Configure

```bash
cp .env.example .env
```

Fill in MongoDB, JWT, Firebase, and VAPID values.

### Run

```bash
# Backend
npm run server

# Frontend
cd src/frontend
npm start
```

## Useful Backend Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a user | Public |
| POST | `/api/auth/login` | Login and get JWT | Public |
| PUT | `/api/auth/update-location` | Update user location and trigger live sync | Logged-in user |
| POST | `/api/requests` | Submit SOS request | Victim |
| GET | `/api/requests/nearby` | Get nearby requests | Volunteer, NGO |
| PUT | `/api/requests/:id/accept` | Accept a request | Volunteer |
| PUT | `/api/requests/:id/status` | Update request status | Volunteer, NGO, Admin |
| POST | `/api/ngo/register` | Register NGO profile | NGO |
| PUT | `/api/admin/ngos/:id/verify` | Approve or reject NGO | Admin |
| POST | `/api/admin/broadcast` | Broadcast emergency message | Admin |
| GET | `/api/notifications` | Fetch notifications | Logged-in user |
| POST | `/api/notifications/subscribe` | Save Web Push subscription | Logged-in user |

## Testing

Run the Member 3 suites with:

```bash
npx jest tests/auth.test.js tests/requests.test.js tests/notifications.test.js tests/backendRemaining.test.js --runInBand
```

## Notes

- Firebase-based push and live-location sync require Firebase env vars to be set.
- Web Push requires VAPID keys to be configured.
- Uploaded NGO documents currently use local storage under `uploads/`.
