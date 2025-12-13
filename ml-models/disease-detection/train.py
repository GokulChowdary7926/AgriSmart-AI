#!/usr/bin/env python3
import sys
import json
import argparse
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

TENSORFLOW_AVAILABLE = False
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, models
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("TensorFlow not available. Using scikit-learn Random Forest.")

DISEASE_CLASSES = [
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

def create_enhanced_synthetic_data(num_samples=3000, num_classes=38):
    print(f"Creating {num_samples} enhanced synthetic samples for {num_classes} classes...")
    
    np.random.seed(42)
    
    if TENSORFLOW_AVAILABLE:
        X = np.random.rand(num_samples, 224, 224, 3).astype(np.float32) / 255.0
        
        for i in range(num_samples):
            class_idx = i % num_classes
            if class_idx < 10:
                X[i, :, :, 0] += 0.1
            elif class_idx < 20:
                X[i, :, :, 1] += 0.1
            else:
                X[i, :, :, 2] += 0.1
            X[i] = np.clip(X[i], 0, 1)
    else:
        feature_size = 1000
        X = np.random.rand(num_samples, feature_size).astype(np.float32)
        
        for i in range(num_samples):
            class_idx = i % num_classes
            X[i, :50] += class_idx * 0.01
            X[i] = np.clip(X[i], 0, 1)
    
    y = np.random.randint(0, num_classes, num_samples)
    
    if TENSORFLOW_AVAILABLE:
        y = keras.utils.to_categorical(y, num_classes)
    
    return X, y

def create_tensorflow_model(num_classes):
    model = models.Sequential([
        layers.Input(shape=(224, 224, 3)),
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
        layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
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
        metrics=['accuracy', 'top_k_categorical_accuracy']
    )
    
    return model

def train_disease_detection(data_path=None, output_path=None, training_id=None, epochs=30):
    if not output_path:
        output_path = os.path.join(os.path.dirname(__file__), 'trained', 'disease_detection')
    os.makedirs(output_path, exist_ok=True)
    
    if not training_id:
        training_id = f"training_{np.random.randint(10000, 99999)}"
    
    print(f"Training ID: {training_id}")
    print(f"Output path: {output_path}")
    print(f"TensorFlow Available: {TENSORFLOW_AVAILABLE}")
    
    num_classes = len(DISEASE_CLASSES)
    X, y = create_enhanced_synthetic_data(num_samples=3000, num_classes=num_classes)
    
    if TENSORFLOW_AVAILABLE:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    else:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=np.argmax(y, axis=1) if len(y.shape) > 1 else y)
    
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    print(f"Number of classes: {num_classes}")
    
    if TENSORFLOW_AVAILABLE:
        print("Training TensorFlow CNN model...")
        model = create_tensorflow_model(num_classes)
        
        datagen = ImageDataGenerator(
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            zoom_range=0.2
        )
        
        history = model.fit(
            datagen.flow(X_train, y_train, batch_size=32),
            steps_per_epoch=len(X_train) // 32,
            epochs=epochs,
            validation_data=(X_val, y_val),
            verbose=1
        )
        
        val_loss, val_accuracy, val_top_k = model.evaluate(X_val, y_val, verbose=0)
        print(f"Validation Accuracy: {val_accuracy:.4f}")
        print(f"Validation Top-K Accuracy: {val_top_k:.4f}")
        
        y_pred = model.predict(X_val)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_true_classes = np.argmax(y_val, axis=1)
        
        print("\nClassification Report:")
        print(classification_report(y_true_classes, y_pred_classes, target_names=DISEASE_CLASSES[:num_classes], zero_division=0))
        
        model_path = os.path.join(output_path, 'model.keras')
        model.save(model_path)
        print(f"Model saved to {model_path}")
        
        val_accuracy_final = float(val_accuracy)
    else:
        print("Training Random Forest model...")
        if len(X_train.shape) > 2:
            X_train_flat = X_train.reshape(X_train.shape[0], -1)
            X_val_flat = X_val.reshape(X_val.shape[0], -1)
        else:
            X_train_flat = X_train
            X_val_flat = X_val
        
        y_train_flat = np.argmax(y_train, axis=1) if len(y_train.shape) > 1 else y_train
        y_val_flat = np.argmax(y_val, axis=1) if len(y_val.shape) > 1 else y_val
        
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=25,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            verbose=1
        )
        
        model.fit(X_train_flat, y_train_flat)
        
        y_pred = model.predict(X_val_flat)
        val_accuracy = accuracy_score(y_val_flat, y_pred)
        print(f"Validation Accuracy: {val_accuracy:.4f}")
        
        print("\nClassification Report:")
        print(classification_report(y_val_flat, y_pred, target_names=DISEASE_CLASSES[:num_classes], zero_division=0))
        
        model_path = os.path.join(output_path, 'model.joblib')
        joblib.dump(model, model_path)
        print(f"Model saved to {model_path}")
        
        val_accuracy_final = float(val_accuracy)
    
    labels_path = os.path.join(output_path, 'class_labels.json')
    with open(labels_path, 'w') as f:
        json.dump(DISEASE_CLASSES, f, indent=2)
    print(f"Class labels saved to {labels_path}")
    
    metadata = {
        'training_id': training_id,
        'model_type': 'tensorflow_cnn' if TENSORFLOW_AVAILABLE else 'random_forest',
        'num_classes': num_classes,
        'classes': DISEASE_CLASSES,
        'accuracy': val_accuracy_final,
        'tensorflow_available': TENSORFLOW_AVAILABLE,
        'training_samples': len(X_train),
        'validation_samples': len(X_val)
    }
    
    metadata_path = os.path.join(output_path, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Metadata saved to {metadata_path}")
    print("\nTraining completed successfully!")
    return True

def main():
    parser = argparse.ArgumentParser(description='Train disease detection model')
    parser.add_argument('--data', type=str, help='Path to training data')
    parser.add_argument('--output', type=str, help='Output directory for model')
    parser.add_argument('--training-id', type=str, help='Training ID')
    parser.add_argument('--epochs', type=int, default=30, help='Number of training epochs')
    
    args = parser.parse_args()
    
    train_disease_detection(
        data_path=args.data,
        output_path=args.output,
        training_id=args.training_id,
        epochs=args.epochs
    )

if __name__ == "__main__":
    main()







