# WasteWise AI

WasteWise AI is a food inventory and waste-monitoring prototype. The frontend
workspace reads dashboard, batch, and demand data from a FastAPI backend. The
backend stores operational records in MySQL and serves forecasts from the
trained model in `ml/artifacts`.

## Run with local MySQL

1. Start MySQL Server and create the database/tables from the project root:

   ```powershell
   Get-Content .\database\schema.sql | mysql.exe --host=127.0.0.1 --user=root --password
   ```

   Enter the password for your local MySQL administrator when prompted. If
   `mysql.exe` is not on `PATH`, use its full installed path.

2. Set up the backend from the project root:

   ```powershell
   cd .\backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

   Edit `backend/.env` and replace the placeholder `DATABASE_URL` with your
   actual MySQL username and password. Do not commit this file. The database
   user needs access to the `wastewise` database; URL-encode reserved
   characters in credentials.

3. Optionally import the supplied prototype data into an **empty** database:

   ```powershell
   python -m scripts.import_demo_data
   ```

   The importer is transactional and refuses to write if any of its target
   tables already contain rows. It imports the provided product, inventory,
   sales, and waste CSVs. The perishable/waste CSV is simulated sample data,
   not evidence of real store performance or customer behavior.

4. Start the backend (from the `backend` directory):

   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

   Check `http://127.0.0.1:8000/health`; a successful MySQL connection returns
   `{"status":"ok","database":"connected"}`. Interactive API documentation is
   at `http://127.0.0.1:8000/docs`.

5. In a second terminal, start the frontend:

   ```powershell
   cd .\frontend
   npm install
   npm run dev
   ```

   Open the URL printed by Vite (normally `http://localhost:5173`). The Vite
   development server proxies API requests to `127.0.0.1:8000`. For a deployed
   frontend, set `VITE_API_URL` to the backend origin and configure
   `ALLOWED_ORIGINS` in `backend/.env`.

## Data and forecast notes

- The dashboard summary and inventory monitor use rows in MySQL; empty tables
  are shown as empty rather than filled with hard-coded demo metrics.
- Demand forecasting requires at least 28 recorded sales dates for a store.
  Missing calendar dates are treated as zero-sales dates between the first and
  latest recorded sale. The response includes its data-through date and a stale
  data warning.
- The demand model is a prototype trained and evaluated on historical M5 data.
  Validate it with current store data before operational use. The other
  prototype model artifacts and their limitations are documented under `ml/`.