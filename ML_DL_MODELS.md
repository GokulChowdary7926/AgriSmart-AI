# 🤖 Machine Learning & Deep Learning Models Documentation

## Overview

AgriSmart AI utilizes a comprehensive suite of Machine Learning (ML) and Deep Learning (DL) models to provide intelligent agricultural recommendations, disease detection, market price predictions, and weather forecasting. This document describes the models, datasets, training methods, and implementation details.

---

## 📊 Models Overview

### 1. **Crop Recommendation Model**
**Type:** Machine Learning (Supervised Learning)  
**Algorithm:** XGBoost Classifier  
**Purpose:** Recommend suitable crops based on environmental and soil conditions

### 2. **Disease Detection Model**
**Type:** Deep Learning (Computer Vision)  
**Algorithm:** Convolutional Neural Network (CNN) / YOLOv8  
**Purpose:** Detect and classify crop diseases from images

### 3. **Market Price Prediction Model**
**Type:** Deep Learning (Time Series)  
**Algorithm:** Long Short-Term Memory (LSTM) Network  
**Purpose:** Predict future market prices for agricultural commodities

### 4. **Weather Prediction Model**
**Type:** Machine Learning (Time Series)  
**Algorithm:** LSTM / ARIMA  
**Purpose:** Forecast weather conditions for agricultural planning

---

## 🌾 1. Crop Recommendation Model

### Model Architecture

**Primary Model:** XGBoost Classifier
- **Algorithm:** Gradient Boosting Decision Trees
- **Framework:** XGBoost (Python)
- **Fallback:** Random Forest Classifier
- **JavaScript Fallback:** Rule-based scoring system

### Features (Input Variables)

The model uses 7 key features for crop recommendation:

1. **N (Nitrogen)** - Soil nitrogen content (10-100 ppm)
2. **P (Phosphorus)** - Soil phosphorus content (10-100 ppm)
3. **K (Potassium)** - Soil potassium content (10-100 ppm)
4. **Temperature** - Average temperature (°C, 15-35°C)
5. **Humidity** - Relative humidity (40-95%)
6. **pH** - Soil pH level (4.5-8.5)
7. **Rainfall** - Annual rainfall (50-300 mm)

### Dataset

**Source:** `backend/data/crop_data.json`

**Dataset Characteristics:**
- **Format:** JSON array of crop records
- **Size:** 1000+ samples (can be extended)
- **Crops Covered:** 22+ crop types including:
  - Grains: Rice, Wheat, Maize, Bajra, Jowar, Ragi
  - Pulses: Toor Dal, Moong Dal, Urad Dal, Chana Dal, Masoor Dal, Rajma
  - Cash Crops: Cotton, Sugarcane, Jute, Tobacco
  - Oilseeds: Groundnut, Mustard, Sunflower, Sesame, Soybean, Coconut
  - Fruits: Banana, Mango, Apple, Orange, Grapes, Pomegranate
  - Vegetables: Tomato, Potato, Onion, Brinjal, Cabbage, Cauliflower

**Data Structure:**
```json
{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 20.879744,
  "humidity": 82.002744,
  "ph": 6.502985,
  "rainfall": 202.935536,
  "label": "rice"
}
```

### Training Method

**Script:** `backend/services/ml/train_model.py`

**Training Process:**

1. **Data Loading:**
   - Load dataset from JSON file
   - Convert to pandas DataFrame
   - Handle missing values

2. **Data Preprocessing:**
   - Feature extraction (N, P, K, temperature, humidity, ph, rainfall)
   - Label encoding for crop names
   - Feature scaling using StandardScaler
   - Train-test split (80-20 ratio, random_state=42)

3. **Model Training:**
   ```python
   XGBClassifier(
       n_estimators=100,      # Number of boosting rounds
       max_depth=6,           # Maximum tree depth
       learning_rate=0.1,     # Step size shrinkage
       random_state=42        # Reproducibility
   )
   ```

