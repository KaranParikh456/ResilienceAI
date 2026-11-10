from fastapi import FastAPI

app = FastAPI(
    title="ResilienceAI",
    description="AI-powered security and infrastructure resilience",
    version="0.1.0"
)

@app.get("/")
def home():
    return {
        "project": "ResilienceAI",
        "status": "running"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
