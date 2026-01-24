# Shree Roop Creative - Ecommerce Template

A complete, production-ready ecommerce website template for an Artificial Jewelry Store. Built with Node.js, Express, PostgreSQL, and Vanilla JS.

## Features

- **Full Stack**: Express API + Vanilla Frontend.
- **Database**: PostgreSQL with SSL support.
- **Auth**: Customer & Admin (JWT based).
- **Shopping**: Categories, Search, persistent Cart, Discounts.
- **Payments**: Razorpay (Checkout + optional Link generation) + COD.
- **Admin**: Dashboard for Orders and Products.
- **Config**: Shared configuration for branding and feature toggles.

## Prerequisites

- Node.js (v18+)
- PostgreSQL Database (Local or Managed like Neon, Supabase, Railway)

## Quick Start (Local)

1.  **Clone & Install**
    ```bash
    git clone <repo>
    cd the-jewel-room
    npm install
    ```

2.  **Environment Setup**
    Copy `.env.example` to `.env` and update values:
    ```env
    PORT=3000
    DATABASE_URL=postgres://user:password@localhost:5432/jewelroom
    DB_SSL=false
    JWT_SECRET=mysecret
    RAZORPAY_KEY_ID=rzp_test_xyz...
    RAZORPAY_KEY_SECRET=...
    ```

3.  **Database Init**
    ```bash
    npm run db:init  # Creates tables
    npm run db:seed  # Adds admin and sample products
    ```

4.  **Run Server**
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000`

## Deployment (Render/Railway/Heroku)

1.  **Create Service**: Connect this repo to your cloud provider.
2.  **Environment Variables**: storage your `.env` vars in the provider's dashboard.
    - Set `DB_SSL=true` if using a managed cloud DB.
3.  **Build Command**: `npm install`
4.  **Start Command**: `npm start`
5.  **Database**:
    - Connect to your cloud DB using `psql` or a UI tool.
    - Run the contents of `db/init.js` logic manually or add a build script `npm run db:init` (be careful not to reset prod data if you modify script). Ideally, use migration tools for production updates.

## Configuration for Clients

Edit `config.js` to change:
- Brand Name (`appName`)
- Theme Colors
- WhatsApp Number
- Feature Toggles (`enableCOD`, `enableDiscounts`)

## Admin Access

- **Login URL**: `/admin.html` (Accessible via Footer or direct link)
- **Default Creds**: `admin@thejewelroom.com` / `admin123` (Created by seed script)

## Project Structure

- `/server`: Backend API code
- `/public`: Frontend HTML/CSS/JS
- `/db`: Database scripts
