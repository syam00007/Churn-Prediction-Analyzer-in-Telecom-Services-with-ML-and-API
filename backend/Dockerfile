# --- Builder Stage ---
    FROM python:3.11-slim as builder

    WORKDIR /app
    COPY requirements.txt .
    
    # Install system dependencies needed for compiling Python packages.
    RUN apt-get update && \
        apt-get install -y --no-install-recommends gcc python3-dev && \
        rm -rf /var/lib/apt/lists/*
    
    # Create and activate a virtual environment.
    RUN python -m venv /opt/venv
    ENV PATH="/opt/venv/bin:$PATH"
    
    # Upgrade pip and install dependencies.
    RUN pip install --no-cache-dir --upgrade pip && \
        pip install --no-cache-dir -r requirements.txt
    
    # --- Runtime Stage ---
    FROM python:3.11-slim
    
    WORKDIR /app
    
    # Copy the virtual environment from the builder stage.
    COPY --from=builder /opt/venv /opt/venv
    ENV PATH="/opt/venv/bin:$PATH"
    
    # Copy application code.
    COPY . .
    
    # Environment settings.
    ENV PYTHONUNBUFFERED=1 \
        PYTHONDONTWRITEBYTECODE=1 \
        PORT=7860
    
    # Create and use a non-root user for security.
    RUN useradd -m appuser && chown -R appuser:appuser /app
    USER appuser
    
    # Expose the application port.
    EXPOSE ${PORT}
    
    # Start the FastAPI app with uvicorn.
    CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
    