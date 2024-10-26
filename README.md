
# Diary Web Application

This project is an **experiment** and **toy project** built to explore Rust as a web backend using the Actix-web framework. The focus is on learning, and it is not for production-use.

The application allows users to log personal diary entries through a simple Rust backend and a web frontend. It showcases the basic capabilities of Rust for web development, user authentication, and database handling.

## Project Structure

```
Diary/
├── backend/          # Backend codebase (Rust, Actix)
│   ├── src/          # Source code for the backend
│   ├── Cargo.toml    # Rust dependencies and project metadata
│   └── .env          # Backend environment variables
├── frontend/         # Frontend codebase (JavaScript/TypeScript)
│   ├── src/          # Source code for the frontend
│   ├── package.json  # Node.js dependencies and project metadata
│   └── .env          # Frontend environment variables
├── .gitignore        # Ignored files for Git
└── README.md         # Project documentation
```

## Features

- **User Authentication**: User registration and login functionalities with secure password storage (Argon2 hashing) and basic session management.
- **Diary Management**: Users can create, edit, delete, and view personal diary entries.
- **Date Filtering**: Users can filter diary entries by date range.
- **Validation**: Strong password validation and standard username format validation.

## Getting Started

### Prerequisites

To run this project locally, ensure you have the following installed:

- **Rust**: You need the latest stable version of Rust for the backend.
- **Node.js**: Required for running the frontend (Vite-based app).
- **SQLite**: The backend uses SQLite for database storage.

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install Rust dependencies:
   ```bash
   cargo build
   ```

3. Create an `.env` file in the `backend/` directory based on the provided `.env` template. Example contents:
   ```env
   DATABASE_PATH=./src/self_diary.db
   ```

4. Start the backend server:
   ```bash
   cargo run
   ```
   The backend server will start at `http://127.0.0.1:8080`.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Create an `.env` file in the `frontend/` directory based on the provided `.env` template. Example contents:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8080
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

   This will launch the frontend on `http://localhost:3000`.

### Running Both Parts Together

After running both the backend and frontend servers, navigate to `http://localhost:3000` to access the application.

## Environment Variables

### Backend (`backend/.env`)
- **`DATABASE_URL`**: The path to the SQLite database file.
- **`FRONTEND_SERVER_URL`** The URL to the frontend server to allow CORS.
- **`BACKEND_SERVER_URL`** The URL to the backend server to serve the APIs.

### Frontend (`frontend/.env`)
- **`VITE_API_BASE_URL`**: The base URL for the backend API.

## Development

For development, you can format your Rust code using:
```bash
cargo fmt
```

## License

This project is licensed under the MIT License.
