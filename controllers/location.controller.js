// =======================================
//      Controllers/location.controller.js
// =======================================

import axios from 'axios';

// ========== GEOCODE ADDRESS ==========
export const geocodeAddress = async (req, res) => {
  const { address } = req.query;

  // Validate address input
  if (!address) {
    return res.status(400).json({ message: 'Address is required' });
  }

  try {
    const response = await axios.get(
      'https://us1.locationiq.com/v1/search.php',
      {
        params: {
          key: process.env.LOCATIONIQ_API_KEY,
          q: address,
          format: 'json',
          limit: 1,
        },
      }
    );

    // Check if results exist
    if (response?.data?.length > 0) {
      const result = response.data[0];

      const location = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon), // LocationIQ uses 'lon' for longitude
      };

      return res.status(200).json({
        status: 'success',
        location,
        fullAddress: result.display_name,
      });
    }

    // No data found
    return res.status(404).json({ message: 'Could not geocode address' });

  } catch (error) {
    // Handle API or server error
    return res.status(500).json({
      message: 'Geocoding service error',
      error: error.message,
    });
  }
};
