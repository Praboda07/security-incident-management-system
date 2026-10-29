# SecureTrack – Security Incident Management System (SIMS)

## 1. Project Overview

SecureTrack is a web-based Security Incident Management System (SIMS) designed to help organizations report, monitor, manage, and resolve cybersecurity incidents through a centralized application.

The system also provides user authentication and employee management features, including administrator approval workflows to support secure access control.

## 2. Project Objectives

- Develop a web application for cybersecurity incident management.
- Allow users to create, view, update, and delete incident records.
- Provide user registration and login functionality.
- Support employee management and administrator approval workflows.
- Store application data in a MongoDB database.
- Provide a user-friendly interface.
- Deploy the frontend and backend for online access.

## 3. Main Features

### Incident Management
- Create new incident records.
- View and review incident information.
- Update existing incident details.
- Delete selected incident records where permitted.

### User Authentication
- User registration and login.
- Password hashing.
- JWT-based authentication support.

### Employee Management
- Employee registration requests.
- Administrator review of employee requests.
- Approval and rejection workflows.
- Employee record management.

### User Interface
- React-based interface.
- Light and dark appearance modes.
- Forms and interactive components.

## 4. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB |
| Database ODM | Mongoose |
| Authentication | JSON Web Token (JWT) |
| Password Security | bcryptjs |
| Middleware | CORS, dotenv |
| File Handling | Multer, where implemented |
| Version Control | Git and GitHub |
| Frontend Hosting | Netlify |
| Backend Hosting | Abasthan |

## 5. Project Structure

The project is organized into frontend and backend directories.

```text
security-incident-management-system/
│
├── README.md
│
├── client/
│   ├── public/
│   ├── src/
│   └── package.json
│
└── server/
    ├── models/
    ├── routes/
    ├── server.js
    ├── package.json
    └── .env