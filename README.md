# Yard Management System

A full-stack Yard Management System built to manage gate activity, yard movement, dock and parking assignments, inspections, vehicles, facilities, and role-based operational workflows from a single dashboard.

## Features

- Secure authentication with JWT and ASP.NET Identity
- Email confirmation, forgot password, and password reset flows
- Role-based access control for `Admin`, `Gate Security`, `Yard Manager`, `Yard Jockey`, and `View Only`
- Gate activity management for arrivals and departures
- Vehicle registration and yard visibility
- Yard move and yard check operations
- Dock management and active dock assignment tracking
- Parking slot management and parking assignment tracking
- Inspection workflow management
- Facility, gate, carrier, goods, trailer type, and location master data management
- Dashboard reporting and operational summaries
- In-app notifications
- Swagger API documentation in development
- Optional AI assistant integration via OpenAI configuration

## Tech Stack

- Frontend: React 18, React Router, Axios, Recharts, React Icons
- Backend: ASP.NET Core 8 Web API
- Authentication: ASP.NET Identity + JWT Bearer
- Database: SQL Server with Entity Framework Core 8
- API Docs: Swagger / Swashbuckle
- Tooling: Node.js, npm, .NET 8 SDK, Visual Studio / VS Code

## Project Structure

```text
YardManagementSystem/
├── YardManagementSystem.sln
├── README.md
├── YardManagementSystem/
│   ├── Controllers/
│   ├── Data/
│   ├── DTOs/
│   ├── Models/
│   ├── Services/
│   ├── Properties/
│   ├── Program.cs
│   ├── appsettings.json
│   └── YardManagementSystem.csproj
└── yms-react/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── constants/
    │   ├── pages/
    │   ├── services/
    │   ├── App.js
    │   └── index.js
    ├── package.json
    └── package-lock.json
```

## Installation & Setup
1. Clone the repository
```text
git clone <your-repository-url>
cd YardManagementSystem
```
2. Configure the backend
Update YardManagementSystem/appsettings.json with your local values:
```text
{
  "ConnectionStrings": {
    "DefaultConnection": "your_sql_server_connection_string"
  },
  "Jwt": {
    "Key": "your_jwt_secret_key",
    "Issuer": "your_issuer",
    "Audience": "your_audience"
  },
  "Smtp": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "User": "your_email",
    "Pass": "your_password",
    "From": "your_email"
  },
  "Frontend": {
    "BaseUrl": "http://localhost:3000"
  },
  "SeedAdmin": {
    "Email": "admin@example.com",
    "Password": "your_admin_password"
  },
  "OpenAI": {
    "ApiKey": "your_openai_api_key",
    "Model": "gpt-4o-mini"
  }
}
```
3. Run the backend
```text
 cd YardManagementSystem
 dotnet restore
 dotnet run
 ```
 Backend runs on:

https://localhost:7096
http://localhost:5100
Swagger is available in development at:

https://localhost:7096/swagger

4. Run the frontend
Open a second terminal:
```text
cd yms-react
npm install
npm start
```

Frontend runs on:
http://localhost:3000

## Default Development Notes
- The React app is configured to call the backend at https://localhost:7096
- CORS is enabled for http://localhost:3000 and https://localhost:3000
- On startup, the backend can seed an admin user if SeedAdmin values are configured
- JWT settings are required; the backend throws an error if they are missing
  
## Core Modules
- Authentication and account management
- Gate arrivals and departures
- Vehicle management
- Yard map visibility
- Yard moves
- Yard checks
- Dock management and dock assignments
- Parking management and parking assignments
- Inspection management
- Reports and dashboard summaries
- User notifications
- Master data administration for facilities, locations, gates, carriers, goods, and trailer types

## Roles
- Admin
- Gate Security
- Yard Manager
- Yard Jockey
- View Only
- Driver is also referenced on the frontend for yard map access

## Notes on Secrets

This repository is intended to be public. Do not commit real credentials.

- Keep sensitive configuration local.
- Use placeholder values in `appsettings.json`.
- Do not commit JWT keys, database credentials, SMTP settings, or API keys.
- Set real values only in your local development environment.




