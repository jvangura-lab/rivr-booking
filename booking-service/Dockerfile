FROM python:3.12-slim

WORKDIR /app

# System deps kept minimal — google-api-python-client is pure Python.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY main.py config.py ./
COPY routes/ ./routes/
COPY lib/ ./lib/

# Built widget bundle (copied in by deploy.sh before `docker build`)
COPY widget_dist/ ./widget_dist/

ENV PORT=8080
EXPOSE 8080

CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 120 main:app
