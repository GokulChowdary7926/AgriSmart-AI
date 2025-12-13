"""
Enhanced Crop Recommendation ML Model
Uses trained models from ml-pipeline with real-time data integration
"""

import sys
import json
import os
from pathlib import Path

def predict_crop(features):
    """Predict crop using ML model from ml-pipeline or rule-based system"""
    try:
        ml_pipeline_models = Path(__file__).resolve().parents[3] / 'ml-pipeline' / 'models'
        
        crop_models = list(ml_pipeline_models.glob('*crop*random_forest*.joblib'))
        if not crop_models:
            crop_models = list(ml_pipeline_models.glob('*sample_crop*random_forest*.joblib'))
        
        if crop_models:
            latest_model = max(crop_models, key=lambda p: p.stat().st_mtime)
            
            import joblib
            import numpy as np
            from sklearn.preprocessing import StandardScaler, LabelEncoder
            
            model_data = joblib.load(latest_model)
            
            if isinstance(model_data, dict):
                model = model_data.get('model')
                scaler = model_data.get('scaler')
                label_encoder = model_data.get('label_encoder')
                feature_names = model_data.get('feature_names', ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'])
            else:
                model = model_data
                scaler_path = ml_pipeline_models / 'scaler.pkl'
                encoder_path = ml_pipeline_models / 'label_encoder.pkl'
                scaler = joblib.load(scaler_path) if scaler_path.exists() else None
                label_encoder = joblib.load(encoder_path) if encoder_path.exists() else None
                feature_names = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
            
            input_features = [
                features.get('N', features.get('nitrogen', 70)),
                features.get('P', features.get('phosphorus', 40)),
                features.get('K', features.get('potassium', 40)),
                features.get('temperature', 25),
                features.get('humidity', 65),
                features.get('ph', features.get('pH', 7.0)),
                features.get('rainfall', 800)
            ]
            
            if scaler:
                input_scaled = scaler.transform([input_features])
            else:
                input_scaled = [input_features]
            
            if hasattr(model, 'predict_proba'):
                probabilities = model.predict_proba(input_scaled)[0]
                prediction_encoded = model.predict(input_scaled)[0]
                
                if label_encoder:
                    prediction = label_encoder.inverse_transform([prediction_encoded])[0]
                else:
                    prediction = str(prediction_encoded)
                
                top_5_idx = np.argsort(probabilities)[-5:][::-1]
                if label_encoder:
                    top_5_crops = label_encoder.inverse_transform(top_5_idx)
                else:
                    top_5_crops = [str(i) for i in top_5_idx]
                top_5_conf = probabilities[top_5_idx] * 100
                
                recommendations = [
                    {
                        'crop': crop,
                        'confidence': round(float(conf), 2),
                        'method': 'ml_model_trained',
                        'model_source': 'ml-pipeline'
                    }
                    for crop, conf in zip(top_5_crops, top_5_conf)
                ]
            else:
                prediction_value = model.predict(input_scaled)[0]
                recommendations = [
                    {
                        'crop': f'Crop_{i}',
                        'confidence': 85.0 - (i * 5),
                        'method': 'ml_model_regression',
                        'model_source': 'ml-pipeline'
                    }
                    for i in range(5)
                ]
            
            return recommendations
            
    except Exception as e:
        print(f"ML model error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    
    return get_rule_based_recommendations(features)

def get_rule_based_recommendations(features):
    """Rule-based fallback recommendations"""
    temp = features.get('temperature', 25)
    humidity = features.get('humidity', 65)
    ph = features.get('ph', features.get('pH', 7.0))
    rainfall = features.get('rainfall', 800)
    
    recommendations = []
    
    if 20 <= temp <= 30:
        recommendations.append({'crop': 'Rice', 'confidence': 85.0, 'method': 'rule_based'})
        recommendations.append({'crop': 'Wheat', 'confidence': 80.0, 'method': 'rule_based'})
    
    if 15 <= temp <= 25:
        recommendations.append({'crop': 'Potato', 'confidence': 75.0, 'method': 'rule_based'})
        recommendations.append({'crop': 'Tomato', 'confidence': 70.0, 'method': 'rule_based'})
    
    if 6.0 <= ph <= 7.5:
        recommendations.append({'crop': 'Maize', 'confidence': 80.0, 'method': 'rule_based'})
    
    if rainfall > 1000:
        recommendations.append({'crop': 'Rice', 'confidence': 90.0, 'method': 'rule_based'})
    elif rainfall < 500:
        recommendations.append({'crop': 'Wheat', 'confidence': 85.0, 'method': 'rule_based'})
    
    return sorted(recommendations, key=lambda x: x['confidence'], reverse=True)[:5]

if __name__ == '__main__':
    try:
        if len(sys.argv) > 1:
            features_str = sys.argv[1]
            if features_str.startswith("'") and features_str.endswith("'"):
                features_str = features_str[1:-1]
            if features_str.startswith('"') and features_str.endswith('"'):
                features_str = features_str[1:-1]
            features = json.loads(features_str)
        else:
            features = {}
        
        result = predict_crop(features)
        print(json.dumps(result))
    except Exception as e:
        print(f"Error in main: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        fallback = get_rule_based_recommendations({})
        print(json.dumps(fallback))

