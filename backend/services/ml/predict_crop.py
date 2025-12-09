#!/usr/bin/env python3
"""
Crop Recommendation ML Model
Uses trained model or rule-based fallback
"""

import sys
import json
import os

def predict_crop(features):
    """Predict crop using ML model or rule-based system"""
    try:
        # Try to load trained model
        model_path = os.path.join(os.path.dirname(__file__), '../../models/crop_recommender.pkl')
        
        if os.path.exists(model_path):
            import joblib
            import numpy as np
            from sklearn.preprocessing import StandardScaler, LabelEncoder
            
            model = joblib.load(model_path)
            scaler = joblib.load(os.path.join(os.path.dirname(__file__), '../../models/scaler.pkl'))
            label_encoder = joblib.load(os.path.join(os.path.dirname(__file__), '../../models/label_encoder.pkl'))
            
            # Prepare input
            input_features = [
                features.get('N', 70),
                features.get('P', 40),
                features.get('K', 40),
                features.get('temperature', 25),
                features.get('humidity', 65),
                features.get('ph', 7.0),
                features.get('rainfall', 800)
            ]
            
            # Scale and predict
            input_scaled = scaler.transform([input_features])
            prediction_encoded = model.predict(input_scaled)[0]
            prediction = label_encoder.inverse_transform([prediction_encoded])[0]
            
            # Get probabilities
            probabilities = model.predict_proba(input_scaled)[0]
            confidence = max(probabilities) * 100
            
            # Get top 5
            top_5_idx = np.argsort(probabilities)[-5:][::-1]
            top_5_crops = label_encoder.inverse_transform(top_5_idx)
            top_5_conf = probabilities[top_5_idx] * 100
            
            recommendations = [
                {'crop': crop, 'confidence': round(float(conf), 2), 'method': 'ml_model'}
                for crop, conf in zip(top_5_crops, top_5_conf)
            ]
            
            return recommendations
    except Exception as e:
        print(f"ML model error: {e}", file=sys.stderr)
    
    # Fallback to rule-based
    return get_rule_based_recommendations(features)

def get_rule_based_recommendations(features):
    """Rule-based fallback recommendations"""
    temp = features.get('temperature', 25)
    rainfall = features.get('rainfall', 800)
    ph = features.get('ph', 7.0)
    soil_type = features.get('soil_type', 'alluvial')
    
    recommendations = []
    
    if temp > 30 and rainfall > 1000:
        crops = ['Rice', 'Sugarcane', 'Jute', 'Banana', 'Coconut']
        base_conf = 90
    elif temp > 25 and rainfall > 500:
        crops = ['Cotton', 'Maize', 'Soybean', 'Groundnut', 'Turmeric']
        base_conf = 85
    elif temp > 20 and rainfall > 300:
        crops = ['Wheat', 'Barley', 'Mustard', 'Chickpea', 'Lentil']
        base_conf = 80
    else:
        crops = ['Pearl Millet', 'Finger Millet', 'Sorghum', 'Pigeon Pea', 'Green Gram']
        base_conf = 75
    
    # Adjust confidence based on soil type
    if soil_type in ['black', 'clay'] and any(c in crops for c in ['Cotton', 'Sugarcane']):
        soil_bonus = 10
    elif soil_type == 'alluvial' and any(c in crops for c in ['Rice', 'Wheat']):
        soil_bonus = 10
    else:
        soil_bonus = 0
    
    for i, crop in enumerate(crops[:5]):
        confidence = base_conf - (i * 5) + soil_bonus
        confidence = max(50, min(100, confidence))
        recommendations.append({
            'crop': crop,
            'confidence': round(confidence, 2),
            'method': 'rule_based'
        })
    
    return recommendations

def main():
    """Main function - called from Node.js"""
    try:
        if len(sys.argv) > 1:
            features = json.loads(sys.argv[1])
        else:
            features = {}
        
        recommendations = predict_crop(features)
        print(json.dumps(recommendations))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        fallback = get_rule_based_recommendations({})
        print(json.dumps(fallback))

if __name__ == "__main__":
    main()


