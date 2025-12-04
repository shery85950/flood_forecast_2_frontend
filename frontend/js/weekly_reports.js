// Weekly Provincial Reports JavaScript

let weeklyReports = [];

async function loadWeeklyReports() {
    const container = document.getElementById('provincial-reports-container');
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-spinner fa-spin fa-3x text-primary"></i>
            <p class="mt-3">Loading provincial reports...</p>
        </div>
    `;

    try {
        weeklyReports = await api.getLatestWeeklyReports();

        if (weeklyReports.length > 0) {
            const weekStart = new Date(weeklyReports[0].weekStartDate);
            const weekEnd = new Date(weeklyReports[0].weekEndDate);
            document.getElementById('week-range').textContent = formatWeekRange(weekStart, weekEnd);
        }

        renderProvincialReports(weeklyReports);
    } catch (error) {
        console.error('Error loading weekly reports:', error);
        container.innerHTML = `
            <div class="text-center py-5 text-danger">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <p class="mt-3">Failed to load provincial reports. Please try again later.</p>
            </div>
        `;
    }
}

function renderProvincialReports(reports) {
    const container = document.getElementById('provincial-reports-container');

    if (reports.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-info-circle fa-3x"></i>
                <p class="mt-3">No provincial reports available yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reports.map(report => {
        const keyFactors = safeParseJSON(report.keyFactors, []);
        const recommendations = safeParseJSON(report.recommendations, []);
        const dailyRisks = safeParseJSON(report.dailyRisks, []);

        return `
            <div class="provincial-report-card report-card-${report.warningLevel}">
                <div class="report-header">
                    <div class="province-info">
                        <h3><i class="fas fa-map-marker-alt"></i> ${report.province}</h3>
                        <p>Analysis for ${report.city}</p>
                    </div>
                    <div class="risk-score-badge">
                        <div class="risk-score-number">${report.riskScore}</div>
                        <div class="risk-score-label">Risk Score</div>
                    </div>
                </div>
                
                <div class="warning-level-badge">
                    <i class="${getWarningIconClass(report.warningLevel)}"></i> ${report.warningLevel} Risk
                </div>
                
                <div class="report-summary">${report.summary || 'No summary available'}</div>
                
                <div class="confidence-badge">
                    <i class="fas fa-brain"></i> AI Confidence: ${report.confidence}%
                </div>
                
                <button class="view-details-btn" onclick="toggleDetails('${report.province}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
                
                <div class="expandable-details" id="details-${report.province.replace(/\s+/g, '-')}">
                    ${keyFactors.length > 0 ? `
                        <div class="details-section">
                            <h4><i class="fas fa-list-ul"></i> Key Risk Factors</h4>
                            <ul>
                                ${keyFactors.map(factor => `<li>${factor}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${dailyRisks.length > 0 ? `
                        <div class="details-section">
                            <h4><i class="fas fa-calendar-alt"></i> Daily Risk Breakdown</h4>
                            <ul>
                                ${dailyRisks.map(day => `
                                    <li><strong>${formatReportDate(day.date)}:</strong> ${day.risk} - ${day.reason}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${recommendations.length > 0 ? `
                        <div class="details-section">
                            <h4><i class="fas fa-lightbulb"></i> Recommendations</h4>
                            <ul>
                                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function toggleDetails(province) {
    const detailsId = `details-${province.replace(/\s+/g, '-')}`;
    const details = document.getElementById(detailsId);
    const btn = event.target.closest('.view-details-btn');

    if (details.classList.contains('show')) {
        details.classList.remove('show');
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> View Details';
    } else {
        details.classList.add('show');
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
    }
}

function safeParseJSON(jsonString, defaultValue = []) {
    try {
        return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (e) {
        console.error('Error parsing JSON:', e);
        return defaultValue;
    }
}

function formatWeekRange(start, end) {
    const options = { month: 'short', day: 'numeric' };
    return `Week of ${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${start.getFullYear()}`;
}

function formatReportDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWarningIconClass(level) {
    const icons = {
        'Low': 'fa-check-circle',
        'Moderate': 'fa-exclamation-triangle',
        'High': 'fa-exclamation-circle',
        'Critical': 'fa-skull-crossbones'
    };
    return `fas ${icons[level] || 'fa-info-circle'}`;
}
