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

COMPREHENSIVE_DISEASE_CLASSES = [
    'Rice___Leaf_Blight',
    'Rice___Bacterial_Blight',
    'Rice___Blast',
    'Rice___Brown_Spot',
    'Rice___Sheath_Blight',
    'Rice___Tungro',
    'Rice___healthy',
    'Wheat___Powdery_Mildew',
    'Wheat___Rust',
    'Wheat___Leaf_Blight',
    'Wheat___Karnal_Bunt',
    'Wheat___Loose_Smut',
    'Wheat___healthy',
    'Maize___Downy_Mildew',
    'Maize___Rust',
    'Maize___Leaf_Blight',
    'Maize___Common_Rust',
    'Maize___Gray_Leaf_Spot',
    'Maize___healthy',
    'Tomato___Early_Blight',
    'Tomato___Late_Blight',
    'Tomato___Bacterial_Spot',
    'Tomato___Mosaic_Virus',
    'Tomato___Leaf_Curly_Top',
    'Tomato___Wilt',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_Leaf_Spot',
    'Tomato___Target_Spot',
    'Tomato___healthy',
    'Potato___Early_Blight',
    'Potato___Late_Blight',
    'Potato___Bacterial_Wilt',
    'Potato___Scab',
    'Potato___healthy',
    'Cotton___Leaf_Curl',
    'Cotton___Bacterial_Blight',
    'Cotton___Fusarium_Wilt',
    'Cotton___healthy',
    'Sugarcane___Smut',
    'Sugarcane___Red_Rot',
    'Sugarcane___Rust',
    'Sugarcane___healthy',
    'Mango___Anthracnose',
    'Mango___Powdery_Mildew',
    'Mango___Bacterial_Canker',
    'Mango___healthy',
    'Chickpea___Wilt',
    'Chickpea___Ascochyta_Blight',
    'Chickpea___healthy',
    'Pigeonpea___Wilt',
    'Pigeonpea___Sterility_Mosaic',
    'Pigeonpea___healthy',
    'Groundnut___Early_Leaf_Spot',
    'Groundnut___Late_Leaf_Spot',
    'Groundnut___Rust',
    'Groundnut___healthy',
    'Soybean___Rust',
    'Soybean___Bacterial_Blight',
    'Soybean___healthy',
    'Banana___Sigatoka',
    'Banana___Panama_Disease',
    'Banana___healthy',
    'Chili___Anthracnose',
    'Chili___Bacterial_Spot',
    'Chili___healthy',
    'Brinjal___Bacterial_Wilt',
    'Brinjal___Phomopsis_Blight',
    'Brinjal___healthy',
    'Cucumber___Powdery_Mildew',
    'Cucumber___Downy_Mildew',
    'Cucumber___healthy',
    'Onion___Purple_Blotch',
    'Onion___Downy_Mildew',
    'Onion___healthy',
    'Cabbage___Black_Rot',
    'Cabbage___Downy_Mildew',
    'Cabbage___healthy',
    'Cauliflower___Black_Rot',
    'Cauliflower___Downy_Mildew',
    'Cauliflower___healthy',
    'Okra___Yellow_Vein_Mosaic',
    'Okra___Powdery_Mildew',
    'Okra___healthy',
    'Pumpkin___Powdery_Mildew',
    'Pumpkin___Downy_Mildew',
    'Pumpkin___healthy',
    'Watermelon___Anthracnose',
    'Watermelon___Powdery_Mildew',
    'Watermelon___healthy',
    'Muskmelon___Powdery_Mildew',
    'Muskmelon___Downy_Mildew',
    'Muskmelon___healthy',
    'Bottle_Gourd___Powdery_Mildew',
    'Bottle_Gourd___Downy_Mildew',
    'Bottle_Gourd___healthy',
    'Bitter_Gourd___Powdery_Mildew',
    'Bitter_Gourd___Downy_Mildew',
    'Bitter_Gourd___healthy',
    'Ridge_Gourd___Powdery_Mildew',
    'Ridge_Gourd___Downy_Mildew',
    'Ridge_Gourd___healthy',
    'Apple___Apple_Scab',
    'Apple___Black_Rot',
    'Apple___Cedar_Apple_Rust',
    'Apple___healthy',
    'Grape___Black_Rot',
    'Grape___Esca',
    'Grape___Leaf_Blight',
    'Grape___healthy',
    'Peach___Bacterial_Spot',
    'Peach___healthy',
    'Pepper_Bell___Bacterial_Spot',
    'Pepper_Bell___healthy',
    'Strawberry___Leaf_Scorch',
    'Strawberry___healthy',
    'Corn___Cercospora_Leaf_Spot',
    'Corn___Common_Rust',
    'Corn___Northern_Leaf_Blight',
    'Corn___healthy'
]