4. **Model Evaluation:**
   - Accuracy score calculation
   - Classification report (precision, recall, F1-score)
   - Confusion matrix analysis

5. **Model Persistence:**
   - Save trained model: `crop_recommender.pkl`
   - Save scaler: `scaler.pkl`
   - Save label encoder: `label_encoder.pkl`

**Expected Accuracy:** 85-95% (depending on dataset quality)

### Prediction Process

**Script:** `backend/services/ml/predict_crop.py`

**Prediction Flow:**

1. Load trained model, scaler, and encoder
2. Preprocess input features (scale using saved scaler)
3. Generate predictions with confidence scores
4. Return top 5 crop recommendations with probabilities
5. Fallback to rule-based system if ML model unavailable

**Output Format:**
```json
[
  {
    "crop": "rice",
    "confidence": 92.5,
    "method": "ml_model"
  },
  {
    "crop": "wheat",
    "confidence": 87.3,
    "method": "ml_model"
  }
]
```

### Integration

- **Backend Service:** `backend/services/ml/CropRecommenderML.js`
- **Controller:** `backend/controllers/CropController.js`
- **API Endpoint:** `POST /api/crops/recommend`

---

## 🦠 2. Disease Detection Model

### Model Architecture

**Primary Model:** Convolutional Neural Network (CNN)
- **Framework:** TensorFlow/Keras
- **Alternative:** YOLOv8 (for object detection)
- **Input Shape:** 224x224x3 (RGB images)
- **Output Classes:** 38 disease classes

### CNN Architecture

```python
Sequential([
    Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
    MaxPooling2D((2, 2)),
    Conv2D(64, (3, 3), activation='relu'),
    MaxPooling2D((2, 2)),
    Conv2D(128, (3, 3), activation='relu'),
    MaxPooling2D((2, 2)),
    Flatten(),
    Dense(128, activation='relu'),
    Dropout(0.5),
    Dense(38, activation='softmax')  # 38 disease classes
])
```

**Architecture Details:**
- **Convolutional Layers:** 3 layers with increasing filters (32, 64, 128)
- **Pooling:** MaxPooling after each conv layer (reduces spatial dimensions)
- **Regularization:** Dropout (0.5) to prevent overfitting
- **Activation:** ReLU for hidden layers, Softmax for output
- **Optimizer:** Adam optimizer
- **Loss Function:** Categorical cross-entropy

### Dataset

**Source:** Plant Village Dataset (or custom dataset)

**Dataset Characteristics:**
- **Image Format:** RGB images (JPG/PNG)
- **Image Size:** 224x224 pixels (resized)
- **Classes:** 38 disease categories
- **Augmentation:** Rotation, flipping, brightness adjustment
- **Split:** 70% train, 15% validation, 15% test

**Disease Categories Include:**
- Apple diseases (scab, black rot, cedar rust)
- Corn diseases (blight, common rust, gray leaf spot)
- Grape diseases (black rot, esca, leaf blight)
- Potato diseases (early blight, late blight)
- Tomato diseases (bacterial spot, early blight, late blight, leaf mold)
- And more...

### Training Method

**Script:** `ml-models/scripts/train_disease_detection.py`

**Training Process:**

1. **Data Preprocessing:**
   - Image loading and resizing to 224x224
   - Data augmentation (rotation, flip, brightness)
   - Normalization (pixel values 0-1)
   - One-hot encoding for labels

2. **Model Compilation:**
   ```python
   model.compile(
       optimizer='adam',
       loss='categorical_crossentropy',
       metrics=['accuracy']
   )
   ```

3. **Training:**
   - Batch size: 32
   - Epochs: 50-100 (with early stopping)
   - Validation split: 20%
   - Callbacks: ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

4. **Evaluation:**
   - Accuracy on test set
   - Per-class precision and recall
   - Confusion matrix

**Expected Accuracy:** 90-95% (on Plant Village dataset)

### Prediction Process

**Script:** `ml-models/disease-detection/predict.py`

**Prediction Flow:**

