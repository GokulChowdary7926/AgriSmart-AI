#!/usr/bin/env python3
"""
Weather Prediction Model Training Script
Uses LSTM for time series prediction
"""

import sys
import json
import argparse
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import os

# Try to import TensorFlow
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Warning: TensorFlow not available. Model training will be limited.")

def create_sequences(data, seq_length):
    """Create sequences for LSTM"""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length])
        y.append(data[i+seq_length])
    return np.array(X), np.array(y)

def train_weather_prediction(data_path, output_path, training_id):
    """Train weather prediction LSTM model"""
    
    # Load data
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    
    # Prepare features
    features = ['temperature', 'humidity', 'pressure', 'windSpeed', 'rainfall']
    df_features = df[features].fillna(0)
    
    # Normalize
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(df_features)
    
    # Create sequences
    seq_length = 30
    X, y = create_sequences(scaled_data, seq_length)
    
    # Split
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    if not TENSORFLOW_AVAILABLE:
        # Use simple linear regression as fallback
        from sklearn.linear_model import LinearRegression
        print(f"Training Linear Regression model for weather prediction (TensorFlow not available)...")
        
        # Flatten sequences for linear regression
        X_train_flat = X_train.reshape(X_train.shape[0], -1)
        X_test_flat = X_test.reshape(X_test.shape[0], -1)
        
        model = LinearRegression()
        model.fit(X_train_flat, y_train)
        
        predictions = model.predict(X_test_flat)
        mse = mean_squared_error(y_test, predictions)
        mae = mean_absolute_error(y_test, predictions)
        accuracy = max(0, 1 - (mse / np.var(y_test)))
        
        # Save model
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        joblib.dump(model, output_path.replace('.h5', '.pkl'))
        joblib.dump(scaler, output_path.replace('.h5', '_scaler.pkl'))
    else:
        # Build LSTM model
        print(f"Training LSTM model for weather prediction...")
        model = keras.Sequential([
            layers.LSTM(50, return_sequences=True, input_shape=(seq_length, len(features))),
            layers.LSTM(50, return_sequences=False),
            layers.Dense(25),
            layers.Dense(len(features))
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
        # Train
        history = model.fit(
            X_train, y_train,
            batch_size=32,
            epochs=50,
            validation_split=0.2,
            verbose=1
        )
        
        # Evaluate
        predictions = model.predict(X_test)
        mse = mean_squared_error(y_test, predictions)
        mae = mean_absolute_error(y_test, predictions)
        
        # Calculate accuracy (inverse of normalized error)
        accuracy = max(0, 1 - (mse / np.var(y_test)))
        
        # Save model and scaler
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        model.save(output_path)
        joblib.dump(scaler, output_path.replace('.h5', '_scaler.pkl'))
        
        print(f"METRICS: validation_loss={history.history['val_loss'][-1]:.4f}")
    
    print(f"Model MSE: {mse:.4f}")
    print(f"Model MAE: {mae:.4f}")
    print(f"Model Accuracy: {accuracy:.4f}")
    print(f"METRICS: accuracy={accuracy:.4f}")
    print(f"METRICS: loss={mse:.4f}")
    
    return accuracy

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--training-id', required=True)
    
    args = parser.parse_args()
    
    try:
        import joblib
        accuracy = train_weather_prediction(
            args.data,
            args.output,
            args.training_id
        )
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

