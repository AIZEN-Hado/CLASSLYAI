<div align="center">

# ClasslyAI

### AI-Powered LMS and Course Marketplace

A full-stack learning platform for students, instructors, and admins with course publishing, quizzes, analytics, AI tools, Google login, and Stripe payments.

<p align="center">
  <img src="https://img.shields.io/badge/React-19-111827?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-7-111827?style=for-the-badge&logo=vite&logoColor=FACC15" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-111827?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8" />
  <img src="https://img.shields.io/badge/Node.js-Backend-111827?style=for-the-badge&logo=node.js&logoColor=22C55E" />
  <img src="https://img.shields.io/badge/Express-API-111827?style=for-the-badge&logo=express&logoColor=FFFFFF" />
  <img src="https://img.shields.io/badge/MongoDB-Database-111827?style=for-the-badge&logo=mongodb&logoColor=22C55E" />
  <img src="https://img.shields.io/badge/Stripe-Payments-111827?style=for-the-badge&logo=stripe&logoColor=8B5CF6" />
</p>

<p align="center">
  <a href="https://github.com/AIZEN-Hado/CLASSLYAI">REPO😎✌️</a>
</p>

</div>

---

## About

ClasslyAI is a modern Learning Management System built to combine teaching, course delivery, marketplace sales, student engagement, and AI-assisted learning in one platform.

It supports the full workflow:

- students can browse, purchase, and learn from courses
- instructors can create, manage, and analyze course performance
- admins can monitor platform activity and manage operations
- AI tools help with notes, quizzes, and answer checking

---

## Preview

<img width="1536" height="1024" alt="ChatGPT Image Apr 20, 2026, 03_39_10 PM" src="https://github.com/user-attachments/assets/b9b4dc1a-e243-478e-8c33-fcc5f63e2c29" />

---

## Core Features

### Student Experience
- Browse and search public marketplace courses
- Purchase courses with Stripe
- Access enrolled lessons and learning resources
- Track lecture progress
- Take quizzes and review performance
- Use AI chat and answer checker tools
- View personal course analytics
- Receive broadcasts and announcements

### Instructor Experience
- Create and manage marketplace courses
- Update lectures, resources, and course settings
- Generate AI-based notes and quiz content
- Manage coupons and pricing
- Track student engagement
- Access course and quiz analytics

### Admin Experience
- Monitor platform-wide activity
- Manage courses and users
- View dashboards and operational data
- Review system usage and progress metrics

---

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT, Google OAuth |
| Payments | Stripe |
| Charts | Recharts |
| AI / Utilities | Tesseract.js, PDF tools, custom AI routes |

---

## Project Structure

```bash
LMScopy/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── config/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── index.js
│   └── package.json
└── README.md
```

---

## Main Modules

- Authentication with email/password and Google OAuth
- Course management and lecture delivery
- Marketplace search and course purchases
- Quiz creation, attempts, submission, and analytics
- AI notes and quiz generation
- Student AI chat
- Answer checking and document-based evaluation
- Broadcast and announcement system
- Reviews and coupons
- Instructor and admin dashboards

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/classlyai.git
cd classlyai
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

```bash
cd ../server
npm install
```

---

## Environment Variables

### Client

Create a `.env` file inside `client/`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SESSION_EXPIRY_DAYS=7
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Server

Create a `.env` file inside `server/`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
STRIPE_SECRET_KEY=your_stripe_secret_key
AI_ENCRYPTION_KEY=your_64_char_hex_key
ADMIN_SECRET_KEY=your_admin_secret
GOOGLE_CLIENT_ID=your_google_client_id
RENDER_EXTERNAL_URL=
```

---

## Run Locally

### Start backend

```bash
cd server
npm run dev
```

### Start frontend

```bash
cd client
npm run dev
```

### App URLs

```bash
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health
```

---

## Available Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

### Backend

```bash
npm run dev
npm start
```

---

## API Groups

The backend exposes route groups for:

```bash
/api/auth
/api/courses
/api/marketplace
/api/purchase
/api/quizzes
/api/resources
/api/ai
/api/student-ai
/api/evaluate
/api/broadcasts
/api/reviews
/api/coupons
/api/instructor
/api/admin
/api/activities
```

---

## Highlights

- Clean full-stack separation between client and server
- Role-based workflows for students, instructors, and admins
- Stripe checkout with webhook handling
- JWT-based auth with protected routes
- Google sign-in integration
- AI-assisted learning utilities
- Course progress and analytics tracking
- Scalable route/controller/model structure

---

## Deployment Notes

Before deploying publicly:

- rotate all secrets and keys
- use production Stripe credentials
- secure MongoDB network access
- restrict CORS to your real frontend domain
- keep environment variables out of version control

---

## Roadmap

- Real-time notifications
- Better mobile UI polish
- Expanded AI tutoring workflows
- Richer instructor reporting
- More collaboration features for learners

---

## Contributing

```bash
1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a pull request
```

---

## License

This project is licensed under the MIT License.

---

## Author

**Your Name**

- GitHub: https://github.com/your-username
- LinkedIn: https://linkedin.com/in/your-profile
- Email: your-email@example.com
