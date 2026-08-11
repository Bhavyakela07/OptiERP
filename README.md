# 🚀 OptiERP — Mini ERP + CRM Operations Portal

A modern, full-stack **Enterprise Operations, Inventory & CRM System** built for wholesale distributors, warehouse operations, and sales teams. Featuring real-time transactional stock audits, price snapshotting on sales dispatches, role-based access control, customer relationship follow-up management, and print-ready A4 Tax Invoice PDF generation.

---

## 🌟 Key Features

### 🔐 1. Authentication & Role-Based Access Control (RBAC)
- **Role Permissions**:
  - **Admin**: Full system permissions (User management, customer suspension/unsuspension/deletion, product deletion, sales challan management).
  - **Sales**: Customer creation, CRM follow-up tracking, sales challan drafting & confirmation.
  - **Warehouse**: Product management, stock quantity adjustments, product deletion.
- **Inline User Generation**: Admins can generate new team accounts directly inside the user profile section.
- **Validation**: Enforces minimum 6-character passwords and valid email credentials.

### 👥 2. Customer Relationship Management (CRM)
- **Compulsory Account Fields**: Enforces mandatory Email, GST Number, Business Name, and Mobile Number (max 10 digits).
- **15-Day Suspension Controls**: Admin can temporarily suspend customer accounts with auto-unsuspend schedules.
- **Follow-up Pipeline**: Track customer interaction logs, follow-up dates, and status transitions (`Lead` → `Active` → `Suspended`).
- **Account Deletion**: Protected permanent deletion for duplicate/inactive customer accounts.

### 📦 3. Products & Stock Control
- **Inventory Tracking**: Monitor current stock, minimum stock thresholds, unit prices, and categories.
- **Low Stock Audit**: Filter products experiencing stock shortfalls with low-stock badges.
- **Product Deletion & Movement Cascade**: Admin/Warehouse users can delete products along with their linked stock audit histories.

### 📜 4. Sales Challans & Dispatch Transaction Engine
- **Price Snapshotting**: Freezes unit prices at the time of challan creation to protect past orders against future price updates.
- **Pre-Dispatch Stock Verification Audit**: Interactive modal audits warehouse stock against requested quantities before confirming dispatches.
- **Row-Lock Protection**: Prevents overselling stock when requested quantity exceeds available inventory.

### 📄 5. Formal Tax Invoice & PDF Export
- **Printable A4 Tax Invoice Document**: Modern CSS print layout optimized for clean PDF export.
- **Includes**: Company branding logo (`icon.png`), Customer GSTIN/Address, Itemized SKU breakdown, CGST (9%) + SGST (9%) breakdown, Grand Total in Indian Rupee Words (e.g. *"Rupees Twelve Thousand Five Hundred Only"*), HDFC Bank payment details, Terms & Conditions, and Authorized Signatory block.
- **On-Screen Invoice Preview**: Standalone `EyeIcon` preview modal to review tax invoice layouts before printing.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, React Router v7 |
| **Styling** | Vanilla CSS Design System with Dark/Light Modes & Glassmorphic UI |
| **Backend** | Node.js, Express, TypeScript, Zod Validation |
| **Database** | In-Memory PostgreSQL Engine (`pg-mem`) / PostgreSQL Driver (`pg`) |
| **Testing** | Node.js Native Test Runner (`tsx --test`) |
| **Deployment** | **Vercel** (Frontend) & **Render** (Backend) |

---

## 📂 Project Structure

