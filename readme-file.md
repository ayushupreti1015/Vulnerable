# Web Application Vulnerability Scanner

A comprehensive web application vulnerability scanner with real-time monitoring, pause/resume capabilities, and an intuitive dashboard interface.

![Vulnerability Scanner Dashboard](https://i.imgur.com/YourScreenshotHere.png)

## Features

- **Dynamic Web Scanning**: Crawls websites and identifies vulnerabilities including XSS, SQL Injection, CSRF, and information disclosure
- **Real-time Progress Tracking**: Monitor scan progress with a responsive dashboard
- **Pause/Resume Capability**: Control scan execution with the ability to pause and resume at any time
- **Detailed Reporting**: Comprehensive vulnerability reports with evidence and recommended fixes
- **Multi-threaded Scanning**: Efficiently scan large sites with configurable thread counts
- **Persistent Storage**: Save scan history and vulnerability information across sessions
- **User-friendly Interface**: Clean, Bootstrap-based UI with charts and visualizations

## Vulnerabilities Detected

- Cross-Site Scripting (XSS)
- SQL Injection
- Cross-Site Request Forgery (CSRF)
- Open Redirection
- Information Disclosure
- And more...

## Installation

### Prerequisites

- Python 3.6 or later
- pip (Python package manager)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/web-vulnerability-scanner.git
   cd web-vulnerability-scanner
   ```

2. Create and activate a virtual environment (recommended):
   ```
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install required packages:
   ```
   pip install flask flask-cors requests beautifulsoup4
   ```

## Usage

### Start the Scanner

Run the application using:

```
python vulnerability_scanner.py --mode api --host 127.0.0.1 --port 8080
```

Or use the provided run script:
```
chmod +x run.sh
./run.sh
```

### Access the Web Interface

Open your browser and navigate to:
```
http://localhost:8080
```

### Running a Scan

1. Enter the target URL in the "Start New Scan" section
2. Configure scan parameters (optional):
   - Crawl Depth: How many levels of links to follow (1-5)
   - Threads: Number of concurrent threads (1-10)
   - Timeout: Request timeout in seconds (5-60)
3. Click "Start Scan"
4. Monitor progress in real-time
5. Pause/Resume or Cancel the scan as needed

### Viewing Results

- **Dashboard**: Overview of all vulnerabilities and scan statistics
- **Vulnerabilities**: Detailed list of all found vulnerabilities
- **Scan History**: Review past scans and their results

## File Structure

- `vulnerability_scanner.py`: Main application file with scanner logic and API endpoints
- `frontend/build/index.html`: Web interface
- `frontend/build/app.js`: JavaScript for the web interface
- `vulnerabilities.db`: SQLite database for storing scan results

## Security Considerations

- This tool is designed for authorized security testing
- Always obtain permission before scanning any website
- Be aware of potential legal implications of security scanning

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

This tool is for educational purposes and authorized security testing only. The authors are not responsible for any misuse or damage caused by this program.
