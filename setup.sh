#!/bin/bash

# Web Application Vulnerability Scanner Setup Script
echo "Web Application Vulnerability Scanner Setup"
echo "==========================================="
echo

# Check if Python is installed
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
    echo "✅ Python 3 is installed"
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
    echo "✅ Python is installed"
else
    echo "❌ Python is not installed. Please install Python 3.6 or later."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "📊 Python version: $PYTHON_VERSION"

# Create directory structure
echo
echo "Creating directory structure..."
mkdir -p scanner/frontend

# Create virtual environment
echo
echo "Creating virtual environment..."
$PYTHON_CMD -m venv scanner/venv
source scanner/venv/bin/activate

# Install required Python packages
echo
echo "Installing required Python packages..."
pip install flask flask-cors requests beautifulsoup4

# Create the scanner directories
mkdir -p scanner/frontend/build

# Copy backend code
echo
echo "Setting up backend code..."
cat > scanner/vulnerability_scanner.py << 'EOF'
# Paste the backend code here
EOF

# Create frontend build directory
echo
echo "Setting up frontend..."
cat > scanner/frontend/build/index.html << 'EOF'
# Paste the HTML code here
EOF

cat > scanner/frontend/build/app.js << 'EOF'
# Paste the JavaScript code here
EOF

# Make the scanner directory the current working directory
cd scanner

# Create a run script
echo
echo "Creating run script..."
cat > run.sh << 'EOF'
#!/bin/bash
source venv/bin/activate
python vulnerability_scanner.py --mode api --host 0.0.0.0 --port 8080
EOF

chmod +x run.sh

echo
echo "Setup complete!"
echo
echo "To start the vulnerability scanner:"
echo "1. Navigate to the scanner directory: cd scanner"
echo "2. Run the start script: .k"
echo "3. Open http://localhost:8080 in your web browser"
echo
echo "Happy scanning! Remember to use this tool responsibly and only scan websites you have permission to test."