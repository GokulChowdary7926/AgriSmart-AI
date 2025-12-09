#!/usr/bin/env python3
"""
Train Crop Recommendation ML Model
Uses XGBoost on crop recommendation dataset
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

def train_model():
    """Train the crop recommendation model"""
    try:
        # Load dataset
        dataset_path = os.path.join(os.path.dirname(__file__), '../../data/crop_data.json')
        
        if os.path.exists(dataset_path):
            import json
            with open(dataset_path, 'r') as f:
                data = json.load(f)
            df = pd.DataFrame(data)
        else:
            # Create sample dataset
            print("Creating sample dataset...")
            df = create_sample_dataset()
        
        print(f"📊 Dataset loaded: {len(df)} samples, {df['label'].nunique()} crops")
        
        # Prepare features and labels
        feature_columns = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        X = df[feature_columns]
        y = df['label']
        
        # Encode labels
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train XGBoost model
        print("🤖 Training XGBoost model...")
        model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✅ Model trained with accuracy: {accuracy:.2%}")
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
        
        # Save models
        models_dir = os.path.join(os.path.dirname(__file__), '../../models')
        os.makedirs(models_dir, exist_ok=True)
        
        model_path = os.path.join(models_dir, 'crop_recommender.pkl')
        scaler_path = os.path.join(models_dir, 'scaler.pkl')
        encoder_path = os.path.join(models_dir, 'label_encoder.pkl')
        
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump(label_encoder, encoder_path)
        
        print(f"\n💾 Models saved to:")
        print(f"   - {model_path}")
        print(f"   - {scaler_path}")
        print(f"   - {encoder_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error training model: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_sample_dataset():
    """Create sample dataset if real data not available"""
    data = {
        'N': np.random.randint(10, 100, 1000),
        'P': np.random.randint(10, 100, 1000),
        'K': np.random.randint(10, 100, 1000),
        'temperature': np.random.uniform(15, 35, 1000),
        'humidity': np.random.uniform(40, 95, 1000),
        'ph': np.random.uniform(4.5, 8.5, 1000),
        'rainfall': np.random.uniform(50, 300, 1000),
        'label': np.random.choice([
            'rice', 'wheat', 'maize', 'cotton', 'sugarcane',
            'pulses', 'groundnut', 'soybean', 'chickpea', 'lentil'
        ], 1000)
    }
    return pd.DataFrame(data)

if __name__ == "__main__":
    print("🌾 Training Crop Recommendation ML Model")
    print("=" * 50)
    success = train_model()
    if success:
        print("\n🎉 Model training completed successfully!")
    else:
        print("\n❌ Model training failed!")
        exit(1)


