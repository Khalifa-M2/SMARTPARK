# SmartPark Stock Inventory Management System

A React, Tailwind CSS, Express and MongoDB solution for the Software Development practical assessment. The frontend and backend are separate projects, as required.

## ERD to draw on the exam paper

Draw four entity boxes and connect them with one-to-many relationships:

```text
Spare_Part (1) ─────< Stock_In (many)
Spare_Part (1) ─────< Stock_Out (many)
Users      (1) ─────< Stock_Out (many)
```

Mark primary keys with `PK` and foreign keys with `FK`:

- `Spare_Part`: `_id (PK)`, `name`, `category`, `quantity` (opening stock), `unitPrice`, `totalPrice`, `availableQuantity`
- `Stock_In`: `_id (PK)`, `partId (FK)`, `quantity`, `unitPrice`, `totalPrice`, `date`
- `Stock_Out`: `_id (PK)`, `partId (FK)`, `userId (FK)`, `quantity`, `unitPrice`, `totalPrice`, `date`
- `Users`: `_id (PK)`, `username`, `passwordHash`

MongoDB stores these as documents in the `spareparts`, `stockins`, `stockouts`, and `users` collections. The `partId` and `userId` ObjectId references represent the relationships. Draw entity rectangles, relationship diamonds, and connecting lines/cardinalities using the symbols requested in the assessment.

## Requirements

- Node.js 20.19+ or 22.12+ and npm (required by the current Vite version)
- MongoDB Community Server running locally, or a MongoDB Atlas connection URI

## Setup on Windows PowerShell

1. Install MongoDB Community Server and ensure its Windows service is running. If the service is installed but stopped, open PowerShell as Administrator and run:

   ```powershell
   Start-Service MongoDB
   ```

   Alternatively, create a MongoDB Atlas database and use its connection string in step 2. MongoDB will create the `SIMS` database and collections automatically when the app first writes data; no SQL script or MySQL installation is needed.

2. Configure the backend:

   ```powershell
   cd "C:\Users\ESSA NYARUGUNGA\Downloads\Compressed\PRTCpdf_unlocked\ESSA_NYARUGUNGA_National_Practical_Exam_2025\backend-project"
   Copy-Item .env.example .env
   notepad .env
   ```

   Keep the default local `MONGODB_URI=mongodb://127.0.0.1:27017/SIMS` if using local MongoDB. For Atlas, put your database connection URI in `MONGODB_URI`. Replace `SESSION_SECRET` with a private random value of at least 32 characters. Keep `.env` private.

3. Install and start the backend in its own terminal:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

   Keep the backend terminal open. It prints an error if it cannot connect to MongoDB.

4. Create the first login account from another PowerShell terminal:

   ```powershell
   cd "C:\Users\ESSA NYARUGUNGA\Downloads\Compressed\PRTCpdf_unlocked\ESSA_NYARUGUNGA_National_Practical_Exam_2025\backend-project"
   $env:ADMIN_USERNAME = "inventory-admin"
   $env:ADMIN_PASSWORD = "REPLACE_WITH_YOUR_OWN_STRONG_PASSWORD"
   npm.cmd run create-user
   Remove-Item Env:ADMIN_USERNAME, Env:ADMIN_PASSWORD
   ```

   Replace the placeholder with your own password of at least 12 characters. It is saved as a bcrypt hash, not plaintext.

5. Install and start the frontend in a separate terminal:

   ```powershell
   cd "C:\Users\ESSA NYARUGUNGA\Downloads\Compressed\PRTCpdf_unlocked\ESSA_NYARUGUNGA_National_Practical_Exam_2025\frontend-project"
   npm.cmd install
   npm.cmd run dev
   ```

6. Open the Vite URL shown in the terminal (normally `http://localhost:5173`) and sign in with the account created above.

## Implemented assessment features

- MongoDB collections for spare parts, stock-in movements, stock-out movements, users, and persistent login sessions.
- Session-based login/logout with bcrypt password hashing; sessions are stored in MongoDB.
- Responsive React pages with React Router, Tailwind CSS and Axios.
- Spare part and stock-in registration; stock-out create, retrieve, update and delete.
- Available stock is tracked as opening quantity plus receipts minus issues. Stock-outs cannot exceed the available quantity.
- Daily stock status and stock-out reports, filterable by date.
- API endpoints are under `/api`; `/api/health` is available for a basic server health check.

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Check current session |
| POST | `/api/auth/logout` | Sign out |
| GET, POST | `/api/parts` | List and register spare parts |
| GET, POST | `/api/stock-ins` | List and record incoming stock |
| GET, POST, PUT, DELETE | `/api/stock-outs` | Manage outgoing-stock records |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily stock status and stock-out report |

## Suggested responses to the assessor

- **Describe the product:** “SmartPark SIMS is a responsive web application for registering spare parts, recording received and issued stock, and checking daily remaining quantities and stock-out values. It uses React and Tailwind CSS in the browser, an Express REST API, and MongoDB for inventory, users and login sessions.”
- **Difficulties encountered:** “Keeping the available quantity accurate while stock receipts and issues are recorded, and connecting the React application to the API while maintaining a signed-in session.”
- **How they were addressed:** “I used MongoDB collections with ObjectId references for stock movements, maintained available stock as receipts and issues were recorded, and atomically checked stock before saving an issue. Axios sends session cookies to the API, and the backend stores password hashes and login sessions in MongoDB.”

Keep the project until it has been marked. The assessment says to ask the assessor before removing it.
