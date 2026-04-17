# 🛡️ Smart Disaster Resource Coordination System

A web-based Progressive Web App (PWA) that connects **Victims**, **Volunteers**, **NGOs**, and **Administrators** in real time during disaster situations.

---

## 📋 Problem Statement

During disasters, help requests are scattered across multiple platforms (WhatsApp, phone calls, social media), causing poor coordination among victims, volunteers, and NGOs. This leads to delayed response and unequal distribution of relief resources.

---

## 🎯 Objectives

- Provide a **centralized platform** for disaster coordination
- Enable **real-time help request tracking**
- Connect victims with **nearby volunteers and NGOs**
- Reduce **duplicate resource allocation**
- Improve **response time and efficiency**

---

## 👥 Team Members & Roles

| Member | Role | Responsibilities |
|--------|------|-----------------|
| Member 1 | Frontend Developer & UI/UX Designer | React UI, PWA, Maps, GPS |
| Member 2 | Backend Developer & Team Lead | Node.js API, Auth, Team Coordination |
| Member 3 | Database Engineer & Notification Specialist | MongoDB, Firebase, Push Notifications, Testing |

---

## 🗂️ Project Structure

```
smart-disaster-coordination/
├── README.md
├── package.json
├── .env.example
├── .gitignore
│
├── docs/                          # Project documentation
│   ├── Project_Document.docx
│   ├── Member1_Frontend_UIDesigner.docx
│   ├── Member2_Backend_TeamLead.docx
│   └── Member3_Database_Notifications.docx
│
├── diagrams/                      # UML & UI diagrams
│   └── usecase_diagram.jpg
│
├── src/
│   ├── frontend/                  # Member 1
│   │   ├── pages/                 # Screen components
│   │   ├── components/            # Reusable UI components
│   │   └── styles/                # CSS / Tailwind config
│   │
│   ├── backend/                   # Member 2
│   │   ├── server.js              # Express server entry point
│   │   ├── routes/                # API route definitions
│   │   ├── controllers/           # Business logic
│   │   ├── middleware/            # Auth & error middleware
│   │   └── models/                # Mongoose models (shared)
│   │
│   ├── notifications/             # Member 3
│   │   ├── fcmService.js          # Firebase Cloud Messaging
│   │   └── pushService.js         # PWA Web Push
│   │
│   └── database/                  # Member 3
│       └── schemas/               # MongoDB schema definitions
│
├── tests/                         # Member 3 — Jest test suites
│   ├── auth.test.js
│   ├── requests.test.js
│   └── notifications.test.js
│
└── public/                        # PWA static assets
    ├── manifest.json
    └── service-worker.js
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose, Firebase Realtime DB |
| Auth | JWT (JSON Web Tokens) |
| Maps | Google Maps JavaScript API |
| Location | Geolocation API |
| Notifications | Firebase Cloud Messaging (FCM), PWA Web Push |
| Testing | Jest, Supertest |
| PWA | Service Worker, Web App Manifest |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Firebase project (for FCM)
- Google Maps API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-team/smart-disaster-coordination.git
cd smart-disaster-coordination

# Install backend dependencies
npm install

# Install frontend dependencies
cd src/frontend
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Fill in your credentials in .env
```

### Run Development Servers

```bash
# Backend (from root)
npm run server

# Frontend (from src/frontend)
npm start
```

---

## 👤 User Roles

| Role | Access |
|------|--------|
| 🆘 Victim | Submit SOS requests, track status, view map |
| 🙋 Volunteer | View nearby requests, accept tasks, update status |
| 🏢 NGO | Manage resources, assign volunteers, coordinate |
| ⚙️ Admin | Verify NGOs, monitor all activity, prevent duplicates |

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login & get JWT | Public |
| POST | `/api/requests` | Submit SOS request | Victim |
| GET | `/api/requests/nearby` | Get nearby requests | Volunteer |
| PUT | `/api/requests/:id/accept` | Accept a request | Volunteer |
| GET | `/api/admin/ngos` | List all NGOs | Admin |
| PUT | `/api/admin/ngos/:id/verify` | Approve NGO | Admin |
| POST | `/api/notifications/broadcast` | Send broadcast | Admin |

---

## 📊 Implementation Phases

1. **Phase 1** — Requirement Analysis & Design
2. **Phase 2** — Frontend & Backend Development
3. **Phase 3** — Integration (APIs + Maps + Firebase)
4. **Phase 4** — PWA Setup & Notifications
5. **Phase 5** — Testing
6. **Phase 6** — Deployment

---

## 📄 License

This project is developed for academic purposes.
