/**
 * AI Weather Forecast Agent
 * Analyzes weekly weather forecasts and generates flood warning levels
 * using Backend AI Proxy
 */

const AI_CONFIG = {
    BACKEND_API_URL: 'https://floodforecast2backend-production.up.railway.app/api/ai/analyze',
    WEATHER_API_KEY: '5523bf8add464255b93210055252911',
    WEATHER_API_BASE: 'https://api.weatherapi.com/v1'
};

/**
 * Main function to analyze weekly forecast and generate warnings
 * @param {string} location - Location name or coordinates
 * @returns {Promise<Object>} AI-generated forecast analysis
 */
async function analyzeWeeklyForecast(location) {
    try {
        console.log(`[AI Agent] Starting weekly forecast analysis for: ${location}`);

        // Step 1: Fetch 7-day weather forecast
        const weatherData = await fetchWeeklyWeather(location);

        // Step 2: Generate AI analysis
        const aiAnalysis = await generateWarningWithAI(weatherData);

        // Step 3: Parse and return structured response
        return {
            success: true,
            location: weatherData.location,
            forecast: weatherData.forecast,
            analysis: aiAnalysis,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('[AI Agent] Error:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Fetch 7-day weather forecast from WeatherAPI
 * @param {string} location - Location name or coordinates
 * @returns {Promise<Object>} Weather data
 */
async function fetchWeeklyWeather(location) {
    const url = `${AI_CONFIG.WEATHER_API_BASE}/forecast.json?key=${AI_CONFIG.WEATHER_API_KEY}&q=${location}&days=7&aqi=no&alerts=yes`;

    console.log('[AI Agent] Fetching weather data...');
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract relevant forecast information
    const forecastSummary = data.forecast.forecastday.map(day => ({
        date: day.date,
        maxTemp: day.day.maxtemp_c,
        minTemp: day.day.mintemp_c,
        avgTemp: day.day.avgtemp_c,
        totalRainfall: day.day.totalprecip_mm,
        maxWind: day.day.maxwind_kph,
        avgHumidity: day.day.avghumidity,
        rainChance: day.day.daily_chance_of_rain,
        condition: day.day.condition.text,
        uvIndex: day.day.uv
    }));

    return {
        location: {
            name: data.location.name,
            region: data.location.region,
            country: data.location.country,
            lat: data.location.lat,
            lon: data.location.lon
        },
        forecast: forecastSummary,
        alerts: data.alerts?.alert || []
    };
}

/**
 * Generate flood warning using Backend AI Proxy
 * @param {Object} weatherData - Weather forecast data
 * @returns {Promise<Object>} AI-generated analysis
 */
async function generateWarningWithAI(weatherData) {
    console.log('[AI Agent] Sending data to backend for AI analysis...');

    // Call Backend API
    const response = await fetch(AI_CONFIG.BACKEND_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(weatherData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }

    const analysisResult = await response.json();
    return parseAIResponse(analysisResult);
}

/**
 * Parse AI response and extract structured data
 * @param {string|Object} response - Raw AI response or parsed object
 * @returns {Object} Parsed analysis
 */
function parseAIResponse(response) {
    try {
        let parsed = response;
        if (typeof response === 'string') {
            // Remove markdown code blocks if present
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }
            parsed = JSON.parse(cleanResponse);
        }

        // Validate required fields
        if (!parsed.warningLevel || !parsed.riskScore || !parsed.summary) {
            throw new Error('Missing required fields in AI response');
        }

        // Ensure warning level is valid
        const validLevels = ['Low', 'Moderate', 'High', 'Critical'];
        if (!validLevels.includes(parsed.warningLevel)) {
            parsed.warningLevel = 'Moderate'; // Default fallback
        }

        return parsed;
    } catch (error) {
        console.error('[AI Agent] Error parsing AI response:', error);
        console.error('[AI Agent] Raw response:', response);

        // Return fallback analysis
        return {
            warningLevel: 'Moderate',
            riskScore: 50,
            confidence: 30,
            summary: 'Unable to generate detailed analysis. Please check weather data manually.',
            keyFactors: ['Analysis error occurred'],
            recommendations: ['Monitor weather updates regularly', 'Stay informed through official channels'],
            dailyRisks: [],
            peakRiskDays: [],
            error: 'Failed to parse AI response'
        };
    }
}

/**
 * Get color class for warning level
 * @param {string} level - Warning level
 * @returns {string} CSS class name
 */
function getWarningColor(level) {
    const colors = {
        'Low': 'success',
        'Moderate': 'warning',
        'High': 'danger',
        'Critical': 'critical'
    };
    return colors[level] || 'secondary';
}

/**
 * Get icon for warning level
 * @param {string} level - Warning level
 * @returns {string} Font Awesome icon class
 */
function getWarningIcon(level) {
    const icons = {
        'Low': 'fa-check-circle',
        'Moderate': 'fa-exclamation-triangle',
        'High': 'fa-exclamation-circle',
        'Critical': 'fa-skull-crossbones'
    };
    return icons[level] || 'fa-info-circle';
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeWeeklyForecast,
        getWarningColor,
        getWarningIcon
    };
}
