const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;
const BASE_URL = 'https://api.bybit.com'; // Changed from testnet to mainnet

if (!API_KEY || !API_SECRET) {
  console.error('API credentials not found in environment variables');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * getSignature
 * Constructs the signature per Bybit V5 requirements.
 */
const getSignature = (parameters, timestamp, method = 'GET') => {
  let preHash = timestamp + API_KEY + '5000';
  
  if (method === 'GET' && Object.keys(parameters).length) {
    const queryString = Object.keys(parameters)
      .map(key => `${key}=${parameters[key]}`)
      .join('&');
    preHash += queryString;
  } else if (method === 'POST') {
    preHash += JSON.stringify(parameters);
  }
  
  return crypto.createHmac('sha256', API_SECRET).update(preHash).digest('hex');
};

app.get('/api/tickers', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'linear',
      recv_window: '5000'
    };
    
    if (req.query.symbol) {
      params.symbol = req.query.symbol.toUpperCase();
    }
    
    const signature = getSignature(params, timestamp);
    const response = await axios.get(`${BASE_URL}/v5/market/tickers`, {
      params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching tickers:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch tickers' });
  }
});

// Get account balance
app.get('/api/balance', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      accountType: 'UNIFIED',
      coin: 'USDT',
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp);
    
    const response = await axios.get(`${BASE_URL}/v5/account/wallet-balance`, {
      params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching balance:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: error.response?.data || error.message 
    });
  }
});

// Place order
app.post('/api/order', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    
    // First set position mode to One-Way Mode
    const setModeParams = {
      category: 'linear',
      symbol: req.body.symbol,
      mode: 0,
      recv_window: '5000'
    };

    // Set position mode
    await axios.post(
      `${BASE_URL}/v5/position/switch-mode`,
      setModeParams,
      {
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': getSignature(setModeParams, timestamp, 'POST'),
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        }
      }
    );

    // Set leverage
    const setLeverageParams = {
      category: 'linear',
      symbol: req.body.symbol,
      buyLeverage: req.body.leverage,
      sellLeverage: req.body.leverage,
      recv_window: '5000'
    };

    await axios.post(
      `${BASE_URL}/v5/position/set-leverage`,
      setLeverageParams,
      {
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': getSignature(setLeverageParams, timestamp, 'POST'),
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        }
      }
    );

    // Place the main market order
    const orderParams = {
      category: 'linear',
      symbol: req.body.symbol,
      side: req.body.side,
      orderType: 'Market',
      qty: req.body.qty,
      positionIdx: 0,
      timeInForce: 'GoodTillCancel',
      recv_window: '5000'
    };

    console.log('Placing main order with params:', orderParams);

    const orderResponse = await axios.post(
      `${BASE_URL}/v5/order/create`,
      orderParams,
      {
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': getSignature(orderParams, timestamp, 'POST'),
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        }
      }
    );

    // Calculate stop loss price (35% below entry price)
    const entryPrice = parseFloat(req.body.lastPrice);
    const stopLossPrice = (entryPrice * 0.65).toFixed(4); // 35% below entry

    // Set the stop loss using the correct endpoint
    const stopLossParams = {
      category: 'linear',
      symbol: req.body.symbol,
      stopLoss: stopLossPrice,
      slTriggerBy: 'LastPrice',
      tpslMode: 'Full',
      slOrderType: 'Market',
      positionIdx: 0,
      takeProfit: "0", // Set to 0 to cancel any existing TP
      trailingStop: "0", // Set to 0 to cancel any existing TS
      recv_window: '5000'
    };

    console.log('Setting stop loss with params:', stopLossParams);

    const stopLossResponse = await axios.post(
      `${BASE_URL}/v5/position/trading-stop`,
      stopLossParams,
      {
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': getSignature(stopLossParams, timestamp, 'POST'),
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        }
      }
    );

    // Return combined response
    res.json({
      mainOrder: orderResponse.data,
      stopLoss: stopLossResponse.data
    });
  } catch (error) {
    console.error('Error placing orders:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to place orders',
      details: error.response?.data || error.message
    });
  }
});

// Update the positions endpoint
app.get('/api/positions', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'linear',
      settleCoin: 'USDT',
      limit: '50',
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp);
    
    const response = await axios.get(
      `${BASE_URL}/v5/position/list`,
      {
        params,
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000'
        }
      }
    );
    
    if (response.data?.retCode === 0) {
      const activePositions = response.data.result.list.filter(
        position => parseFloat(position.size) > 0
      );
      res.json({
        ...response.data,
        result: { ...response.data.result, list: activePositions }
      });
    } else {
      throw new Error('Invalid response from Bybit API');
    }
  } catch (error) {
    console.error('Error fetching positions:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Updated close position endpoint
app.post('/api/close-position', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    
    // Create a market order to close the position
    const orderParams = {
      category: 'linear',
      symbol: req.body.symbol,
      side: 'Sell', // Always sell to close
      orderType: 'Market',
      qty: req.body.qty,
      positionIdx: 0,
      reduceOnly: true, // Important: this ensures we only close existing position
      timeInForce: 'GoodTillCancel',
      closeOnTrigger: true,
      recv_window: '5000'
    };

    console.log('Closing position with params:', orderParams);

    const signature = getSignature(orderParams, timestamp, 'POST');
    
    const response = await axios.post(
      `${BASE_URL}/v5/order/create`,
      orderParams,
      {
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Close position response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error closing position:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to close position',
      details: error.response?.data || error.message
    });
  }
});

// Updated closed PnL endpoint
app.get('/api/v5/position/closed-pnl', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'linear',
      limit: '50',
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp);
    
    const response = await axios.get(
      `${BASE_URL}/v5/position/closed-pnl`,
      {
        params,
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching closed PnL:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch closed PnL' });
  }
});

// Add this new endpoint to check symbol validity
app.get('/api/check-symbol', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'linear',
      symbol: req.query.symbol,
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp);
    
    const response = await axios.get(`${BASE_URL}/v5/market/instruments-info`, {
      params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
      }
    });
    
    if (response.data?.result?.list?.length > 0) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Error checking symbol:', error.response?.data || error.message);
    res.json({ valid: false });
  }
});

// Add this new endpoint to get instrument info
app.get('/api/instruments-info', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'linear',
      symbol: req.query.symbol,
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp);
    
    const response = await axios.get(`${BASE_URL}/v5/market/instruments-info`, {
      params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting instrument info:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get instrument info',
      details: error.response?.data || error.message
    });
  }
});

// Add HTTPS options
const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/mybybitbot.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/mybybitbot.com/fullchain.pem')
};

const PORT = 4001;
// Create HTTPS server
https.createServer(httpsOptions, app).listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
});