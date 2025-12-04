/**
 * Enhanced AI Weather Forecast Agent
 * Analyzes weekly weather forecasts + river data and generates flood warning levels
 * using Backend AI Proxy + IRSA River Data
 */

const AI_CONFIG = {
    BACKEND_API_URL: 'https://floodforecast2backend-production.up.railway.app/api/ai/analyze',
    WEATHER_API_KEY: '5523bf8add464255b93210055252911',
    WEATHER_API_BASE: 'https://api.weatherapi.com/v1'
};

// River system mapping - cities to nearby barrages/rivers
const CITY_RIVER_MAPPING = {
    'Rawalpindi': { river: 'INDUS', barrage: 'TARBELA', region: 'Punjab' },
    'Islamabad': { river: 'INDUS', barrage: 'TARBELA', region: 'Punjab' },
    'Lahore': { river: 'INDUS', barrage: 'SUKKUR', region: 'Punjab' },
    'Karachi': { river: 'INDUS', barrage: 'SUKKUR', region: 'Sindh' },
    'Peshawar': { river: 'KABUL', barrage: 'NOWSHERA', region: 'KPK' },
    'Quetta': { river: 'INDUS', barrage: 'GUDDU', region: 'Balochistan' },
    'Multan': { river: 'INDUS', barrage: 'GUDDU', region: 'Punjab' },
    'Sukkur': { river: 'INDUS', barrage: 'SUKKUR', region: 'Sindh' },
    'Hyderabad': { river: 'INDUS', barrage: 'GUDDU', region: 'Sindh' },
    'Faisalabad': { river: 'INDUS', barrage: 'TARBELA', region: 'Punjab' }
};

// River danger levels (in meters - thresholds based on IRSA historical data)
const RIVER_DANGER_LEVELS = {
    'TARBELA': { 
        low: 1480,           // Normal operating level
        moderate: 1500,      // Above normal, increased flow
        high: 1515,          // High water, spillway operations likely
        critical: 1540       // Critical level, severe flood risk
    },
    'SUKKUR': { 
        low: 9,              // Normal level
        moderate: 12,        // Moderate water level
        high: 15,            // High water level
        critical: 18         // Critical overflow risk
    },
    'GUDDU': { 
        low: 8,              // Normal level
        moderate: 11,        // Moderate water level
        high: 14,            // High water level
        critical: 17         // Critical overflow risk
    },
    'NOWSHERA': { 
        low: 150,            // Normal level
        moderate: 200,       // Moderate water level
        high: 240,           // High water level
        critical: 280        // Critical overflow risk
    }
};

let riverData = null; // Will store the IRSA data

/**
 * Load and parse river data from JSON file
 * @returns {Promise<Object>} Parsed river data
 */
async function loadRiverData() {
    try {
        if (riverData) return riverData; // Return cached data
        
        // Try to load from local file or API endpoint
        const response = await fetch('/data/river_data.json');
        if (!response.ok) {
            console.warn('[River Data] Could not load river data');
            return null;
        }
        
        const data = await response.json();
        riverData = data;
        console.log('[River Data] Loaded successfully:', data.length, 'records');
        return data;
    } catch (error) {
        console.warn('[River Data] Error loading river data:', error);
        return null;
    }
}

/**
 * Extract city name from location string or determine from coordinates
 * @param {string} location - Location (coordinates or city name)
 * @returns {string} City name
 */
function extractCityName(location) {
    // If it's coordinates, determine city based on coordinates
    if (location.includes(',')) {
        const [lat, lon] = location.split(',').map(parseFloat);
        
        // Rawalpindi coordinates: 33.6131, 73.0729
        if (lat > 33.5 && lat < 33.7 && lon > 73.0 && lon < 73.2) {
            console.log('[Location] Coordinates identified as Rawalpindi');
            return 'Rawalpindi';
        }
        // Islamabad coordinates: 33.7298, 73.1786
        if (lat > 33.6 && lat < 33.8 && lon > 73.0 && lon < 73.3) {
            console.log('[Location] Coordinates identified as Islamabad');
            return 'Islamabad';
        }
        // Lahore coordinates: 31.5204, 74.3587
        if (lat > 31.4 && lat < 31.7 && lon > 74.2 && lon < 74.5) {
            console.log('[Location] Coordinates identified as Lahore');
            return 'Lahore';
        }
        // Karachi coordinates: 24.8607, 67.0011
        if (lat > 24.7 && lat < 25.0 && lon > 66.9 && lon < 67.2) {
            console.log('[Location] Coordinates identified as Karachi');
            return 'Karachi';
        }
        
        console.warn('[Location] Coordinates not matched to any city, using Rawalpindi as default');
        return 'Rawalpindi'; // Default to Rawalpindi
    }
    return location;
}

/**
 * Get latest river level data for a specific barrage
 * @param {string} barrage - Barrage name (e.g., 'TARBELA')
 * @returns {Object|null} Latest river level data
 */