def create_comprehensive_training_data(num_samples_per_class=100, num_classes=None):
    if num_classes is None:
        num_classes = len(COMPREHENSIVE_DISEASE_CLASSES)
    
    total_samples = num_samples_per_class * num_classes
    print(f"Creating {total_samples} training samples for {num_classes} disease classes...")
    print(f"Crops covered: Rice, Wheat, Maize, Tomato, Potato, Cotton, Sugarcane, Mango, and more...")
    
    np.random.seed(42)
    
    if TENSORFLOW_AVAILABLE:
        X = np.random.rand(total_samples, 224, 224, 3).astype(np.float32) / 255.0
        
        for i in range(total_samples):
            class_idx = i % num_classes
            class_name = COMPREHENSIVE_DISEASE_CLASSES[class_idx]
            
            if 'healthy' in class_name.lower():
                X[i, :, :, :] = np.clip(X[i, :, :, :] + 0.1, 0, 1)
            elif 'blight' in class_name.lower():
                X[i, :, :, 0] = np.clip(X[i, :, :, 0] - 0.1, 0, 1)
            elif 'rust' in class_name.lower():
                X[i, :, :, 0] = np.clip(X[i, :, :, 0] + 0.15, 0, 1)
                X[i, :, :, 1] = np.clip(X[i, :, :, 1] - 0.1, 0, 1)
            elif 'mildew' in class_name.lower():
                X[i, :, :, :] = np.clip(X[i, :, :, :] + 0.2, 0, 1)
            elif 'mosaic' in class_name.lower() or 'virus' in class_name.lower():
                X[i, :, :, 1] = np.clip(X[i, :, :, 1] + 0.1, 0, 1)
            elif 'spot' in class_name.lower():
                X[i, :, :, 2] = np.clip(X[i, :, :, 2] - 0.1, 0, 1)
            
            X[i] = np.clip(X[i], 0, 1)
    else:
        feature_size = 1500
        X = np.random.rand(total_samples, feature_size).astype(np.float32)
        
        for i in range(total_samples):
            class_idx = i % num_classes
            class_name = COMPREHENSIVE_DISEASE_CLASSES[class_idx]
            
            base_features = np.random.rand(feature_size)
            
            if 'healthy' in class_name.lower():
                base_features[:200] += 0.2
            elif 'blight' in class_name.lower():
                base_features[200:400] += 0.15
            elif 'rust' in class_name.lower():
                base_features[400:600] += 0.18
            elif 'mildew' in class_name.lower():
                base_features[600:800] += 0.2
            elif 'mosaic' in class_name.lower() or 'virus' in class_name.lower():
                base_features[800:1000] += 0.15
            elif 'spot' in class_name.lower():
                base_features[1000:1200] += 0.12
            elif 'wilt' in class_name.lower():
                base_features[1200:1400] += 0.1
            
            X[i] = np.clip(base_features, 0, 1)
    
    y = np.array([i % num_classes for i in range(total_samples)])
    
    if TENSORFLOW_AVAILABLE:
        y = keras.utils.to_categorical(y, num_classes)
    
    return X, y

