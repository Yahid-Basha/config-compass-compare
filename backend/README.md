
# Config Compare Backend

FastAPI backend for configuration file comparison tool.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /` - Health check
- `POST /compare` - Compare two configuration files

## Example Request

```bash
curl -X POST "http://localhost:8000/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "source_content": "{\"name\": \"old\"}",
    "target_content": "{\"name\": \"new\"}",
    "format": "json",
    "ignore_keys": [],
    "strict": true
  }'
```
