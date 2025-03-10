// API base URL - change this to match your backend
const API_BASE_URL = 'http://localhost:8080/api';

// Charts
let vulnerabilityTypeChart = null;
let severityChart = null;

// Global data
let currentScanId = null;
let allVulnerabilities = [];
let isScanning = false;
let isPaused = false;
let statusUpdateInterval = null;

// DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    initCharts();
    
    // Load initial data
    loadDashboardData();
    loadScanHistory();
    
    // Set up event listeners
    document.getElementById('scanForm').addEventListener('submit', handleScanFormSubmit);
    
    // Set up poll interval for active scans
    setInterval(checkActiveScan, 5000);
    
    // Add event listener for the pause/resume button
    document.getElementById('pauseResumeBtn').addEventListener('click', togglePauseScan);
    
    // Add event listener for the cancel button
    document.getElementById('cancelScanBtn').addEventListener('click', cancelScan);
    
    // Make the sticky progress bar visible if there's an active scan
    checkForActiveScan();
});

// Check if there's an active scan when page loads
async function checkForActiveScan() {
    try {
        const response = await fetch(`${API_BASE_URL}/scans`);
        const data = await response.json();
        
        if (data.success && data.scans.length > 0) {
            const activeScans = data.scans.filter(scan => !scan.completed);
            
            if (activeScans.length > 0) {
                const latestActiveScan = activeScans[0];
                currentScanId = latestActiveScan.id;
                isScanning = true;
                
                // Display the sticky progress bar
                document.getElementById('stickyProgress').style.display = 'block';
                
                // Update the progress information
                updateStickyProgressBar(latestActiveScan.progress, latestActiveScan.target_url, latestActiveScan.status);
                
                // Start the status update interval
                startStatusUpdates(currentScanId);
            }
        }
    } catch (error) {
        console.error('Error checking for active scan:', error);
    }
}

// Initialize charts with empty data
function initCharts() {
    const typeCtx = document.getElementById('vulnerabilityTypeChart').getContext('2d');
    vulnerabilityTypeChart = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#0d6efd', // blue
                    '#dc3545', // red
                    '#fd7e14', // orange
                    '#ffc107', // yellow
                    '#198754', // green
                    '#6f42c1', // purple
                    '#20c997', // teal
                    '#6c757d'  // gray
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });

    const severityCtx = document.getElementById('severityChart').getContext('2d');
    severityChart = new Chart(severityCtx, {
        type: 'pie',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#dc3545', // red - high
                    '#fd7e14', // orange - medium
                    '#ffc107'  // yellow - low
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Handle scan form submission
async function handleScanFormSubmit(event) {
    event.preventDefault();
    
    const url = document.getElementById('url').value.trim();
    const depth = parseInt(document.getElementById('depth').value);
    const threads = parseInt(document.getElementById('threads').value);
    const timeout = parseInt(document.getElementById('timeout').value);
    
    // Show scan progress
    document.getElementById('scanProgress').style.display = 'block';
    document.getElementById('scanStatus').textContent = 'Initializing scan...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                depth,
                threads,
                timeout
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentScanId = data.scan_id;
            isScanning = true;
            isPaused = false;
            
            document.getElementById('scanStatus').textContent = 'Scan started successfully. Scanning in progress...';
            
            // Show the pause/resume and cancel buttons
            document.getElementById('pauseResumeBtn').style.display = 'inline-block';
            document.getElementById('pauseResumeBtn').innerHTML = '<i class="fas fa-pause me-2"></i>Pause';
            document.getElementById('cancelScanBtn').style.display = 'inline-block';
            
            // Show sticky progress bar
            document.getElementById('stickyProgress').style.display = 'block';
            updateStickyProgressBar(0, url, 'Initializing scan...');
            
            // Start the status update interval
            startStatusUpdates(currentScanId);
            
            // Poll for scan results
            pollScanResults(currentScanId);
        } else {
            document.getElementById('scanProgress').style.display = 'none';
            alert(`Error starting scan: ${data.error}`);
        }
    } catch (error) {
        document.getElementById('scanProgress').style.display = 'none';
        alert(`Error: ${error.message}`);
    }
}

