from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
import shutil

from detector import detect_fraud

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

REQUIRED_COLUMNS = {
    "transaction_id",
    "timestamp",
    "card_id",
    "amount",
    "merchant_name",
    "merchant_category",
    "channel",
    "cardholder_country",
    "merchant_country",
    "device_id",
    "ip_address",
}


@app.post("/detect-fraud")
async def detect_fraud_endpoint(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    input_path = DATA_DIR / "transactions.csv"
    output_path = DATA_DIR / "transactions_flagged.csv"

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        df = detect_fraud(str(input_path), str(output_path))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Fraud detection failed: {error}")

    flagged = df[df["is_flagged"] == True].copy()
    flagged = flagged.fillna("")

    transactions = flagged.to_dict(orient="records")

    return {
        "total_transactions": len(df),
        "flagged_transactions": len(flagged),
        "high_risk_count": int((flagged["risk_level"] == "high").sum()),
        "medium_risk_count": int((flagged["risk_level"] == "medium").sum()),
        "low_risk_count": int((flagged["risk_level"] == "low").sum()),
        "transactions": transactions,
    }


@app.get("/download-flagged-csv")
async def download_flagged_csv():
    output_path = DATA_DIR / "transactions_flagged.csv"

    if not output_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No flagged CSV file found. Please upload and analyze a CSV first.",
        )

    return FileResponse(
        path=output_path,
        filename="transactions_flagged.csv",
        media_type="text/csv",
    )