"""
FastAPI ML Service for AGRI-GPT
Serves disease detection and crop recommendation models
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import numpy as np
import cv2
from PIL import Image
import io
import sys
from pathlib import Path

# Add services to path
sys.path.append(str(Path(__file__).parent / 'services'))

from perfect_disease_detector import PerfectDiseaseDetector
from perfect_crop_recommender import PerfectCropRecommender

app = FastAPI(title="AGRI-GPT ML Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
disease_detector = PerfectDiseaseDetector()
crop_recommender = PerfectCropRecommender()

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ml-serving"}

@app.post("/detect-disease")
async def detect_disease(
    file: UploadFile = File(...),
    crop_type: str = None,
    latitude: float = None,
    longitude: float = None
):
    """Detect disease from image"""
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Prepare location data
        location = None
        if latitude and longitude:
            location = {"lat": latitude, "lng": longitude}
        
        # Detect disease
        result = disease_detector.detect_disease_perfectly(
            image=image,
            crop_type=crop_type,
            location=location
        )
        
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-crop")
async def recommend_crop(
    latitude: float,
    longitude: float,
    farm_size: float = 1.0,
    preferences: dict = None
):
    """Get crop recommendations"""
    try:
        location = {
            "lat": latitude,
            "lng": longitude,
            "coordinates": {"lat": latitude, "lng": longitude}
        }
        
        result = crop_recommender.recommend_perfect_crop(
            location=location,
            farm_size=farm_size,
            farmer_preferences=preferences
        )
        
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 5002))  # AI Service Port 5002
    uvicorn.run(app, host="0.0.0.0", port=port)
