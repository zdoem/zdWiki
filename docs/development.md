# Local Development Guide

## Prerequisites
- Python 3.10+
- Node.js 18+ & npm 9+

## Running the Backend API
```bash
# From repository root
pip install -r apps/api/requirements.txt

# Start backend server
python -m app.cli.main serve --port 8000
```
Interactive OpenAPI documentation will be available at `http://localhost:8000/docs`.

## Running the Web Frontend
```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## Running Tests
```bash
# Run pytest test suite
pytest apps/api/tests -v

# Run Knowledge Base Linting
python -m app.cli.main lint
```
