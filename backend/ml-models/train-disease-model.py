
import numpy as np
import pandas as pd
import os
import json
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

TENSORFLOW_AVAILABLE = False
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, models
    TENSORFLOW_AVAILABLE = True
    print("✅ TensorFlow available - using CNN model")
except ImportError:
    print("⚠️ TensorFlow not available - using scikit-learn Random Forest (works without TensorFlow)")
    TENSORFLOW_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    print("⚠️ OpenCV not available - using basic image processing")
    CV2_AVAILABLE = False

class DiseaseDetectionModel:
    def __init__(self):
        self.model = None
        self.classes = []
        self.img_size = 224
        self.use_tensorflow = TENSORFLOW_AVAILABLE
        
    def create_tensorflow_model(self, num_classes):
        """Create CNN model for disease detection (TensorFlow)"""
        model = models.Sequential([
            layers.Input(shape=(self.img_size, self.img_size, 3)),
            layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            layers.Flatten(),
            layers.Dense(512, activation='relu'),
            layers.Dropout(0.5),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.5),
            layers.Dense(num_classes, activation='softmax')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        return model
    
    def create_sklearn_model(self, num_classes):
        """Create Random Forest model (scikit-learn fallback)"""
        return RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            random_state=42,
            n_jobs=-1,
            verbose=0
        )
    
    def create_synthetic_data(self, num_samples=2000):
        """Create synthetic training data"""
        print(f"Creating {num_samples} synthetic training samples...")
        
        classes = [
            'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
            'Blueberry___healthy', 'Cherry___healthy', 'Cherry___Powdery_mildew',
            'Corn___Cercospora_leaf_spot', 'Corn___Common_rust', 'Corn___Northern_Leaf_Blight', 'Corn___healthy',
            'Grape___Black_rot', 'Grape___Esca', 'Grape___Leaf_blight', 'Grape___healthy',
            'Orange___Haunglongbing', 'Peach___Bacterial_spot', 'Peach___healthy',
            'Pepper_bell___Bacterial_spot', 'Pepper_bell___healthy',
            'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy',
            'Raspberry___healthy', 'Soybean___healthy', 'Squash___Powdery_mildew',
            'Strawberry___Leaf_scorch', 'Strawberry___healthy',
            'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight',
            'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot', 'Tomato___Spider_mites',
            'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
            'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
        ]
        
        self.classes = classes
        num_classes = len(classes)
        
        if self.use_tensorflow:
            feature_size = self.img_size * self.img_size * 3
            X = np.random.rand(num_samples, self.img_size, self.img_size, 3).astype(np.float32)
            X = X / 255.0
        else:
            feature_size = 1000
            X = np.random.rand(num_samples, feature_size).astype(np.float32)
        
        y = np.random.randint(0, num_classes, num_samples)
        
        if self.use_tensorflow:
            y = keras.utils.to_categorical(y, num_classes)
        
        return X, y, classes
    
    def train(self, epochs=30, batch_size=16):
        """Train the model"""
        print("=" * 60)
        print("Training Disease Detection Model")
        print("=" * 60)
        
        X, y, classes = self.create_synthetic_data(num_samples=2000)
        
        if self.use_tensorflow:
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
        else:
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
        
        print(f"Training samples: {len(X_train)}")
        print(f"Validation samples: {len(X_val)}")
        print(f"Number of classes: {len(classes)}")
        print(f"Model type: {'TensorFlow CNN' if self.use_tensorflow else 'Random Forest'}")
        
        if self.use_tensorflow:
            self.model = self.create_tensorflow_model(len(classes))
            
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=epochs,
                batch_size=batch_size,
                verbose=1
            )
            
            val_loss, val_accuracy = self.model.evaluate(X_val, y_val, verbose=0)
            print(f"\n✅ Validation Accuracy: {val_accuracy:.4f}")
            print(f"✅ Validation Loss: {val_loss:.4f}")
        else:
            if len(X_train.shape) > 2:
                X_train_flat = X_train.reshape(X_train.shape[0], -1)
                X_val_flat = X_val.reshape(X_val.shape[0], -1)
            else:
                X_train_flat = X_train
                X_val_flat = X_val
            
            self.model = self.create_sklearn_model(len(classes))
            
            print("Training Random Forest model...")
            self.model.fit(X_train_flat, y_train)
            
            y_pred = self.model.predict(X_val_flat)
            val_accuracy = accuracy_score(y_val, y_pred)
            print(f"\n✅ Validation Accuracy: {val_accuracy:.4f}")
            
            print("\nClassification Report:")
            print(classification_report(y_val, y_pred, target_names=classes[:10], zero_division=0))
        
        self.save_model()
        
        print("\n✅ Model training completed successfully!")
        return True
    
    def save_model(self):
        """Save the trained model"""
        model_dir = os.path.join(os.path.dirname(__file__), 'plant-disease')
        os.makedirs(model_dir, exist_ok=True)
        
        if self.use_tensorflow and self.model:
            keras_path = os.path.join(model_dir, 'model.keras')
            self.model.save(keras_path)
            print(f"✅ TensorFlow model saved to {keras_path}")
        elif self.model:
            sklearn_path = os.path.join(model_dir, 'model.joblib')
            joblib.dump(self.model, sklearn_path)
            print(f"✅ Scikit-learn model saved to {sklearn_path}")
        
        labels_path = os.path.join(model_dir, 'class_labels.json')
        with open(labels_path, 'w') as f:
            json.dump(self.classes, f, indent=2)
        print(f"✅ Class labels saved to {labels_path}")
        
        metadata = {
            'model_type': 'tensorflow_cnn' if self.use_tensorflow else 'random_forest',
            'classes': self.classes,
            'num_classes': len(self.classes),
            'img_size': self.img_size,
            'tensorflow_available': self.use_tensorflow
        }
        metadata_path = os.path.join(model_dir, 'model_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✅ Model metadata saved to {metadata_path}")

def main():
    print("\n" + "=" * 60)
    print("Disease Detection Model Training")
    print("=" * 60)
    
    disease_model = DiseaseDetectionModel()
    
    success = disease_model.train(epochs=30, batch_size=16)
    
    if success:
        print("\n" + "=" * 60)
        print("✅ Training Complete!")
        print("=" * 60)
        print("\n💡 Note: This model was trained on synthetic data.")
        print("   For production use, replace with real PlantVillage dataset.")
        print("\n📁 Model saved to: backend/ml-models/plant-disease/")
    else:
        print("\n❌ Training failed. Check errors above.")

if __name__ == "__main__":
    main()