// Toggle pause/resume scan
async function togglePauseScan() {
    if (!currentScanId) return;
    
    try {
        const action = isPaused ? 'resume' : 'pause';
        const response = await fetch(`${API_BASE_URL}/scans/${currentScanId}/${action}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            isPaused = !isPaused;
            
            // Update button text and icon
            const pauseResumeBtn = document.getElementById('pauseResumeBtn');
            if (isPaused) {
                pauseResumeBtn.innerHTML = '<i class="fas fa-play me-2"></i>Resume';
                document.getElementById('scanStatus').textContent = 'Scan paused. Click Resume to continue.';
                document.getElementById('stickyScanStatus').textContent = 'PAUSED';
            } else {
                pauseResumeBtn.innerHTML = '<i class="fas fa-pause me-2"></i>Pause';
                document.getElementById('scanStatus').textContent = 'Scan resumed. Scanning in progress...';
                document.getElementById('stickyScanStatus').textContent = 'Scanning...';
            }
        } else {
            alert(`Error ${action}ing scan: ${data.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Cancel current scan
async function cancelScan() {
    if (!currentScanId || !isScanning) return;
    
    if (confirm('Are you sure you want to cancel the current scan? This action cannot be undone.')) {
        try {
            const response = await fetch(`${API_BASE_URL}/scans/${currentScanId}/cancel`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Reset scan states
                isScanning = false;
                isPaused = false;
                
                // Hide progress indicators
                document.getElementById('scanProgress').style.display = 'none';
                document.getElementById('stickyProgress').style.display = 'none';
                document.getElementById('pauseResumeBtn').style.display = 'none';
                document.getElementById('cancelScanBtn').style.display = 'none';
                
                // Clear the status update interval
                if (statusUpdateInterval) {
                    clearInterval(statusUpdateInterval);
                    statusUpdateInterval = null;
                }
                
                // Reload data
                loadDashboardData();
                loadScanHistory();
                
                alert('Scan cancelled successfully.');
            } else {
                alert(`Error cancelling scan: ${data.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
}

// Start status updates interval
function startStatusUpdates(scanId) {
    // Clear existing interval if any
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    
    // Set up new interval for status updates
    statusUpdateInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/scans/${scanId}/status`);
            const data = await response.json();
            
            if (data.success && data.scan_info) {
                const scanInfo = data.scan_info;
                
                // Update progress bar and status text
                updateScanProgress(scanInfo.progress, scanInfo.status);
                
                // Update sticky progress bar
                updateStickyProgressBar(
                    scanInfo.progress, 
                    document.getElementById('url').value.trim(),
                    scanInfo.status
                );
                
                // Update counters if available
                if (scanInfo.scanned_urls && scanInfo.total_urls) {
                    document.getElementById('scanProgressDetails').textContent = 
                        `Scanned ${scanInfo.scanned_urls} of ${scanInfo.total_urls} URLs`;
                }
                
                // Check if scan is completed
                if (scanInfo.progress === 100 || scanInfo.status === 'Completed') {
                    clearInterval(statusUpdateInterval);
                    
                    // Hide sticky progress
                    setTimeout(() => {
                        document.getElementById('stickyProgress').style.display = 'none';
                    }, 5000);
                    
                    isScanning = false;
                    currentScanId = null;
                    
                    // Hide pause/resume and cancel buttons
                    document.getElementById('pauseResumeBtn').style.display = 'none';
                    document.getElementById('cancelScanBtn').style.display = 'none';
                    
                    // Update data
                    loadScanResults(scanId);
                }
            }
        } catch (error) {
            console.error('Error updating scan status:', error);
        }
    }, 1000); // Update every second for more responsive UI
}

// Update scan progress indicators
function updateScanProgress(progress, status) {
    const progressBar = document.getElementById('scanProgressBar');
    const scanStatus = document.getElementById('scanStatus');
    
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    scanStatus.textContent = status || 'Scanning in progress...';
}

// Update sticky progress bar
function updateStickyProgressBar(progress, url, status) {
    document.getElementById('stickyProgressBar').style.width = `${progress}%`;
    document.getElementById('stickyProgressBar').setAttribute('aria-valuenow', progress);
    document.getElementById('stickyProgressPercent').textContent = `${progress}%`;
    document.getElementById('stickyScanUrl').textContent = url;
    document.getElementById('stickyScanStatus').textContent = status || 'Scanning...';
}

// Poll for scan results
function pollScanResults(scanId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/scans/${scanId}`);
            const data = await response.json();
            
            if (data.success) {
                // Update vulnerabilities in real-time if we have results
                if (data.results && data.results.length > 0) {
                    updateVulnerabilitiesTable(data.results);
                    updateRecentVulnerabilitiesTable(data.results);
                    
                    // Update the counts on the sticky progress bar
                    const highCount = data.results.filter(v => v.severity === 'High').length;
                    const mediumCount = data.results.filter(v => v.severity === 'Medium').length;
                    const lowCount = data.results.filter(v => v.severity === 'Low').length;
                    
                    document.getElementById('stickyHighCount').textContent = highCount;
                    document.getElementById('stickyMediumCount').textContent = mediumCount;
                    document.getElementById('stickyLowCount').textContent = lowCount;
                    document.getElementById('stickyTotalCount').textContent = data.results.length;
                }
                
                // Check if scan is completed
                const completed = data.results.length > 0 && 
                                  data.results[0].scan_date && 
                                  data.scan_info && 
                                  (data.scan_info.status === 'Completed' || data.scan_info.progress === 100);
                
                if (completed) {
                    clearInterval(interval);
                    document.getElementById('scanProgress').style.display = 'none';
                    
                    // Hide pause/resume and cancel buttons
                    document.getElementById('pauseResumeBtn').style.display = 'none';
                    document.getElementById('cancelScanBtn').style.display = 'none';
                    
                    // Reset scan state
                    isScanning = false;
                    currentScanId = null;
                    
                    // Hide sticky progress after a delay
                    setTimeout(() => {
                        document.getElementById('stickyProgress').style.display = 'none';
                    }, 5000);
                    
                    // Update data
                    allVulnerabilities = data.results;
                    loadDashboardData();
                    loadScanHistory();
                    updateVulnerabilitiesTable(data.results);
                    
                    // Show vulnerabilities tab
                    const vulnerabilitiesTab = document.getElementById('vulnerabilities-tab');
                    const tab = new bootstrap.Tab(vulnerabilitiesTab);
                    tab.show();
                }
            }
        } catch (error) {
            console.error('Error polling scan results:', error);
        }
    }, 3000);
}

// Check for active scans
async function checkActiveScan() {
    // Skip if we already know we're scanning
    if (isScanning) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/scans`);
        const data = await response.json();
        
        if (data.success && data.scans.length > 0) {
            const activeScans = data.scans.filter(scan => !scan.completed);
            
            if (activeScans.length > 0) {
                const latestActiveScan = activeScans[0];
                
                // If we don't have a current scan, set it
                if (!currentScanId) {
                    currentScanId = latestActiveScan.id;
                    isScanning = true;
                    
                    // Show scan progress
                    document.getElementById('scanProgress').style.display = 'block';
                    document.getElementById('scanStatus').textContent = `Scan in progress for ${latestActiveScan.target_url}...`;
                    
                    // Show pause/resume and cancel buttons
                    document.getElementById('pauseResumeBtn').style.display = 'inline-block';
                    document.getElementById('pauseResumeBtn').innerHTML = '<i class="fas fa-pause me-2"></i>Pause';
                    document.getElementById('cancelScanBtn').style.display = 'inline-block';
                    
                    // Show sticky progress bar
                    document.getElementById('stickyProgress').style.display = 'block';
                    updateStickyProgressBar(
                        latestActiveScan.progress, 
                        latestActiveScan.target_url, 
                        latestActiveScan.status
                    );
                    
                    // Start the status update interval
                    startStatusUpdates(currentScanId);
                    
                    // Poll for scan results
                    pollScanResults(currentScanId);
                }
            }
        }
    } catch (error) {
        console.error('Error checking active scans:', error);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Get all vulnerabilities from all scans
        let allVulns = [];
        
        // If we already have vulnerabilities, use them
        if (allVulnerabilities.length > 0) {
            allVulns = allVulnerabilities;
        } else {
            // Otherwise, get all scans and then get vulnerabilities for each
            const scansResponse = await fetch(`${API_BASE_URL}/scans`);
            const scansData = await scansResponse.json();
            
            if (scansData.success && scansData.scans.length > 0) {
                document.getElementById('totalScans').textContent = scansData.scans.length;
                
                // Get vulnerabilities for each scan
                for (const scan of scansData.scans) {
                    const vulnsResponse = await fetch(`${API_BASE_URL}/scans/${scan.id}`);
                    const vulnsData = await vulnsResponse.json();
                    
                    if (vulnsData.success) {
                        allVulns = [...allVulns, ...vulnsData.results];
                    }
                }
                
                // Store all vulnerabilities
                allVulnerabilities = allVulns;
            }
        }
        
        // Update dashboard stats
        updateDashboardStats(allVulns);
        
        // Update vulnerability chart
        updateVulnerabilityTypeChart(allVulns);
        
        // Update severity chart
        updateSeverityChart(allVulns);
        
        // Update recent vulnerabilities table
        updateRecentVulnerabilitiesTable(allVulns);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update dashboard stats
function updateDashboardStats(vulnerabilities) {
    document.getElementById('totalVulnerabilities').textContent = vulnerabilities.length;
    
    const highVulnerabilities = vulnerabilities.filter(v => v.severity === 'High');
    const mediumVulnerabilities = vulnerabilities.filter(v => v.severity === 'Medium');
    
    document.getElementById('highVulnerabilities').textContent = highVulnerabilities.length;
    document.getElementById('mediumVulnerabilities').textContent = mediumVulnerabilities.length;
}

// Update vulnerability type chart
function updateVulnerabilityTypeChart(vulnerabilities) {
    // Group by vulnerability type
    const typeGroups = vulnerabilities.reduce((groups, vuln) => {
        const type = vuln.type;
        groups[type] = (groups[type] || 0) + 1;
        return groups;
    }, {});
    
    // Convert to arrays for Chart.js
    const labels = Object.keys(typeGroups);
    const data = Object.values(typeGroups);
    
    // Update chart
    vulnerabilityTypeChart.data.labels = labels;
    vulnerabilityTypeChart.data.datasets[0].data = data;
    vulnerabilityTypeChart.update();
}

// Update severity chart
function updateSeverityChart(vulnerabilities) {
    // Count by severity
    const highCount = vulnerabilities.filter(v => v.severity === 'High').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'Medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'Low').length;
    
    // Update chart
    severityChart.data.datasets[0].data = [highCount, mediumCount, lowCount];
    severityChart.update();
}

// Update recent vulnerabilities table
function updateRecentVulnerabilitiesTable(vulnerabilities) {
    const recentVulnerabilitiesTable = document.getElementById('recentVulnerabilitiesTable');
    
    if (vulnerabilities.length === 0) {
        recentVulnerabilitiesTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No vulnerabilities found yet</td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (newest first) and take the first 5
    const recentVulnerabilities = [...vulnerabilities]
        .sort((a, b) => new Date(b.scan_date) - new Date(a.scan_date))
        .slice(0, 5);
    
    // Generate table rows
    const rows = recentVulnerabilities.map(vuln => {
        const severityClass = getSeverityClass(vuln.severity);
        
        return `
            <tr>
                <td>${vuln.type}</td>
                <td class="text-truncate" style="max-width: 200px;">${vuln.url}</td>
                <td><span class="badge ${severityClass}">${vuln.severity}</span></td>
                <td class="text-truncate" style="max-width: 300px;">${vuln.description}</td>
            </tr>
        `;
    }).join('');
    
    recentVulnerabilitiesTable.innerHTML = rows;
}

// Get severity CSS class
function getSeverityClass(severity) {
    switch (severity) {
        case 'High':
            return 'bg-danger';
        case 'Medium':
            return 'bg-warning text-dark';
        case 'Low':
            return 'bg-info text-dark';
        default:
            return 'bg-secondary';
    }
}

// Load scan history
async function loadScanHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/scans`);
        const data = await response.json();
        
        if (data.success) {
            updateScanHistoryTable(data.scans);
        }
    } catch (error) {
        console.error('Error loading scan history:', error);
    }
}

// Update scan history table
async function updateScanHistoryTable(scans) {
    const scanHistoryTable = document.getElementById('scanHistoryTable');
    
    if (scans.length === 0) {
        scanHistoryTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No scan history available</td>
            </tr>
        `;
        return;
    }
    
    // Get vulnerability counts for each scan
    const scanVulnerabilityCounts = {};
    
    for (const scan of scans) {
        try {
            const response = await fetch(`${API_BASE_URL}/scans/${scan.id}`);
            const data = await response.json();
            
            if (data.success) {
                scanVulnerabilityCounts[scan.id] = data.results.length;
            } else {
                scanVulnerabilityCounts[scan.id] = 0;
            }
        } catch (error) {
            console.error(`Error getting vulnerabilities for scan ${scan.id}:`, error);
            scanVulnerabilityCounts[scan.id] = 0;
        }
    }
    
    // Generate table rows
    const rows = scans.map(scan => {
        const date = moment(scan.scan_date).format('YYYY-MM-DD HH:mm:ss');
        const status = scan.completed ? 'Completed' : scan.status || 'In Progress';
        const statusClass = scan.completed ? 'text-success' : 'text-warning';
        const vulnerabilityCount = scanVulnerabilityCounts[scan.id] || 0;
        
        let actionButtons = `
            <button class="btn btn-sm btn-outline-primary view-scan-results" data-scan-id="${scan.id}">
                <i class="fas fa-eye"></i> View
            </button>
        `;
        
        // Add resume button for paused scans
        if (status === 'Paused') {
            actionButtons += `
                <button class="btn btn-sm btn-outline-success ms-2 resume-scan" data-scan-id="${scan.id}">
                    <i class="fas fa-play"></i> Resume
                </button>
            `;
        }
        
        // Add delete button for completed scans
        if (scan.completed) {
            actionButtons += `
                <button class="btn btn-sm btn-outline-danger ms-2 delete-scan" data-scan-id="${scan.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        
        return `
            <tr class="scan-history-item" data-scan-id="${scan.id}">
                <td>${date}</td>
                <td class="text-truncate" style="max-width: 200px;">${scan.target_url}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>${vulnerabilityCount}</td>
                <td>
                    ${actionButtons}
                </td>
            </tr>
        `;
    }).join('');
    
    scanHistoryTable.innerHTML = rows;
    
    // Add event listeners for view buttons
    document.querySelectorAll('.view-scan-results').forEach(button => {
        button.addEventListener('click', async function() {
            const scanId = this.getAttribute('data-scan-id');
            await loadScanResults(scanId);
            
            // Show vulnerabilities tab
            const vulnerabilitiesTab = document.getElementById('vulnerabilities-tab');
            const tab = new bootstrap.Tab(vulnerabilitiesTab);
            tab.show();
        });
    });
    
    // Add event listeners for resume buttons
    document.querySelectorAll('.resume-scan').forEach(button => {
        button.addEventListener('click', async function() {
            const scanId = this.getAttribute('data-scan-id');
            
            try {
                const response = await fetch(`${API_BASE_URL}/scans/${scanId}/resume`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Set as current scan
                    currentScanId = scanId;
                    isScanning = true;
                    isPaused = false;
                    
                    // Show scan progress
                    document.getElementById('scanProgress').style.display = 'block';
                    document.getElementById('scanStatus').textContent = 'Scan resumed. Scanning in progress...';
                    
                    // Show pause/resume and cancel buttons
                    document.getElementById('pauseResumeBtn').style.display = 'inline-block';
                    document.getElementById('pauseResumeBtn').innerHTML = '<i class="fas fa-pause me-2"></i>Pause';
                    document.getElementById('cancelScanBtn').style.display = 'inline-block';
                    
                    // Show sticky progress bar
                    document.getElementById('stickyProgress').style.display = 'block';
                    
                    // Start the status update interval
                    startStatusUpdates(scanId);
                    
                    // Poll for scan results
                    pollScanResults(scanId);
                    
                    // Reload scan history
                    loadScanHistory();
                } else {
                    alert(`Error resuming scan: ${data.error}`);
                }
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-scan').forEach(button => {
        button.addEventListener('click', async function() {
            const scanId = this.getAttribute('data-scan-id');
            
            if (confirm('Are you sure you want to delete this scan? This action cannot be undone.')) {
                try {
                    const response = await fetch(`${API_BASE_URL}/scans/${scanId}`, {
                        method: 'DELETE'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Reload data
                        loadDashboardData();
                        loadScanHistory();
                        alert('Scan deleted successfully.');
                    } else {
                        alert(`Error deleting scan: ${data.error}`);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        });
    });
}

// Load scan results
async function loadScanResults(scanId) {
    try {
        const response = await fetch(`${API_BASE_URL}/scans/${scanId}`);
        const data = await response.json();
        
        if (data.success) {
            updateVulnerabilitiesTable(data.results);
        }
    } catch (error) {
        console.error('Error loading scan results:', error);
    }
}

// Update vulnerabilities table
function updateVulnerabilitiesTable(vulnerabilities) {
    const vulnerabilitiesTable = document.getElementById('vulnerabilitiesTable');
    
    if (vulnerabilities.length === 0) {
        vulnerabilitiesTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No vulnerabilities found</td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows
    const rows = vulnerabilities.map(vuln => {
        const severityClass = getSeverityClass(vuln.severity);
        
        return `
            <tr>
                <td>${vuln.type}</td>
                <td class="text-truncate" style="max-width: 200px;">${vuln.url}</td>
                <td><span class="badge ${severityClass}">${vuln.severity}</span></td>
                <td class="text-truncate" style="max-width: 300px;">${vuln.description}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-vulnerability-details" 
                            data-bs-toggle="modal" 
                            data-bs-target="#vulnerabilityDetailModal"
                            data-type="${vuln.type}"
                            data-url="${vuln.url}"
                            data-severity="${vuln.severity}"
                            data-description="${vuln.description}"
                            data-evidence="${vuln.evidence || ''}">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    vulnerabilitiesTable.innerHTML = rows;
    
    // Add event listeners for view buttons
    document.querySelectorAll('.view-vulnerability-details').forEach(button => {
        button.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const url = this.getAttribute('data-url');
            const severity = this.getAttribute('data-severity');
            const description = this.getAttribute('data-description');
            const evidence = this.getAttribute('data-evidence');
            
            document.getElementById('vulnType').textContent = type;
            document.getElementById('vulnUrl').textContent = url;
            document.getElementById('vulnDescription').textContent = description;
            document.getElementById('vulnEvidence').textContent = evidence;
            
            // Set severity badge class
            const vulnSeverityElement = document.getElementById('vulnSeverity');
            vulnSeverityElement.textContent = severity;
            vulnSeverityElement.className = 'badge';
            
            switch (severity) {
                case 'High':
                    vulnSeverityElement.classList.add('bg-danger');
                    break;
                case 'Medium':
                    vulnSeverityElement.classList.add('bg-warning', 'text-dark');
                    break;
                case 'Low':
                    vulnSeverityElement.classList.add('bg-info', 'text-dark');
                    break;
                default:
                    vulnSeverityElement.classList.add('bg-secondary');
            }
            
            // Set recommendation based on vulnerability type
            const recommendation = getRecommendationForVulnerability(type);
            document.getElementById('vulnRecommendation').textContent = recommendation;
        });
    });
    
    // Add event listener for vulnerability search
    document.getElementById('vulnerabilitySearch').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (!searchTerm) {
            updateVulnerabilitiesTable(allVulnerabilities);
            return;
        }
        
        const filteredVulnerabilities = allVulnerabilities.filter(vuln => {
            return vuln.type.toLowerCase().includes(searchTerm) ||
                   vuln.url.toLowerCase().includes(searchTerm) ||
                   vuln.description.toLowerCase().includes(searchTerm) ||
                   vuln.severity.toLowerCase().includes(searchTerm);
        });
        
        updateVulnerabilitiesTable(filteredVulnerabilities);
    });
}

// Get recommendation for a vulnerability type
function getRecommendationForVulnerability(type) {
    switch (type) {
        case 'XSS':
            return 'Implement proper input validation and output encoding. Use security libraries or frameworks that automatically escape output. Consider using Content-Security-Policy headers.';
        
        case 'SQL Injection':
            return 'Use parameterized queries or prepared statements. Implement proper input validation. Use an ORM library that handles SQL escaping automatically. Limit database user privileges.';
        
        case 'CSRF':
            return 'Implement anti-CSRF tokens in all forms. Use the SameSite cookie attribute. Verify the Referer header for sensitive actions. Consider implementing the Double Submit Cookie pattern.';
        
        case 'Open Redirect':
            return 'Validate all redirect URLs against a whitelist of allowed destinations. Avoid using user input for redirect destinations. If necessary, use indirect references instead of user-provided URLs.';
        
        case 'Information Disclosure':
            return 'Implement proper error handling that doesn\'t expose sensitive information. Review and remove debug/diagnostic information in production. Use secure headers like X-Content-Type-Options and X-Frame-Options.';
        
        default:
            return 'Follow the principle of least privilege. Keep all software updated with security patches. Perform regular security testing. Implement a defense-in-depth approach to security.';
    }
}

// Export vulnerability data to CSV
function exportToCSV(vulnerabilities, filename = 'vulnerabilities.csv') {
    if (vulnerabilities.length === 0) {
        alert('No vulnerabilities to export');
        return;
    }
    
    // CSV header
    let csvContent = 'Type,URL,Severity,Description,Evidence\n';
    
    // Add data rows
    vulnerabilities.forEach(vuln => {
        // Escape fields that might contain commas or quotes
        const type = `"${vuln.type.replace(/"/g, '""')}"`;
        const url = `"${vuln.url.replace(/"/g, '""')}"`;
        const severity = `"${vuln.severity.replace(/"/g, '""')}"`;
        const description = `"${vuln.description.replace(/"/g, '""')}"`;
        const evidence = `"${(vuln.evidence || '').replace(/"/g, '""')}"`;
        
        csvContent += `${type},${url},${severity},${description},${evidence}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}