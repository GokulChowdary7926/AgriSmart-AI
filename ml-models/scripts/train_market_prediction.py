#!/usr/bin/env python3
"""
Market Price Prediction Model Training Script
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

def create_synthetic_market_data(num_samples=1000):
    """Create synthetic market price data"""
    print(f"Creating {num_samples} synthetic market price samples...")
    
    crops = ['rice', 'wheat', 'maize', 'potato', 'tomato', 'onion', 'cotton', 'sugarcane']
    
    data = []
    for i in range(num_samples):
        crop = np.random.choice(crops)
        base_price = {'rice': 45, 'wheat': 30, 'maize': 25, 'potato': 20, 
                     'tomato': 35, 'onion': 40, 'cotton': 60, 'sugarcane': 35}[crop]
        
        data.append({
            'date': f"2024-{(i % 365) // 30 + 1:02d}-{(i % 30) + 1:02d}",
            'crop': crop,
            'price': base_price + np.random.normal(0, 5),
            'market': np.random.choice(['Delhi', 'Mumbai', 'Pune', 'Bangalore']),
            'state': np.random.choice(['Maharashtra', 'Punjab', 'Haryana', 'Karnataka']),
            'arrival': np.random.normal(100, 20),
            'min_price': base_price - 5 + np.random.normal(0, 2),
            'max_price': base_price + 5 + np.random.normal(0, 2)
        })
    
    df = pd.DataFrame(data)
    df['price'] = np.clip(df['price'], 10, 200)
    df['min_price'] = np.clip(df['min_price'], 5, 150)
    df['max_price'] = np.clip(df['max_price'], 15, 250)
    
    return df

def create_sequences(data, seq_length=7):
    """Create sequences for LSTM or time series"""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length])
        y.append(data[i+seq_length])
    return np.array(X), np.array(y)

def train_market_prediction(data_path=None, output_path=None, training_id=None):
    """Train market price prediction model"""
    
    if not output_path:
        output_path = os.path.join(os.path.dirname(__file__), '..', 'trained', 'market_prediction')
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
        print("Creating synthetic market price data...")
        df = create_synthetic_market_data(num_samples=1000)
    
    if 'price' in df.columns:
        price_data = df['price'].ffill().values.reshape(-1, 1)
    elif 'value' in df.columns:
        price_data = df['value'].ffill().values.reshape(-1, 1)
    else:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            price_data = df[numeric_cols[0]].fillna(method='ffill').values.reshape(-1, 1)
        else:
            print("❌ No numeric columns found in data")
            return False
    
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(price_data).flatten()
    
    seq_length = 7
    X, y = create_sequences(scaled_data, seq_length)
    
    X = X.reshape(X.shape[0], X.shape[1], 1)
    
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    
    if TENSORFLOW_AVAILABLE:
        print("Training TensorFlow LSTM model...")
        model = keras.Sequential([
            layers.LSTM(50, return_sequences=True, input_shape=(seq_length, 1)),
            layers.LSTM(50),
            layers.Dense(25),
            layers.Dense(1)
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
        'mae': float(val_mae),
        'r2': float(val_r2) if not TENSORFLOW_AVAILABLE else None,
        'tensorflow_available': TENSORFLOW_AVAILABLE
    }
    
    metadata_path = os.path.join(output_path, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Metadata saved to {metadata_path}")
    print("\n✅ Training completed successfully!")
    return True

def main():
    parser = argparse.ArgumentParser(description='Train market price prediction model')
    parser.add_argument('--data', type=str, help='Path to training data (optional, uses synthetic if not provided)')
    parser.add_argument('--output', type=str, help='Output directory for model')
    parser.add_argument('--training-id', type=str, help='Training ID')
    
    args = parser.parse_args()
    
    if not args.data and not args.output and not args.training_id:
        print("No arguments provided. Using defaults and synthetic data...")
        train_market_prediction()
    else:
        train_market_prediction(
            data_path=args.data,
            output_path=args.output,
            training_id=args.training_id
        )

if __name__ == "__main__":
    main()
