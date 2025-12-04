const API_BASE_URL = 'https://floodforecast2backend-production.up.railway.app/api';

const api = {
    // Alerts
    getAlerts: async () => {
        const response = await fetch(`${API_BASE_URL}/alerts`);
        return response.json();
    },
    getActiveAlerts: async () => {
        const response = await fetch(`${API_BASE_URL}/alerts/active`);
        return response.json();
    },
    createAlert: async (alertData) => {
        const response = await fetch(`${API_BASE_URL}/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertData)
        });
        return response.json();
    },
    deleteAlert: async (id) => {
        await fetch(`${API_BASE_URL}/alerts/${id}`, {
            method: 'DELETE'
        });
    },

    // Shelters
    getShelters: async () => {
        const response = await fetch(`${API_BASE_URL}/shelters`);
        return response.json();
    },
    getNearbyShelters: async (lat, lng) => {
        const response = await fetch(`${API_BASE_URL}/shelters/nearby?lat=${lat}&lng=${lng}`);
        return response.json();
    },
    createShelter: async (shelterData) => {
        const response = await fetch(`${API_BASE_URL}/shelters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shelterData)
        });
        return response.json();
    },
    updateShelter: async (id, shelterData) => {
        const response = await fetch(`${API_BASE_URL}/shelters/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shelterData)
        });
        return response.json();
    },
    deleteShelter: async (id) => {
        await fetch(`${API_BASE_URL}/shelters/${id}`, {
            method: 'DELETE'
        });
    },

    // Forecasts
    getForecasts: async () => {
        const response = await fetch(`${API_BASE_URL}/forecasts`);
        return response.json();
    },
    getLatestForecasts: async () => {
        const response = await fetch(`${API_BASE_URL}/forecasts/latest`);
        return response.json();
    },

    // Helplines
    getHelplines: async () => {
        const response = await fetch(`${API_BASE_URL}/helplines`);
        return response.json();
    },
    createHelpline: async (helplineData) => {
        const response = await fetch(`${API_BASE_URL}/helplines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(helplineData)
        });
        return response.json();
    },
    deleteHelpline: async (id) => {
        await fetch(`${API_BASE_URL}/helplines/${id}`, {
            method: 'DELETE'
        });
    },

    // Reports
    getReports: async () => {
        const response = await fetch(`${API_BASE_URL}/reports`);
        return response.json();
    },
    submitReport: async (reportData) => {
        const response = await fetch(`${API_BASE_URL}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });
        return response.json();
    },

    // Weekly Reports
    getLatestWeeklyReports: async () => {
        const response = await fetch(`${API_BASE_URL}/api/weekly-reports/latest`);
        return response.json();
    },
    getWeeklyReportsByWeek: async (weekStartDate) => {
        const response = await fetch(`${API_BASE_URL}/api/weekly-reports/week/${weekStartDate}`);
        return response.json();
    },
    getProvinceReports: async (province) => {
        const response = await fetch(`${API_BASE_URL}/api/weekly-reports/province/${province}`);
        return response.json();
    },
    generateWeeklyReports: async () => {
        const response = await fetch(`${API_BASE_URL}/api/weekly-reports/generate`, {
            method: 'POST'
        });
        return response.json();
    }
};