function getLatestRiverLevel(barrage) {
    if (!riverData || riverData.length === 0) {
        console.warn('[River Data] No river data loaded');
        return null;
    }
    
    // Find latest daily data entry (first entry is most recent)
    const entry = riverData[0];
    console.log('[River Data] Latest entry:', entry);
    
    if (entry.stations && entry.stations['INDUS RIVER SYSTEM AUTHORITY']) {
        const stationData = entry.stations['INDUS RIVER SYSTEM AUTHORITY'];
        console.log('[River Data] Station data keys:', Object.keys(stationData));
        
        // Get level based on barrage
        const levelKey = `${barrage}_LEVEL`;
        const inflowKey = `${barrage}_MEAN_INFLOW`;
        const outflowKey = `${barrage}_MEAN_OUTFLOW`;
        
        console.log('[River Data] Looking for keys:', levelKey, inflowKey, outflowKey);
        
        if (stationData[levelKey] !== undefined) {
            const riverLevelData = {
                date: entry.date,
                level: stationData[levelKey],
                inflow: stationData[inflowKey] || 'N/A',
                outflow: stationData[outflowKey] || 'N/A',
                barrage: barrage
            };
            console.log('[River Data] Found river level:', riverLevelData);
            return riverLevelData;
        } else {
            console.warn('[River Data] Could not find level key:', levelKey);
            console.warn('[River Data] Available keys:', Object.keys(stationData));
        }
    } else {
        console.warn('[River Data] No station data found');
    }
    return null;
}

/**
 * Assess river flood risk based on current level
 * @param {string} barrage - Barrage name
 * @param {number} currentLevel - Current river level
 * @returns {Object} Risk assessment
 */
function assessRiverRisk(barrage, currentLevel) {
    const thresholds = RIVER_DANGER_LEVELS[barrage];
    if (!thresholds) {
        return { riskLevel: 'Unknown', score: 0, reason: 'Barrage data not available' };
    }
    
    let riskLevel = 'Low';
    let score = 20;
    let reason = 'River level is normal';
    
    if (currentLevel >= thresholds.critical) {
        riskLevel = 'Critical';
        score = 90;
        reason = `River level is CRITICAL (${currentLevel} - above ${thresholds.critical})`;
    } else if (currentLevel >= thresholds.high) {
        riskLevel = 'High';
        score = 70;
        reason = `River level is HIGH (${currentLevel} - above ${thresholds.high})`;
    } else if (currentLevel >= thresholds.moderate) {
        riskLevel = 'Moderate';
        score = 50;
        reason = `River level is MODERATE (${currentLevel} - above ${thresholds.moderate})`;
    } else if (currentLevel >= thresholds.low) {
        riskLevel = 'Low';
        score = 30;
        reason = `River level is normal (${currentLevel})`;
    }
    
    return { riskLevel, score, reason };
}

/**
 * Main function to analyze weekly forecast with river data integration
 * @param {string} location - Location name or coordinates
 * @returns {Promise<Object>} AI-generated forecast analysis with river data
 */
