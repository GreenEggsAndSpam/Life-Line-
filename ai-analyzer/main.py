from fastapi import FastAPI
from pydantic import BaseModel
from ai_assessment import prioritize_incidents, PriorityAssessment
from fastapi.middleware.cors import CORSMiddleware

app =  FastAPI (title = 'LifeLine AI API')

class Incident(BaseModel):
    id: str
    description: str
class PrioritizeRequest(BaseModel):
    incidents: list[Incident]

@app.get("/")
def home():
    return {"message":"Life Line AI API is running"}

@app.post("/prioritize", response_model=PriorityAssessment)
def prioritize(request: PrioritizeRequest):
    incidents = [
        incident.model_dump()
        for incident in request.incidents
    ]

    return prioritize_incidents(incidents)
app.app_middleware(
    CORSMiddleware,
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials = False,
    allow_methods = ["POST", "GET"],
    allow_headers = ["Content-Type"]
)