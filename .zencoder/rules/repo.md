---
description: Repository Information Overview
alwaysApply: true
---

# FLEXPRESS - Delivery Application

## Repository Summary

FLEXPRESS is a modern delivery application with a full-stack architecture supporting three user roles: Admin, Livreur (Delivery Driver), and Client. The application features real-time order tracking, GPS geolocation, interactive mapping for restaurant discovery, and secure JWT-based authentication.

## Repository Structure

```
projet delevery/
├── backend/                    # Flask REST API
│   ├── app.py                 # Main Flask application
│   ├── init_data.py           # Database initialization with test data
│   ├── update_db.py           # Database update utilities
│   ├── requirements.txt       # Python dependencies
│   └── delivery.db            # SQLite database (auto-created)
├── frontend/                   # React web application
│   ├── src/
│   │   ├── index.js           # React entry point
│   │   ├── App.js             # Main routing component
│   │   ├── pages/             # Page components (Login, Dashboard variants)
│   │   ├── App.css            # Application styling
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   ├── package.json           # Node.js dependencies
│   └── package-lock.json      # Dependency lock file
├── static/                    # Static product images
├── install.bat                # Installation script
├── start_backend.bat          # Backend startup script
├── start_frontend.bat         # Frontend startup script
└── README.md                  # Project documentation
```

## Backend - Flask API

### Language & Runtime
**Language**: Python  
**Version**: Python 3.x  
**Framework**: Flask 3.0.0  
**Build System**: pip  
**Package Manager**: pip

### Dependencies
**Main Dependencies**:
- Flask 3.0.0 - Web framework
- Flask-CORS 4.0.0 - Cross-origin resource sharing
- Flask-JWT-Extended 4.6.0 - JWT authentication
- Werkzeug 3.0.1 - WSGI utilities and password hashing

**Database**: SQLite (file-based, auto-created)

### Build & Installation

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server runs on `http://localhost:5000`

### Database Schema

The application uses SQLite with the following main tables:
- **users** - User accounts (id, username, email, password, role, phone, latitude, longitude)
- **restaurants** - Restaurant information (id, name, description, coordinates, address, phone, hours)
- **orders** - Order records (id, client_id, restaurant_id, status, total_price, delivery details)
- **order_items** - Individual items in orders
- **menu_items** - Restaurant menu items

### Entry Points & Configuration

**Main Entry Point**: `backend/app.py` (line 1-879)
- JWT secret key configuration (should be changed in production)
- JWT token expiration: 24 hours
- CORS enabled for frontend communication
- Error handlers for JWT and validation errors

**Database Initialization**: `backend/init_data.py`
- Auto-creates database schema
- Populates test restaurants (5 Paris locations)
- Creates test users: admin, livreur, client

## Frontend - React Application

### Language & Runtime
**Language**: JavaScript (ES6+)  
**Runtime**: Node.js / React 18.2.0  
**Build System**: Create React App (react-scripts 5.0.1)  
**Package Manager**: npm

### Dependencies
**Main Dependencies**:
- react 18.2.0 - UI framework
- react-dom 18.2.0 - DOM rendering
- react-router-dom 6.20.0 - Client-side routing
- axios 1.6.2 - HTTP client
- leaflet 1.9.4 - Interactive mapping library
- react-leaflet 4.2.1 - React wrapper for Leaflet
- react-icons 4.12.0 - Icon library

**Development Dependencies**:
- react-scripts 5.0.1 - Build tools and configuration

### Build & Installation

```bash
cd frontend
npm install
npm start
```

Application runs on `http://localhost:3000`

### Entry Points & Configuration

**Main Entry Point**: `frontend/src/index.js`
- Renders React app into root DOM element

**Application Component**: `frontend/src/App.js` (lines 1-65)
- Implements routing based on user role (client, livreur, admin)
- Handles JWT token and user data storage in localStorage
- Protected routes with role-based access control

**Page Components**: `frontend/src/pages/`
- Login.js - Authentication page
- ClientDashboard.js - Client order management and map view
- LivreurDashboard.js - Delivery driver order assignment and tracking
- AdminDashboard.js - Admin restaurant and order management

**Authentication**: JWT tokens stored in localStorage and passed via Authorization headers

### Build Command

```bash
npm build
```

Creates optimized production build in `build/` directory

## Testing

**Frontend Testing Framework**: React Scripts (Jest)

**Test Command**:
```bash
cd frontend
npm test
```

Currently no test files present in the project.

**Backend Testing**: No dedicated test framework configured

## Setup & Operations

### Installation

Run the provided batch script:
```bash
install.bat
```

This will:
1. Install Python dependencies via pip
2. Install Node.js dependencies via npm
3. Initialize test data via `init_data.py`

### Startup

**Windows Batch Scripts**:

Backend:
```bash
start_backend.bat
# Runs: cd backend && python app.py
```

Frontend:
```bash
start_frontend.bat
# Runs: cd frontend && npm start
```

Open two terminal windows and run each script separately, or use:
```bash
# PowerShell method (from GUIDE_POWERSHELL.md)
Start-Process cmd /c {start_backend.bat}
Start-Process cmd /c {start_frontend.bat}
```

### Default Test Accounts

- **Admin**: username `admin`, password `admin123`
- **Livreur**: username `livreur`, password `livreur123`
- **Client**: username `client`, password `client123`

## Key Features

- **Authentication**: Secure JWT-based authentication with role-based access control
- **Real-time Geolocation**: GPS coordinates for clients, delivery drivers, and restaurants
- **Interactive Maps**: Leaflet-based maps showing nearby restaurants and delivery routes
- **Order Management**: Complete order lifecycle (creation, assignment, tracking, delivery)
- **Admin Dashboard**: Restaurant and order management, statistics
- **Multi-role Interface**: Distinct dashboards for client, delivery driver, and admin users

## Technology Stack Summary

- **Backend API**: Flask with JWT authentication
- **Database**: SQLite
- **Frontend**: React 18 with React Router for navigation
- **Mapping**: Leaflet with React-Leaflet integration
- **Communication**: Axios for HTTP requests
- **Styling**: Custom CSS
- **Icons**: React Icons
