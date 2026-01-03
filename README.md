# Job Application Tracker ✅

A full-stack job application tracking web app with authentication (JWT). Users can sign up, log in, and manage job applications with per-user data isolation.

## 🌐 Live Demo
- Frontend: https://job-application-tracker-frontend-az06.onrender.com
- Backend Health: https://job-application-tracker-backend-iw0l.onrender.com/health

## ✨ Features
- JWT Authentication (signup/login)
- Per-user jobs (secure multi-user support)
- Create / update / delete job applications
- Status tracking (Applied, Interview, Offer, Rejected)
- PostgreSQL (Neon)
- Production deployment on Render
- `/setup` disabled in production for safety

## 🧰 Tech Stack
**Frontend:** React + Vite  
**Backend:** Node.js + Express  
**Database:** PostgreSQL (Neon)  
**Auth:** JWT + bcrypt  
**Deploy:** Render (frontend + backend)

## ▶️ Run Locally

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
