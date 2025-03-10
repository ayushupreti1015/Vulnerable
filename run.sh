#!/bin/bash
# Detect venv location
if [ -d "venv/bin" ]; then
    source venv/bin/activate
elif [ -d "scanner/venv/bin" ]; then
    source scanner/venv/bin/activate
fi

# Set absolute path for static folder
export FLASK_STATIC_FOLDER=$(pwd)/frontend/build

# Run application
python vulnerability_scanner.py --mode api --host 0.0.0.0 --port 8080