1. Load trained model (`.h5` or `.pt` format)
2. Preprocess input image (resize, normalize)
3. Run inference through CNN
4. Get class probabilities
5. Return top disease predictions with confidence scores

**Output Format:**
```json
{
  "disease": "Tomato Early Blight",
  "confidence": 0.94,
  "bbox": [x, y, width, height],  // If using YOLO
  "treatment": "Apply fungicides...",
  "prevention": "Maintain proper spacing..."
}
```

### Integration

- **Backend Service:** `backend/services/diseaseDetectionService.js`
- **Controller:** `backend/controllers/DiseaseController.js`
- **API Endpoint:** `POST /api/diseases/detect`

---

## 💰 3. Market Price Prediction Model

### Model Architecture

**Primary Model:** Long Short-Term Memory (LSTM) Network
- **Framework:** TensorFlow/Keras
- **Type:** Time Series Forecasting
- **Architecture:** Multi-layer LSTM with dropout

### LSTM Architecture

```python
Sequential([
    LSTM(100, return_sequences=True, input_shape=(seq_length, 1)),
    Dropout(0.2),
    LSTM(100, return_sequences=False),
    Dropout(0.2),
    Dense(50),
    Dense(1)  # Price prediction
])
```

**Architecture Details:**
- **LSTM Layers:** 2 layers with 100 units each
- **Sequence Length:** 30-60 days (configurable)
- **Dropout:** 0.2 after each LSTM layer
- **Dense Layers:** 2 layers (50 units, then 1 output)
- **Optimizer:** Adam
- **Loss Function:** Mean Squared Error (MSE)

### Dataset

**Source:** 
- AgMarkNet API (real-time market data)
- Historical price data from state mandis
- Custom database: `backend/data/ricePrices.js` (35+ rice price entries)

**Dataset Characteristics:**
- **Features:** Price, date, commodity, market, state, quality
- **Time Series:** Daily price data
- **Commodities:** 70+ agricultural products
- **Markets:** 100+ markets across India
- **Time Range:** Historical data + real-time updates

**Data Structure:**
```json
{
  "commodity": "Rice",
  "variety": "Basmati",
  "market": "Mumbai APMC",
  "state": "Maharashtra",
  "pricePerKg": 125,
  "date": "2024-12-09",
  "priceHistory": [122, 123, 124, 125]
}
```

### Training Method

**Script:** `ml-models/scripts/train_market_prediction.py`

**Training Process:**

1. **Data Preprocessing:**
   - Load historical price data
   - Create sequences (sliding window: 30-60 days)
   - Normalize prices using MinMaxScaler
   - Split into train/validation/test sets

2. **Sequence Creation:**
   ```python
   # Create sequences of length 30
   X = [prices[i:i+30] for i in range(len(prices)-30)]
   y = [prices[i+30] for i in range(len(prices)-30)]
   ```

3. **Model Training:**
   - Batch size: 32
   - Epochs: 100
   - Validation split: 20%
   - Early stopping to prevent overfitting

4. **Evaluation Metrics:**
   - Mean Squared Error (MSE)
   - Mean Absolute Error (MAE)
   - R² Score (coefficient of determination)
   - Accuracy: R² score (0-1 range)

**Expected Performance:**
- **MSE:** < 100 (for prices in ₹/kg)
- **MAE:** < 10 (for prices in ₹/kg)
- **R² Score:** 0.85-0.95

### Prediction Process

**Prediction Flow:**

1. Load historical prices for commodity
2. Create input sequence (last 30-60 days)
3. Normalize sequence
4. Predict next day/week/month price
5. Denormalize prediction
6. Return price forecast with confidence interval

**Output Format:**
```json
{
  "commodity": "Rice",
  "currentPrice": 125.00,
  "predictedPrice": 128.50,
  "confidence": 0.87,
  "trend": "increasing",
  "forecast": [
    {"date": "2024-12-10", "price": 128.50},
    {"date": "2024-12-11", "price": 130.20}
  ]
}
```

### Integration

