# ML Service Dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install additional ML dependencies
RUN pip install --no-cache-dir \
    tensorflow \
    torch \
    torchvision \
    opencv-python \
    pillow \
    numpy \
    pandas \
    scikit-learn \
    ultralytics

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p models data temp

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8501/health || exit 1

# Start application
CMD ["python", "app.py"]
