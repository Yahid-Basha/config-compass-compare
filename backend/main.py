
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
import json
import yaml
import xml.etree.ElementTree as ET
from pydantic import BaseModel
from utils.json_diff import compare_json
from utils.yaml_diff import compare_yaml
from utils.xml_diff import compare_xml

app = FastAPI(title="Config Compare API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite and Create React App default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CompareRequest(BaseModel):
    source_content: str
    target_content: str
    format: str
    ignore_keys: Optional[List[str]] = []
    strict: Optional[bool] = True

class CompareResponse(BaseModel):
    summary: dict
    diff: List[dict]
    formatted_diff: dict

@app.get("/")
async def root():
    return {"message": "Config Compare API is running"}

@app.post("/compare", response_model=CompareResponse)
async def compare_files(request: CompareRequest):
    try:
        source_content = request.source_content.strip()
        target_content = request.target_content.strip()
        file_format = request.format.lower()
        ignore_keys = request.ignore_keys or []
        strict = request.strict

        if file_format == "json":
            result = compare_json(source_content, target_content, ignore_keys, strict)
        elif file_format == "yaml":
            result = compare_yaml(source_content, target_content, ignore_keys, strict)
        elif file_format == "xml":
            result = compare_xml(source_content, target_content, ignore_keys, strict)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {file_format}")

        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML format: {str(e)}")
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Invalid XML format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
