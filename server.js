const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Get API credentials from environment variables
const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('API credentials not found in environment variables');
  process.exit(1);
}

const app = express();
app.use(cors());

/**
 * getSignature
 * Constructs the signature per Bybit V5 requirements.
 * According to the docs the prehash string should be:
 *    preHash = timestamp + API_KEY + recv_window + queryString
 * where queryString is formed by sorting all the query parameters.
 */
const getSignature = (parameters, timestamp) => {
  // Extract recv_window and remove any extra spaces (if present)
  const recvWindow = parameters.recv_window || '';
  
  // Order the parameters alphanumerically
  const orderedParams = Object.keys(parameters)
    .sort()
    .reduce((obj, key) => {
      obj[key] = parameters[key];
      return obj;
    }, {});
  
  // Form the query string in the format key1=value1&key2=value2...
  const queryString = Object.entries(orderedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Construct the pre-hash string
  const preHash = `${timestamp}${API_KEY}${recvWindow}${queryString}`;
  
  // Create and return the HMAC SHA256 signature
  return crypto.createHmac('sha256', API_SECRET).update(preHash).digest('hex');
};

app.get('/api/tickers', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'spot',
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp);
    
    // If production endpoint is blocked, you can switch to testnet by changing the URL below.
    // For example, to use testnet:
    // const endpoint = 'https://api-testnet.bybit.com/v5/market/tickers';
    // Otherwise, for production:
    const endpoint = 'https://api.bybit.com/v5/market/tickers';
    
    const response = await axios.get(endpoint, {
      params: params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recv_window
      }
    });
    
    console.log('Server received response:', response.status);
    console.log('Response data:', response.data);
    
    if (response.data && response.data.retCode === 0) {
      res.json(response.data);
    } else {
      console.error('Invalid response:', response.data);
      throw new Error('Invalid response from Bybit API');
    }
  } catch (error) {
    console.error('Server Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      error: 'Failed to fetch data from Bybit',
      details: error.response ? error.response.data : error.message 
    });
  }
});

const PORT = 4001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));