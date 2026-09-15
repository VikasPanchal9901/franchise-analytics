# FranchiseOps supplied-dataset data flow

## Integrated files

The application now uses the datasets supplied in `datasets.zip`:

- `backend/data/supplied/indian_retail_sales_kaggle.csv` — 2,600 outlet-level transactions with product, category, pricing, quantity, discount, net revenue, profit, payment method, rating, customer segment, and daily footfall fields.
- `backend/data/supplied/customer_feedback_sentiment.csv` — 350 customer reviews with outlet code, review text, rating, source, and date.
- `backend/data/supplied/generate_indian_retail_data.py` — the generator included in the supplied archive, retained for provenance but not run automatically.

The supplied archive does not include an upstream source URL or license statement. The project therefore labels these as **user-provided datasets** rather than claiming that they are verified Kaggle data. Confirm the upstream license before redistributing the data outside this project.

## Import flow

```text
User-provided Indian retail CSVs
        |
        v
backend/data/importSupplied.js
        |
        +--> products table
        +--> sales table, including transaction metadata
        +--> customer_feedback table
        +--> outlet customer_rating updated from feedback averages
        |
        v
existing inventory, sales, executive, outlet, audit, marketing and notification APIs
        |
        v
existing React dashboards + Socket.IO realtime refresh listeners
```

The existing frontend routes and dashboard components were preserved. The importer maps the supplied outlet codes directly to the seeded outlet master, so the outlet-level sales and feedback remain aligned instead of being randomly reassigned.

### Stored transaction fields

The existing `sales` table continues to expose `date`, `quantity`, `revenue`, and `discount` for backward compatibility. It now also stores `transaction_id`, `hour`, `is_weekend`, `payment_method`, `customer_rating`, `customer_segment`, and `footfall`.

The supplied `Net_Revenue_INR` is stored as `sales.revenue`. The difference between `Gross_Revenue_INR` and `Net_Revenue_INR` is stored as `sales.discount`, matching the existing dashboard contract. Product cost and price are loaded into the existing `products` table.

Customer reviews are stored in `customer_feedback`. The importer recalculates each outlet's displayed `customer_rating` from the feedback rows, so the executive and outlet modules use the supplied feedback rather than unrelated generated ratings.

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm start
```

Then in another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The protected endpoint `GET /api/data-sources` reports the active source, row counts, and imported date range after login.

The demo login remains `manager@kaffeinecentral.com` / `Demo@1234`.
