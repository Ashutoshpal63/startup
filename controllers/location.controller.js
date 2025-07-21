// Controllers/location.controller.js
import axios from 'axios';

// Converts an address string into coordinates using LocationIQ
export const geocodeAddress = async (req, res) => {
  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ message: 'Address is required' });
  }

  try {
    const response = await axios.get('https://us1.locationiq.com/v1/search.php', {
      params: {
        key: process.env.LOCATIONIQ_API_KEY,
        q: address,
        format: 'json',
        limit: 1
      },
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const location = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon), // Note: LocationIQ uses 'lon' for longitude
      };
      res.status(200).json({ location, fullAddress: result.display_name });
    } else {
      res.status(404).json({ message: 'Could not geocode address' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Geocoding service error', error: error.message });
  }
};