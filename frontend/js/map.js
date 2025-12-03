let map;
let markers = [];

const mapUtils = {
    initMap: (elementId, lat = 30.3753, lng = 69.3451, zoom = 6) => {
        // Default center is Pakistan
        map = L.map(elementId).setView([lat, lng], zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        return map;
    },

    addMarker: (lat, lng, popupContent, type = 'shelter') => {
        const icon = mapUtils.getIcon(type);
        const marker = L.marker([lat, lng], { icon: icon }).addTo(map);

        if (popupContent) {
            marker.bindPopup(popupContent);
        }

        markers.push(marker);
        return marker;
    },

    clearMarkers: () => {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
    },

    getIcon: (type) => {
        // Define custom icons based on type
        // For simplicity, using default marker for now, but could be customized
        return new L.Icon.Default();
    },

    locateUser: () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Geolocation is not supported by your browser');
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.setView([latitude, longitude], 13);
                        L.marker([latitude, longitude]).addTo(map)
                            .bindPopup('You are here').openPopup();
                        resolve({ lat: latitude, lng: longitude });
                    },
                    (error) => {
                        let errorMsg = 'Unable to retrieve your location';
                        if (error.code === error.PERMISSION_DENIED) {
                            errorMsg = 'Location access denied. Please enable location permissions.';
                        } else if (error.code === error.POSITION_UNAVAILABLE) {
                            errorMsg = 'Location information unavailable.';
                        } else if (error.code === error.TIMEOUT) {
                            errorMsg = 'Location request timed out.';
                        }
                        reject(errorMsg);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            }
        });
    },

    // Search for a location using Nominatim geocoding API
    searchLocation: async (query) => {
        if (!query || query.trim() === '') {
            throw new Error('Please enter a location to search');
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
            );

            if (!response.ok) {
                throw new Error('Failed to search location');
            }

            const data = await response.json();

            if (data.length === 0) {
                throw new Error('Location not found. Please try a different search term.');
            }

            const location = data[0];
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lon);

            // Center map on the found location
            map.setView([lat, lng], 13);

            // Add a marker at the searched location
            L.marker([lat, lng]).addTo(map)
                .bindPopup(`<b>${location.display_name}</b>`).openPopup();

            return { lat, lng, name: location.display_name };
        } catch (error) {
            throw error;
        }
    },

    // Get location suggestions for autocomplete
    getSuggestions: async (query) => {
        if (!query || query.trim().length < 3) {
            return [];
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
            );

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return data.map(item => ({
                name: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            }));
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            return [];
        }
    }
};
