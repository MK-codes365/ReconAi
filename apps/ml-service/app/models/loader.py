import os
import joblib
import json

MODEL_PATH = "artifacts/recovery_model.joblib"
METADATA_PATH = "artifacts/model_metadata.json"

class ModelLoader:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.load()

    def load(self):
        if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
            from app.training.train import train_and_evaluate
            self.metadata = train_and_evaluate()
            self.model = joblib.load(MODEL_PATH)
        else:
            self.model = joblib.load(MODEL_PATH)
            with open(METADATA_PATH, "r") as f:
                self.metadata = json.load(f)

    def is_ready(self) -> bool:
        return self.model is not None

model_loader = ModelLoader()
