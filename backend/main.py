import logging
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Union
import pandas as pd
import pickle
from pathlib import Path


log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=log_level, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI(title="Churn Prediction API", version="1.5")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path(__file__).parent / "Telco-Customer-Churn.csv"


MODEL_PATH = Path(__file__).parent / "model.sav"


CATEGORICAL_FEATURES = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "PhoneService",
    "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup",
    "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
    "Contract", "PaperlessBilling", "PaymentMethod", "tenure_group"
]


TENURE_BINS = list(range(1, 80, 12))
TENURE_LABELS = [f"{i}-{i+11}" for i in range(1, 72, 12)]

train_columns = None
model = None

CALIBRATION_FACTOR = float(os.environ.get("CALIBRATION_FACTOR", "2.43"))
CALIBRATE_OUTPUT = True

def calibrate_probability(raw_prob: float) -> float:
    """
    Apply a fixed calibration to the raw probability output.
    The calibrated probability is computed as raw_prob * CALIBRATION_FACTOR 
    and capped at 1.0.
    """
    if CALIBRATE_OUTPUT:
        calibrated = raw_prob * CALIBRATION_FACTOR
        return min(calibrated, 1.0)
    return raw_prob

def load_data_and_prepare_columns():
    """
    Load the dataset from the local CSV file, create tenure groups,
    and prepare one-hot encoded feature columns.
    Updates the global `train_columns` variable.
    """
    global train_columns

    try:
        logging.info("Loading dataset from local CSV file...")
        raw_df = pd.read_csv(DATA_FILE)

        raw_df["tenure_group"] = pd.cut(
            raw_df["tenure"].astype(int),
            bins=TENURE_BINS,
            right=False,
            labels=TENURE_LABELS
        )

        raw_df = raw_df.drop(columns=["tenure", "customerID", "Churn"])

        existing_cols = [col for col in CATEGORICAL_FEATURES if col in raw_df.columns]
        missing_cols = set(CATEGORICAL_FEATURES) - set(existing_cols)
        if missing_cols:
            logging.warning("The following categorical features are missing from CSV and will be skipped: %s", missing_cols)

        train_dummies = pd.get_dummies(raw_df[existing_cols].astype(str))
        train_columns = list(train_dummies.columns)
        logging.info("Training columns prepared successfully from local CSV file.")
    except Exception as e:
        logging.error(f"Error loading data from CSV: {e}")
        raise RuntimeError(f"Data loading failed: {str(e)}")

def load_model():
    """
    Load the pre-trained churn prediction model from a pickle file.
    Ensures that the loaded model supports 'predict_proba'.
    Updates the global `model` variable.
    """
    global model

    try:
        logging.info("Loading model from disk...")
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        if not hasattr(model, "predict_proba"):
            raise RuntimeError("Loaded model does not support predict_proba.")
        logging.info("Model loaded successfully.")
    except Exception as e:
        logging.error(f"Error loading model: {e}")
        raise RuntimeError(f"Model loading failed: {str(e)}")

@app.on_event("startup")
def startup_event():
    """On startup, load both the dataset and the model."""
    load_data_and_prepare_columns()
    load_model()

class CustomerData(BaseModel):
    SeniorCitizen: Union[str, int]
    MonthlyCharges: float
    TotalCharges: float
    gender: str
    Partner: str
    Dependents: str
    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str
    Contract: str
    PaperlessBilling: str
    PaymentMethod: str
    tenure: int

def preprocess_input(input_data: dict) -> pd.DataFrame:
    """
    Process raw input data by converting 'SeniorCitizen', handling 'TotalCharges',
    creating a 'tenure_group', and safely casting categorical features to string.
    Returns a DataFrame for one-hot encoding.
    """
    try:
        input_data["TotalCharges"] = float(input_data["TotalCharges"])
    except (ValueError, TypeError):
        input_data["TotalCharges"] = 0.0
        logging.warning("Invalid TotalCharges received. Set to 0.0.")

    if isinstance(input_data["SeniorCitizen"], str):
        input_data["SeniorCitizen"] = 1 if input_data["SeniorCitizen"].strip().lower() == "yes" else 0

    df = pd.DataFrame([input_data])
    
    df["tenure_group"] = pd.cut(
        df["tenure"].astype(int),
        bins=TENURE_BINS,
        right=False,
        labels=TENURE_LABELS
    )
    df = df.drop(columns=["tenure"])

    safe_cols = [col for col in CATEGORICAL_FEATURES if col in df.columns]
    missing_cols = set(CATEGORICAL_FEATURES) - set(safe_cols)
    if missing_cols:
        logging.warning("The following categorical features are missing in the input and will be skipped: %s", missing_cols)

    df[safe_cols] = df[safe_cols].astype(str)
    return df

@app.post("/predict")
async def predict(data: CustomerData):
    """
    Predict customer churn probability and return a calibrated confidence percentage.
    The classification decision is based on the raw probability against a threshold.
    """
    try:
        input_dict = data.dict()
        df = preprocess_input(input_dict)

       
        safe_cols = [col for col in CATEGORICAL_FEATURES if col in df.columns]
        encoded = pd.get_dummies(df[safe_cols])
        encoded = encoded.reindex(columns=train_columns, fill_value=0)

        raw_proba = model.predict_proba(encoded)[0][1]
        calibrated_proba = calibrate_probability(raw_proba)
        confidence = round(calibrated_proba * 100, 2)

        prediction = "This customer is likely to churn." if raw_proba >= 0.3 else "This customer is likely to continue"

        logging.info(
            f"Raw probability: {raw_proba:.4f} | Calibrated: {calibrated_proba:.4f} | "
            f"Prediction: {prediction} | Confidence: {confidence}%"
        )

        return {
            "prediction": prediction,
            "confidence": f"{confidence}%",
            "threshold": 0.3
        }
    except Exception as e:
        logging.error(f"Error during prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/features")
async def get_feature_columns():
    """Return the list of one-hot encoded feature columns used during training."""
    if train_columns is None:
        raise HTTPException(status_code=500, detail="Training features are not available")
    return {"features": train_columns}

@app.get("/health")
async def health_check():
    """Simple health-check endpoint."""
    return {"status": "healthy"}

@app.post("/reload")
async def reload_data_and_model():
    """
    Reload the CSV data file and the pre-trained model.
    This endpoint allows updating the model and underlying data without restarting the server.
    """
    try:
        load_data_and_prepare_columns()
        load_model()
        logging.info("Data and model reloaded successfully via /reload endpoint.")
        return {"status": "Reload successful"}
    except Exception as e:
        logging.error(f"Error during reload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=True)