async function analyzeWeeklyForecast(location) {
    try {
        console.log(`[AI Agent] Starting weekly forecast analysis for: ${location}`);

        // Load river data
        await loadRiverData();

        // Step 1: Extract city name and find nearest river
        const cityName = extractCityName(location);
        const riverInfo = CITY_RIVER_MAPPING[cityName];
        let riverRiskData = null;

        if (riverInfo) {
            console.log(`[AI Agent] Found river mapping for ${cityName}:`, riverInfo);
            
            // Step 2: Get river level data
            const riverLevel = getLatestRiverLevel(riverInfo.barrage);
            if (riverLevel) {
                riverRiskData = assessRiverRisk(riverInfo.barrage, riverLevel.level);
                console.log(`[AI Agent] River risk assessment:`, riverRiskData);
            }
        }

        // Step 3: Fetch 7-day weather forecast
        const weatherData = await fetchWeeklyWeather(location);

        // Step 4: Generate AI analysis with river data context
        let aiAnalysis = await generateWarningWithAI(weatherData, riverRiskData, riverInfo);

        // Step 5: BLEND river risk with AI analysis if river data exists
        if (riverRiskData && riverRiskData.riskLevel !== 'Low') {
            console.log('[AI Agent] Blending river risk with AI analysis...');
            
            // If river risk is higher, increase the warning level
            const riverScore = riverRiskData.score;
            const aiScore = aiAnalysis.riskScore || 0;
            const blendedScore = Math.max(riverScore, aiScore);
            
            // Update warning level based on blended score
            if (blendedScore >= 70) {
                aiAnalysis.warningLevel = 'High';
                aiAnalysis.riskScore = blendedScore;
                aiAnalysis.confidence = Math.min(95, aiAnalysis.confidence + 20);
                aiAnalysis.summary = `⚠️ CRITICAL ALERT: River level at Tarbela Dam is dangerously HIGH (${riverRiskData.level}m). ${riverRiskData.reason}. Despite current dry weather, elevated river levels pose immediate flood risk to Rawalpindi. Authorities should increase vigilance and prepare contingency measures.`;
                aiAnalysis.keyFactors = [
                    `Tarbela water level is CRITICAL at ${riverRiskData.level}m`,
                    'Water inflow: ' + (riverRiskData.inflow || 'N/A') + ' cusecs',
                    'Water outflow: ' + (riverRiskData.outflow || 'N/A') + ' cusecs',
                    'Immediate spillway operations may be needed',
                    'Downstream communities at risk'
                ];
                aiAnalysis.recommendations = [
                    '🚨 IMMEDIATE: Monitor Tarbela Dam water releases 24/7',
                    '⚠️ Alert downstream communities (Rawalpindi, Islamabad)',
                    '📢 Activate emergency response teams',
                    '🏠 Prepare evacuation routes in flood-prone areas',
                    '📡 Increase flood alert broadcasts',
                    '👥 Coordinate with NDMA and provincial authorities'
                ];
            } else if (blendedScore >= 50) {
                aiAnalysis.warningLevel = 'Moderate';
                aiAnalysis.riskScore = blendedScore;
                aiAnalysis.confidence = Math.min(90, aiAnalysis.confidence + 15);
                aiAnalysis.summary = `⚠️ MODERATE FLOOD RISK: River level at Tarbela is moderately elevated (${riverRiskData.level}m). ${riverRiskData.reason}. Monitor water levels closely as situation could escalate. Current weather forecast shows no rain, but underlying river risk remains.`;
                aiAnalysis.keyFactors = [
                    `Tarbela water level elevated at ${riverRiskData.level}m`,
                    'Water inflow: ' + (riverRiskData.inflow || 'N/A') + ' cusecs',
                    'Water outflow: ' + (riverRiskData.outflow || 'N/A') + ' cusecs',
                    'Current dry weather reducing additional risk',
                    'Monitor next 48-72 hours for changes'
                ];
                aiAnalysis.recommendations = [
                    '📊 Monitor Tarbela water levels hourly',
                    '📢 Issue precautionary flood advisories',
                    '🔔 Keep emergency services on alert',
                    '👥 Brief district administration',
                    '📡 Maintain public information updates'
                ];
            }
            
            console.log('[AI Agent] Blended analysis:', aiAnalysis);
        }

        // Step 6: Parse and return structured response
        return {
            success: true,
            location: weatherData.location,
            forecast: weatherData.forecast,
            analysis: aiAnalysis,
            riverData: riverRiskData,
            riverInfo: riverInfo,
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
 * Generate flood warning using Backend AI Proxy with river data context
 * @param {Object} weatherData - Weather forecast data
 * @param {Object} riverRiskData - River risk assessment
 * @param {Object} riverInfo - River information
 * @returns {Promise<Object>} AI-generated analysis
 */
async function generateWarningWithAI(weatherData, riverRiskData, riverInfo) {
    console.log('[AI Agent] Sending data to backend for AI analysis...');
    console.log('[AI Agent] Including river risk data:', riverRiskData);

    // Prepare enhanced payload with river data
    const enhancedData = {
        ...weatherData,
        riverData: {
            included: !!riverRiskData,
            riskLevel: riverRiskData?.riskLevel || 'Unknown',
            riskScore: riverRiskData?.score || 0,
            reason: riverRiskData?.reason || 'No river data available',
            barrage: riverInfo?.barrage,
            region: riverInfo?.region,
            level: riverRiskData?.level,
            inflow: riverRiskData?.inflow,
            outflow: riverRiskData?.outflow,
            date: riverRiskData?.date
        }
    };

    console.log('[AI Agent] Enhanced data being sent to backend:', enhancedData);

    const response = await fetch(AI_CONFIG.BACKEND_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(enhancedData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }

    const analysisResult = await response.json();
    console.log('[AI Agent] Backend AI response:', analysisResult);
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
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }
            parsed = JSON.parse(cleanResponse);
        }

        if (!parsed.warningLevel || !parsed.riskScore || !parsed.summary) {
            throw new Error('Missing required fields in AI response');
        }

        const validLevels = ['Low', 'Moderate', 'High', 'Critical'];
        if (!validLevels.includes(parsed.warningLevel)) {
            parsed.warningLevel = 'Moderate';
        }

        return parsed;
    } catch (error) {
        console.error('[AI Agent] Error parsing AI response:', error);
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
 * Get gradient color for warning level
 * @param {string} level - Warning level
 * @returns {string} CSS gradient
 */
function getWarningGradient(level) {
    const gradients = {
        'Low': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'Moderate': 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
        'High': 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
        'Critical': 'linear-gradient(135deg, #c21500 0%, #ffc500 100%)'
    };
    return gradients[level] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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
        getWarningIcon,
        getWarningGradient,
        loadRiverData,
        CITY_RIVER_MAPPING,
        RIVER_DANGER_LEVELS
    };
}
