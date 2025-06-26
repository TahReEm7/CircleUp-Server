# CircleUp Server 🔄🌐

Welcome to the backend server for the **CircleUp** application. This server provides RESTful APIs to manage user authentication, connections, events, and related operations. Built with Node.js, Express, and MongoDB, it supports user registration, login, connection management, and event management.

---

## Features ✨

- User registration and login
- Connection management (add, remove, list)
- Event creation, retrieval, update, participation, cancellation, and deletion
- Secure API endpoints with authorization middleware
- Data validation and error handling

---

## Technologies Used 🛠️

- Node.js
- Express.js
- MongoDB with Mongoose
- dotenv for environment variables management
- Firebase Admin SDK for authentication verification

---

## API Endpoints 🔗

### Authentication

| Method  | Endpoint             | Description                  | Auth Required |
|---------|----------------------|------------------------------|---------------|
| **POST**   | `/auth/register`        | Register a new user           | No            |
| **POST**   | `/auth/login`           | Login an existing user        | No            |

### Connections

| Method  | Endpoint             | Description                  | Auth Required |
|---------|----------------------|------------------------------|---------------|
| **GET**    | `/connections`          | Get all user connections      | Yes 🔐         |
| **POST**   | `/connections`          | Add a new connection          | Yes 🔐         |
| **DELETE** | `/connections/:id`      | Remove a connection           | Yes 🔐         |

### Events

| Method  | Endpoint             | Description                          | Auth Required |
|---------|----------------------|------------------------------------|---------------|
| **POST**   | `/events`              | Create a new event                   | Yes 🔐         |
| **GET**    | `/events`              | Get all upcoming events, with optional search and filtering by event type | No            |
| **GET**    | `/events/:id`          | Get a single event by ID             | No            |
| **PATCH**  | `/events/:id`          | Update event details or join an event (add attendee) | Partial (joining requires auth) 🔐 |
| **PATCH**  | `/events/:id/cancel`   | Cancel event participation (remove attendee) | Yes 🔐         |
| **DELETE** | `/events/:id`          | Delete an event by ID                | Yes 🔐         |

---

### Query Parameters for GET `/events`

- `search` (string) — Search events by title (case-insensitive)
- `eventType` (string) — Filter by event type (e.g., "Workshop", "Meetup"); use `All` to disable filtering

---

## Prerequisites 📋

- Node.js (v14+ recommended)
- MongoDB database (MongoDB Atlas)
- npm
- Firebase project setup (for authentication token verification)

---
## Author 👨‍💻

**Tahreem Hossain**  
Software Engineer | Web Developer  
[GitHub Profile](https://github.com/TahReEm7)
[LinkedIn Profile](www.linkedin.com/in/tahreemhossain-cr07)