- **Backend Service:** `backend/services/marketPriceAPIService.js`
- **Controller:** `backend/controllers/MarketController.js`
- **API Endpoint:** `GET /api/market/trends`

---

## 🌤️ 4. Weather Prediction Model

### Model Architecture

**Primary Model:** LSTM Network (Time Series)
- **Framework:** TensorFlow/Keras
- **Alternative:** ARIMA (for simpler forecasts)
- **Purpose:** Predict temperature, rainfall, humidity

### LSTM Architecture

Similar to Market Price Prediction:
- **LSTM Layers:** 2-3 layers
- **Sequence Length:** 7-30 days
- **Output:** Multiple outputs (temperature, rainfall, humidity)

### Dataset

**Source:** OpenWeatherMap API (historical + real-time)

**Dataset Characteristics:**
- **Features:** Temperature, humidity, rainfall, wind speed, pressure
- **Time Series:** Hourly/daily weather data
- **Geographic Coverage:** All Indian states
- **Update Frequency:** Real-time (every 5 minutes)

### Training Method

**Script:** `ml-models/scripts/train_weather_prediction.py`

**Training Process:**

1. Load historical weather data
2. Create sequences (7-30 days)
3. Train LSTM model
4. Evaluate using MSE, MAE

**Expected Performance:**
- **Temperature Accuracy:** ±2°C
- **Rainfall Accuracy:** ±10mm
- **Humidity Accuracy:** ±5%

### Integration

- **Backend Service:** `backend/services/WeatherService.js`
- **Controller:** `backend/controllers/WeatherController.js`
- **API Endpoint:** `GET /api/weather/forecast`

---

## 🛠️ Technology Stack

### ML/DL Frameworks

1. **XGBoost** - Gradient boosting for crop recommendation
2. **TensorFlow/Keras** - Deep learning for disease detection and time series
3. **Scikit-learn** - Traditional ML algorithms and preprocessing
4. **PyTorch** - Alternative DL framework (for YOLOv8)
5. **NumPy/Pandas** - Data manipulation and processing

### Python Libraries

**Requirements:** `backend/services/ml/requirements.txt`
```
pandas>=1.5.0
numpy>=1.23.0
scikit-learn>=1.2.0
xgboost>=1.7.0
joblib>=1.2.0
```

**Deep Learning Requirements:** `ml-models/requirements.txt`
```
tensorflow>=2.10.0
keras>=2.10.0
torch>=1.13.0
torchvision>=0.14.0
opencv-python>=4.6.0
pillow>=9.3.0
ultralytics>=8.0.0  # For YOLOv8
```

---

## 📈 Training Workflow

### 1. Crop Recommendation Training

```bash
cd backend/services/ml
python3 train_model.py
```

**Output:**
- `crop_recommender.pkl` - Trained model
- `scaler.pkl` - Feature scaler
- `label_encoder.pkl` - Label encoder

### 2. Disease Detection Training

```bash
cd ml-models/scripts
python3 train_disease_detection.py --data_path ../data/disease_images --output_path ../models/disease_model.h5
```

**Output:**
- `disease_model.h5` - Trained CNN model
- Training history and metrics

### 3. Market Price Prediction Training

```bash
cd ml-models/scripts
python3 train_market_prediction.py --data_path ../data/market_prices.json --output_path ../models/market_lstm.h5
```

**Output:**
- `market_lstm.h5` - Trained LSTM model
- `market_lstm_scaler.pkl` - Price scaler

### 4. Weather Prediction Training

```bash
cd ml-models/scripts
python3 train_weather_prediction.py --data_path ../data/weather_data.json --output_path ../models/weather_lstm.h5
```

---

## 🔄 Model Deployment

### Production Deployment

1. **Model Storage:**
   - Models saved in `backend/models/` directory
   - Version controlled with Git LFS (for large models)

2. **Model Loading:**
   - Models loaded on server startup
   - Cached in memory for fast inference
   - Fallback to rule-based systems if models unavailable