```
mini-erp-crm/
├── backend/                  # Express + Node.js TypeScript API
│   ├── src/
│   │   ├── config/           # Database setup & connection helpers
│   │   ├── middleware/       # Auth JWT, Role RBAC & Zod Validation
│   │   ├── modules/          # Auth, Customers, Products, Challans
│   │   ├── scripts/          # Database seeding scripts
│   │   └── server.ts         # Server entry point & route mounting
│   ├── test/                 # 21/21 Automated Integration Tests
│   ├── render.yaml           # Render deployment configuration
│   └── package.json
│
├── frontend/                 # React 19 + Vite SPA
│   ├── public/
│   │   └── icon.png          # High-resolution company logo
│   ├── src/
│   │   ├── api/              # Axios HTTP client with Bearer Token auth
│   │   ├── components/       # Header, Sidebar, GlassCard, StatusBadge
│   │   ├── pages/            # Login, Customers, Products, Challans, Detail
│   │   └── index.css         # Complete Design System & @media print styles
│   ├── vercel.json           # Vercel SPA routing configuration
│   └── package.json
│
├── render.yaml               # Root Render Blueprint file
├── .gitignore                # Repository root ignore rules
└── README.md
```

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Backend server will start listening on `http://localhost:4000` with auto-seeded demo records.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Vite frontend server will start listening on `http://localhost:5173`.*

### 3. Run Backend Integration Tests
```bash
cd backend
npm test
```
*Executes all 21 automated integration tests covering authentication, RBAC, customer management, inventory control, product deletion, and challan transactions.*

---

## 🔑 Default Login Credentials

| Role | Email | Password | Allowed Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@minierpcrm.com` | `admin123` | Full access, User Creation, Deletions & Suspensions |
| **Sales** | `sales@minierpcrm.com` | `sales123` | Customers, CRM Follow-ups, Create & Dispatch Challans |
| **Warehouse** | `warehouse@minierpcrm.com` | `warehouse123` | Products, Stock Adjustments, Product Deletions |

---

## 🌐 Deployment Instructions

### 📡 Deploy Backend on Render (Web Service)

1. Push your code to your **GitHub / GitLab repository**.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Connect your repository.
4. Configure the Web Service settings:
   - **Name**: `mini-erp-crm-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
5. Add **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `4000`
   - `JWT_SECRET`: `your_super_secret_jwt_key_here`
   - `CORS_ORIGIN`: `*` *(or your Vercel frontend URL)*
6. Click **Create Web Service**. Your backend live URL will be generated (e.g. `https://mini-erp-crm-backend.onrender.com`).

---

### 🚀 Deploy Frontend on Vercel

1. Log into [Vercel Dashboard](https://vercel.com/) and click **Add New** → **Project**.
2. Import your GitHub repository.
3. In the project setup panel:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend`
4. Expand **Environment Variables**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://mini-erp-crm-backend.onrender.com` *(Replace with your live Render backend URL)*
5. Click **Deploy**. Vercel will build the frontend assets and host your application live!

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/auth` or `/api/auth`)
- `POST /auth/login` — Login user & return JWT token.
- `GET /auth/me` — Return currently authenticated user profile.
- `POST /auth/users` — Generate new user account (Admin only).

### 👥 Customers (`/customers` or `/api/customers`)
- `GET /customers` — List customers with search & status filters.
- `GET /customers/:id` — Get detailed customer profile with follow-up logs.
- `POST /customers` — Create customer (compulsory email, phone <= 10 digits, GSTIN).
- `POST /customers/:id/suspend` — Suspend customer for 15 days (Admin only).
- `POST /customers/:id/unsuspend` — Reactivate suspended account (Admin only).
- `DELETE /customers/:id` — Permanently delete customer account (Admin only).

### 📦 Products (`/products` or `/api/products`)
- `GET /products` — List inventory products with low stock filter.
- `POST /products` — Create new product item.
- `POST /products/:id/stock` — Record stock movement IN/OUT transaction.
- `DELETE /products/:id` — Delete product & linked stock history (Admin/Warehouse).

### 📜 Challans (`/challans` or `/api/challans`)
- `GET /challans` — List dispatches and filter by status (`Draft`, `Confirmed`, `Cancelled`).
- `GET /challans/:id` — Get full challan details & line item snapshots.
- `POST /challans` — Create draft challan with frozen unit price snapshots.
- `POST /challans/:id/confirm` — Confirm dispatch & decrement stock atomically.
- `POST /challans/:id/cancel` — Cancel draft/dispatched challan.

---

## 📄 License
This project is licensed under the **MIT License**.
