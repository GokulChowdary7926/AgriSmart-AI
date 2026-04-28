"""
Train a MobileNetV2-based CNN for plant disease detection and export
both a Keras model (.h5) and a TensorFlow.js model (model.json + weights).

Expected dataset layout (you create this):

ml-models/disease-detection/data/
  train/
    rice_blast/
    rice_brown_spot/
    tomato_early_blight/
    ...
  val/
    rice_blast/
    rice_brown_spot/
    tomato_early_blight/
    ...

Usage:
  cd agri-smart-ai/ml-models/disease-detection
  python train_cnn.py

After training:
  - Keras model: trained/comprehensive_disease_detection/disease_cnn.h5
  - Class labels: trained/comprehensive_disease_detection/class_labels.json
  - TFJS model:  trained/comprehensive_disease_detection/tfjs/model.json
"""

import os
import json

import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
TRAIN_DIR = os.path.join(DATA_DIR, "train")
VAL_DIR = os.path.join(DATA_DIR, "val")

OUTPUT_DIR = os.path.join(BASE_DIR, "trained", "comprehensive_disease_detection")
TFJS_DIR = os.path.join(OUTPUT_DIR, "tfjs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TFJS_DIR, exist_ok=True)

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 15


def main():
  if not os.path.isdir(TRAIN_DIR) or not os.path.isdir(VAL_DIR):
    raise SystemExit(
      f"Expected 'train' and 'val' folders under {DATA_DIR}. "
      "Please prepare the dataset as described in the docstring."
    )

  train_datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=15,
    width_shift_range=0.05,
    height_shift_range=0.05,
    zoom_range=0.1,
    horizontal_flip=True,
  )
  val_datagen = ImageDataGenerator(rescale=1.0 / 255)

  train_gen = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
  )
  val_gen = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
  )

  num_classes = train_gen.num_classes

  base = tf.keras.applications.MobileNetV2(
    input_shape=IMG_SIZE + (3,),
    include_top=False,
    weights="imagenet",
  )
  base.trainable = False

  inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
  x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
  x = base(x, training=False)
  x = tf.keras.layers.GlobalAveragePooling2D()(x)
  x = tf.keras.layers.Dropout(0.2)(x)
  outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)
  model = tf.keras.Model(inputs, outputs)

  model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"],
  )

  model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS,
  )

  # Save Keras model
  keras_path = os.path.join(OUTPUT_DIR, "disease_cnn.h5")
  model.save(keras_path)
  print(f"Saved Keras model to {keras_path}")

  # Save class labels as an array indexed by class index
  class_indices = train_gen.class_indices  # {class_name: index}
  labels = [None] * len(class_indices)
  for name, idx in class_indices.items():
    labels[idx] = name

  labels_path = os.path.join(OUTPUT_DIR, "class_labels.json")
  with open(labels_path, "w") as f:
    json.dump(labels, f, indent=2)
  print(f"Saved class labels to {labels_path}")

  # Optional: convert to TensorFlow.js format if tensorflowjs is available
  try:
    import tensorflowjs as tfjs  # type: ignore

    tfjs.converters.save_keras_model(model, TFJS_DIR)
    print(f"Saved TFJS model to {TFJS_DIR}")
  except Exception as e:  # pragma: no cover - optional dependency
    print(
      "NOTE: Could not convert to TFJS automatically. "
      "Install tensorflowjs and re-run conversion if needed. "
      f"Reason: {e}"
    )


if __name__ == "__main__":
  main()