3. **API Integration:**
   - RESTful API endpoints for predictions
   - Async processing for heavy computations
   - Error handling and fallback mechanisms

### Fallback Mechanisms

All ML/DL models have fallback systems:

1. **Crop Recommendation:**
   - ML Model → Rule-based scoring → Default recommendations

2. **Disease Detection:**
   - CNN Model → Image analysis → Database lookup → General advice

3. **Market Price:**
   - LSTM Model → Historical average → Real-time API → Mock data

4. **Weather:**
   - LSTM Model → OpenWeatherMap API → Historical averages

---

## 📊 Model Performance Metrics

### Crop Recommendation Model
- **Accuracy:** 85-95%
- **Precision:** 0.88-0.93
- **Recall:** 0.85-0.92
- **F1-Score:** 0.86-0.92

### Disease Detection Model
- **Accuracy:** 90-95%
- **Precision:** 0.91-0.94
- **Recall:** 0.89-0.93
- **F1-Score:** 0.90-0.93

### Market Price Prediction Model
- **MSE:** < 100
- **MAE:** < 10
- **R² Score:** 0.85-0.95
- **Direction Accuracy:** 80-90%

### Weather Prediction Model
- **Temperature MAE:** ±2°C
- **Rainfall MAE:** ±10mm
- **Humidity MAE:** ±5%

---

## 🔬 Model Improvement Strategies

### 1. Data Augmentation
- **Crop Data:** Synthetic data generation for underrepresented crops
- **Disease Images:** Rotation, flipping, color jittering
- **Price Data:** Time series augmentation

### 2. Hyperparameter Tuning
- Grid search for optimal parameters
- Bayesian optimization
- Cross-validation for model selection

### 3. Ensemble Methods
- Combine multiple models for better accuracy
- Voting classifiers for crop recommendation
- Stacked models for price prediction

### 4. Transfer Learning
- Pre-trained models for disease detection
- Fine-tuning on agricultural datasets
- Knowledge transfer from similar domains

---

## 📚 Datasets Used

### 1. Crop Recommendation Dataset
- **Source:** Custom dataset + Kaggle agricultural datasets
- **Location:** `backend/data/crop_data.json`
- **Size:** 1000+ samples
- **Update Frequency:** Manual updates

### 2. Disease Detection Dataset
- **Source:** Plant Village Dataset
- **Location:** External dataset (can be downloaded)
- **Size:** 50,000+ images
- **Classes:** 38 disease categories

### 3. Market Price Dataset
- **Source:** AgMarkNet API + Custom database
- **Location:** `backend/data/ricePrices.js`, `backend/data/market_prices.json`
- **Size:** 35+ rice entries, 1000+ price records
- **Update Frequency:** Real-time (every 5 minutes)

### 4. Weather Dataset
- **Source:** OpenWeatherMap API
- **Location:** Real-time API calls
- **Update Frequency:** Every 5 minutes

---

## 🚀 Future Enhancements

### Planned Improvements

1. **Advanced Models:**
   - Transformer models for time series
   - Vision Transformers (ViT) for disease detection
   - Graph Neural Networks for market analysis

2. **Real-time Learning:**
   - Online learning for price prediction
   - Incremental model updates
   - Active learning for disease detection

3. **Explainability:**
   - SHAP values for model interpretability
   - Feature importance visualization
   - Decision tree explanations

4. **Federated Learning:**
   - Distributed model training
   - Privacy-preserving learning
   - Collaborative model improvement

---

## 📝 References

- **XGBoost Documentation:** https://xgboost.readthedocs.io/
- **TensorFlow Documentation:** https://www.tensorflow.org/
- **Plant Village Dataset:** https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset
- **AgMarkNet API:** https://agmarknet.gov.in/
- **OpenWeatherMap API:** https://openweathermap.org/api

---

## 👥 Contributors

- AgriSmart AI Development Team
- ML/DL Model Development: Backend Team
- Dataset Curation: Data Science Team

---

**Last Updated:** December 2024  
**Version:** 1.0.0