def create_enhanced_tensorflow_model(num_classes):
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
        layers.Conv2D(512, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        layers.Flatten(),
        layers.Dense(1024, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(512, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.0001),
        loss='categorical_crossentropy',
        metrics=['accuracy', 'top_k_categorical_accuracy']
    )
    
    return model

def train_comprehensive_model(data_path=None, output_path=None, training_id=None, epochs=50, samples_per_class=150):
    if not output_path:
        output_path = os.path.join(os.path.dirname(__file__), 'trained', 'comprehensive_disease_detection')
    os.makedirs(output_path, exist_ok=True)
    
    if not training_id:
        training_id = f"comprehensive_training_{np.random.randint(10000, 99999)}"
    
    num_classes = len(COMPREHENSIVE_DISEASE_CLASSES)
    
    print("=" * 70)
    print("COMPREHENSIVE DISEASE DETECTION MODEL TRAINING")
    print("=" * 70)
    print(f"Training ID: {training_id}")
    print(f"Output path: {output_path}")
    print(f"TensorFlow Available: {TENSORFLOW_AVAILABLE}")
    print(f"Total Disease Classes: {num_classes}")
    print(f"Samples per class: {samples_per_class}")
    print(f"Total training samples: {samples_per_class * num_classes}")
    print()
    print("Crops Covered:")
    crops = set()
    for cls in COMPREHENSIVE_DISEASE_CLASSES:
        crop = cls.split('___')[0]
        crops.add(crop)
    print(f"  - {', '.join(sorted(crops))}")
    print()
    
    X, y = create_comprehensive_training_data(samples_per_class, num_classes)
    
    if TENSORFLOW_AVAILABLE:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    else:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=np.argmax(y, axis=1) if len(y.shape) > 1 else y)
    
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    print()
    
    if TENSORFLOW_AVAILABLE:
        print("Training TensorFlow CNN model...")
        model = create_enhanced_tensorflow_model(num_classes)
        
        print(f"Model architecture:")
        model.summary()
        print()
        
        datagen = ImageDataGenerator(
            rotation_range=30,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            vertical_flip=True,
            zoom_range=0.2,
            brightness_range=[0.8, 1.2],
            fill_mode='nearest'
        )
        
        print("Starting training...")
        history = model.fit(
            datagen.flow(X_train, y_train, batch_size=32),
            steps_per_epoch=len(X_train) // 32,
            epochs=epochs,
            validation_data=(X_val, y_val),
            verbose=1,
            callbacks=[
                keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=5, restore_best_weights=True),
                keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=0.00001)
            ]
        )
        
        val_loss, val_accuracy, val_top_k = model.evaluate(X_val, y_val, verbose=0)
        print(f"\nValidation Accuracy: {val_accuracy:.4f}")
        print(f"Validation Top-K Accuracy: {val_top_k:.4f}")
        
        y_pred = model.predict(X_val, verbose=0)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_true_classes = np.argmax(y_val, axis=1)
        
        print("\nClassification Report:")
        unique_classes = np.unique(np.concatenate([y_true_classes, y_pred_classes]))
        if len(unique_classes) <= 30:
            print(classification_report(y_true_classes, y_pred_classes, target_names=[COMPREHENSIVE_DISEASE_CLASSES[i] for i in unique_classes], zero_division=0, labels=unique_classes))
        else:
            print(f"Total classes: {len(unique_classes)}")
            from collections import Counter
            pred_counts = Counter(y_pred_classes)
            print(f"Top 10 most common predictions:")
            for pred, count in pred_counts.most_common(10):
                print(f"  {COMPREHENSIVE_DISEASE_CLASSES[pred]}: {count} predictions")
        
        model_path = os.path.join(output_path, 'model.keras')
        model.save(model_path)
        print(f"\nModel saved to {model_path}")
        
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
            n_estimators=300,
            max_depth=30,
            min_samples_split=3,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            verbose=1,
            class_weight='balanced'
        )
        
        print("Fitting model...")
        model.fit(X_train_flat, y_train_flat)
        
        y_pred = model.predict(X_val_flat)
        val_accuracy = accuracy_score(y_val_flat, y_pred)
        print(f"\nValidation Accuracy: {val_accuracy:.4f}")
        
        print("\nClassification Report (showing all classes):")
        unique_classes = np.unique(np.concatenate([y_val_flat, y_pred]))
        if len(unique_classes) <= 30:
            print(classification_report(y_val_flat, y_pred, target_names=[COMPREHENSIVE_DISEASE_CLASSES[i] for i in unique_classes], zero_division=0, labels=unique_classes))
        else:
            print(f"Total classes predicted: {len(unique_classes)}")
            print(f"Top 10 most common predictions:")
            from collections import Counter
            pred_counts = Counter(y_pred)
            for pred, count in pred_counts.most_common(10):
                print(f"  {COMPREHENSIVE_DISEASE_CLASSES[pred]}: {count} predictions")
        
        model_path = os.path.join(output_path, 'model.joblib')
        joblib.dump(model, model_path)
        print(f"\nModel saved to {model_path}")
        
        val_accuracy_final = float(val_accuracy)
    
    labels_path = os.path.join(output_path, 'class_labels.json')
    with open(labels_path, 'w') as f:
        json.dump(COMPREHENSIVE_DISEASE_CLASSES, f, indent=2)
    print(f"Class labels saved to {labels_path}")
    
    crop_disease_mapping = {}
    for cls in COMPREHENSIVE_DISEASE_CLASSES:
        parts = cls.split('___')
        if len(parts) == 2:
            crop = parts[0]
            disease = parts[1]
            if crop not in crop_disease_mapping:
                crop_disease_mapping[crop] = []
            crop_disease_mapping[crop].append(disease)
    
    mapping_path = os.path.join(output_path, 'crop_disease_mapping.json')
    with open(mapping_path, 'w') as f:
        json.dump(crop_disease_mapping, f, indent=2)
    print(f"Crop-disease mapping saved to {mapping_path}")
    
    metadata = {
        'training_id': training_id,
        'model_type': 'tensorflow_cnn' if TENSORFLOW_AVAILABLE else 'random_forest',
        'num_classes': num_classes,
        'classes': COMPREHENSIVE_DISEASE_CLASSES,
        'crops_covered': sorted(list(crops)),
        'accuracy': val_accuracy_final,
        'tensorflow_available': TENSORFLOW_AVAILABLE,
        'training_samples': len(X_train),
        'validation_samples': len(X_val),
        'samples_per_class': samples_per_class,
        'epochs': epochs if TENSORFLOW_AVAILABLE else None
    }
    
    metadata_path = os.path.join(output_path, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Metadata saved to {metadata_path}")
    print()
    print("=" * 70)
    print("TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    print(f"Model supports {num_classes} disease classes across {len(crops)} crops")
    print(f"Model saved to: {output_path}")
    print()
    print("Note: This model was trained on synthetic data.")
    print("For production use, train with real PlantVillage or custom dataset images.")
    
    return True

def main():
    parser = argparse.ArgumentParser(description='Train comprehensive disease detection model for all crops')
    parser.add_argument('--data', type=str, help='Path to training data directory')
    parser.add_argument('--output', type=str, help='Output directory for model')
    parser.add_argument('--training-id', type=str, help='Training ID')
    parser.add_argument('--epochs', type=int, default=50, help='Number of training epochs (TensorFlow only)')
    parser.add_argument('--samples-per-class', type=int, default=150, help='Number of samples per disease class')
    
    args = parser.parse_args()
    
    train_comprehensive_model(
        data_path=args.data,
        output_path=args.output,
        training_id=args.training_id,
        epochs=args.epochs,
        samples_per_class=args.samples_per_class
    )

if __name__ == "__main__":
    main()








