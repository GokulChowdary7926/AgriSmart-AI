#!/usr/bin/env python3
"""
Weather Prediction Model Training Script
Works with or without TensorFlow
"""

import sys
import json
import argparse
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import os

TENSORFLOW_AVAILABLE = False
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("⚠️ TensorFlow not available. Using scikit-learn Random Forest.")

def create_synthetic_weather_data(num_samples=1000):
    """Create synthetic weather data"""
    print(f"Creating {num_samples} synthetic weather samples...")
    
    dates = pd.date_range(start='2020-01-01', periods=num_samples, freq='D')
    
    data = {
        'date': dates,
        'temperature': np.random.normal(25, 5, num_samples),
        'humidity': np.random.normal(65, 15, num_samples),
        'pressure': np.random.normal(1013, 10, num_samples),
        'windSpeed': np.random.normal(10, 5, num_samples),
        'rainfall': np.random.exponential(2, num_samples)
    }
    
    df = pd.DataFrame(data)
    df['temperature'] = np.clip(df['temperature'], -10, 50)
    df['humidity'] = np.clip(df['humidity'], 0, 100)
    df['pressure'] = np.clip(df['pressure'], 980, 1050)
    df['windSpeed'] = np.clip(df['windSpeed'], 0, 50)
    df['rainfall'] = np.clip(df['rainfall'], 0, 100)
    
    return df

def create_sequences(data, seq_length=7):
    """Create sequences for LSTM or time series"""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length])
        y.append(data[i+seq_length])
    return np.array(X), np.array(y)

def train_weather_prediction(data_path=None, output_path=None, training_id=None):
    """Train weather prediction model"""
    
    if not output_path:
        output_path = os.path.join(os.path.dirname(__file__), '..', 'trained', 'weather_prediction')
    os.makedirs(output_path, exist_ok=True)
    
    if not training_id:
        training_id = f"training_{np.random.randint(10000, 99999)}"
    
    print(f"Training ID: {training_id}")
    print(f"Output path: {output_path}")
    
    if data_path and os.path.exists(data_path):
        print(f"Loading data from {data_path}...")
        with open(data_path, 'r') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
    else:
        print("Creating synthetic weather data...")
        df = create_synthetic_weather_data(num_samples=1000)
    
    features = ['temperature', 'humidity', 'pressure', 'windSpeed', 'rainfall']
    df_features = df[features].fillna(0)
    
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(df_features)
    
    seq_length = 7
    X, y = create_sequences(scaled_data, seq_length)
    
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    
    if TENSORFLOW_AVAILABLE:
        print("Training TensorFlow LSTM model...")
        model = keras.Sequential([
            layers.LSTM(50, return_sequences=True, input_shape=(seq_length, len(features))),
            layers.LSTM(50),
            layers.Dense(25),
            layers.Dense(len(features))
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=20, batch_size=32, verbose=1)
        
        val_loss, val_mae = model.evaluate(X_val, y_val, verbose=0)
        print(f"✅ Validation MAE: {val_mae:.4f}")
        
        model_path = os.path.join(output_path, 'model.keras')
        model.save(model_path)
        print(f"✅ Model saved to {model_path}")
    else:
        print("Training Random Forest model...")
        X_train_flat = X_train.reshape(X_train.shape[0], -1)
        X_val_flat = X_val.reshape(X_val.shape[0], -1)
        
        model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
        model.fit(X_train_flat, y_train)
        
        y_pred = model.predict(X_val_flat)
        val_mae = mean_absolute_error(y_val, y_pred)
        val_r2 = r2_score(y_val, y_pred)
        print(f"✅ Validation MAE: {val_mae:.4f}")
        print(f"✅ Validation R²: {val_r2:.4f}")
        
        model_path = os.path.join(output_path, 'model.joblib')
        joblib.dump(model, model_path)
        print(f"✅ Model saved to {model_path}")
    
    scaler_path = os.path.join(output_path, 'scaler.joblib')
    joblib.dump(scaler, scaler_path)
    print(f"✅ Scaler saved to {scaler_path}")
    
    metadata = {
        'training_id': training_id,
        'model_type': 'tensorflow_lstm' if TENSORFLOW_AVAILABLE else 'random_forest',
        'features': features,
        'mae': float(val_mae),
        'tensorflow_available': TENSORFLOW_AVAILABLE
    }
    
    metadata_path = os.path.join(output_path, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Metadata saved to {metadata_path}")
    print("\n✅ Training completed successfully!")
    return True

def main():
    parser = argparse.ArgumentParser(description='Train weather prediction model')
    parser.add_argument('--data', type=str, help='Path to training data (optional, uses synthetic if not provided)')
    parser.add_argument('--output', type=str, help='Output directory for model')
    parser.add_argument('--training-id', type=str, help='Training ID')
    
    args = parser.parse_args()
    
    if not args.data and not args.output and not args.training_id:
        print("No arguments provided. Using defaults and synthetic data...")
        train_weather_prediction()
    else:
        train_weather_prediction(
            data_path=args.data,
            output_path=args.output,
            training_id=args.training_id
        )

if __name__ == "__main__":
    main()
