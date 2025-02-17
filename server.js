const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

// Get API credentials from environment variables
const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;

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
const getSignature = (parameters, timestamp, isGet = false) => {
  let preHash = '';
  
  if (isGet) {
    // For GET requests, create query string *without sorting* to preserve insertion order.
    const queryString = Object.keys(parameters)
      // .sort() // Remove sorting!
      .map(key => `${key}=${parameters[key]}`)
      .join('&');
    
    // For GET requests: timestamp + API_KEY + recv_window + queryString
    preHash = `${timestamp}${API_KEY}${parameters.recv_window}${queryString}`;
  } else {
    // For POST requests: timestamp + API_KEY + recv_window + JSON.stringify(parameters)
    const postBody = JSON.stringify(parameters);
    preHash = `${timestamp}${API_KEY}${parameters.recv_window}${postBody}`;
  }
  
  console.log('Pre-hash string:', preHash); // For debugging
  
  return crypto.createHmac('sha256', API_SECRET).update(preHash).digest('hex');
};

app.get('/api/tickers', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'spot',
      recv_window: '5000'
    };
    
    if (req.query.symbol) {
      params.symbol = req.query.symbol.toUpperCase();
    }
    
    const signature = getSignature(params, timestamp, true); // Add true for GET request
    
    const endpoint = 'https://api-testnet.bybit.com/v5/market/tickers';
    
    const response = await axios.get(endpoint, {
      params: params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recv_window
      }
    });
    
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

// Get account balance
app.get('/api/balance', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      accountType: 'CONTRACT',
      coin: 'USDT',
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp, true); // Add true for GET request
    
    const response = await axios.get('https://api-testnet.bybit.com/v5/account/wallet-balance', {
      params: params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recv_window
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Place order
app.post('/api/place-order', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    
    const timestamp = Date.now().toString();
    const { symbol, side, type, qty, reduceOnly, closeOnTrigger } = req.body;
    
    // If this is a position close (reduceOnly is true)
    if (reduceOnly) {
      // First, get the current position to confirm size
      const positionParams = {
        category: 'linear',
        symbol: symbol,
        recv_window: '5000'
      };

      const positionSignature = getSignature(positionParams, timestamp, true);
      
      const positionResponse = await axios.get(
        'https://api-testnet.bybit.com/v5/position/list',
        {
          params: positionParams,
          headers: {
            'X-BAPI-API-KEY': API_KEY,
            'X-BAPI-SIGN': positionSignature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': '5000'
          }
        }
      );

      console.log('Current position response:', positionResponse.data);

      if (!positionResponse.data?.result?.list) {
        throw new Error('Could not fetch current position');
      }

      const currentPosition = positionResponse.data.result.list.find(
        p => p.symbol === symbol
      );

      if (!currentPosition) {
        throw new Error('Position not found');
      }

      const positionSize = Math.abs(parseFloat(currentPosition.size));
      if (positionSize === 0) {
        return res.json({
          retCode: 0,
          message: 'Position already closed'
        });
      }

      // Place the closing order with the exact position size
      const orderParams = {
        category: 'linear',
        symbol: symbol,
        side: currentPosition.side === 'Buy' ? 'Sell' : 'Buy', // opposite of current position
        orderType: 'Market',
        qty: positionSize.toString(),
        timeInForce: 'GTC',
        positionIdx: 0,
        reduceOnly: true,
        closeOnTrigger: true,
        recv_window: '5000'
      };

      console.log('Placing close position order with params:', orderParams);
      
      const orderSignature = getSignature(orderParams, timestamp);
      
      const response = await axios.post(
        'https://api-testnet.bybit.com/v5/order/create',
        orderParams,
        {
          headers: {
            'X-BAPI-API-KEY': API_KEY,
            'X-BAPI-SIGN': orderSignature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': orderParams.recv_window,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Close position response:', response.data);
      
      if (response.data.retCode === 0) {
        // Wait a moment for the order to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the position is closed
        const verifyParams = {
          category: 'linear',
          symbol: symbol,
          recv_window: '5000'
        };

        const verifySignature = getSignature(verifyParams, Date.now().toString(), true);
        
        const verifyResponse = await axios.get(
          'https://api-testnet.bybit.com/v5/position/list',
          {
            params: verifyParams,
            headers: {
              'X-BAPI-API-KEY': API_KEY,
              'X-BAPI-SIGN': verifySignature,
              'X-BAPI-TIMESTAMP': Date.now().toString(),
              'X-BAPI-RECV-WINDOW': '5000'
            }
          }
        );

        const verifyPosition = verifyResponse.data?.result?.list?.find(
          p => p.symbol === symbol
        );

        if (verifyPosition && Math.abs(parseFloat(verifyPosition.size)) > 0) {
          throw new Error('Position not fully closed');
        }

        res.json({
          retCode: 0,
          message: 'Position closed successfully'
        });
      } else {
        throw new Error(response.data.retMsg || 'Failed to close position');
      }
    } else {
      // Modify symbol to add USDT if not present
      const orderSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
      const reqLeverage = req.body.leverage || '10'; // Default to 10x if not provided

      // Get instrument info to determine allowed leverage and quantity precision
      const instrumentParams = {
        category: 'linear',
        symbol: orderSymbol,
        recv_window: '5000'
      };
      
      const instrumentSignature = getSignature(instrumentParams, timestamp, true);
      
      const instrumentResponse = await axios.get(
        'https://api-testnet.bybit.com/v5/market/instruments-info',
        {
          params: instrumentParams,
          headers: {
            'X-BAPI-API-KEY': API_KEY,
            'X-BAPI-SIGN': instrumentSignature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': instrumentParams.recv_window
          }
        }
      );
      
      if (!instrumentResponse.data?.result?.list?.[0]) {
        throw new Error('Could not get instrument information');
      }
      
      const instrumentInfo = instrumentResponse.data.result.list[0];
      const lotSizeFilter = instrumentInfo.lotSizeFilter;
      const leverageFilter = instrumentInfo.leverageFilter;
      const qtyStep = parseFloat(lotSizeFilter.qtyStep);
      const minOrderQty = parseFloat(lotSizeFilter.minOrderQty);
      const maxLeverage = parseFloat(leverageFilter.maxLeverage);
      
      // Adjust the requested leverage if it exceeds maximum allowed
      let finalLeverage = Math.min(parseFloat(reqLeverage), maxLeverage);
      
      // Set leverage first
      const leverageParams = {
        category: 'linear',
        symbol: orderSymbol,
        buyLeverage: finalLeverage.toString(),
        sellLeverage: finalLeverage.toString(),
        recv_window: '5000'
      };
      
      const leverageSignature = getSignature(leverageParams, timestamp);
      
      try {
        const leverageResponse = await axios.post(
          'https://api-testnet.bybit.com/v5/position/set-leverage',
          leverageParams,
          {
            headers: {
              'X-BAPI-API-KEY': API_KEY,
              'X-BAPI-SIGN': leverageSignature,
              'X-BAPI-TIMESTAMP': timestamp,
              'X-BAPI-RECV-WINDOW': leverageParams.recv_window,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Leverage set response:', leverageResponse.data);
      } catch (leverageError) {
        console.error('Error setting leverage:', leverageError);
        // Continue with the order even if leverage setting fails
      }
      
      // Get current price
      const tickerParams = {
        category: 'linear',
        symbol: orderSymbol,
        recv_window: '5000'
      };
      
      const tickerSignature = getSignature(tickerParams, timestamp, true);
      
      const tickerResponse = await axios.get(
        'https://api-testnet.bybit.com/v5/market/tickers',
        {
          params: tickerParams,
          headers: {
            'X-BAPI-API-KEY': API_KEY,
            'X-BAPI-SIGN': tickerSignature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': tickerParams.recv_window
          }
        }
      );
      
      if (!tickerResponse.data?.result?.list?.[0]?.lastPrice) {
        throw new Error('Could not get current price for symbol');
      }
      
      const currentPrice = parseFloat(tickerResponse.data.result.list[0].lastPrice);
      
      // Calculate the target quantity as a float (desired USDT amount divided by current price)
      let calculatedQty = parseFloat(qty) / currentPrice;
      
      // Compute the allowed quantities using the lot size step:
      const floorQty = Math.floor(calculatedQty / qtyStep) * qtyStep;
      const ceilQty = Math.ceil(calculatedQty / qtyStep) * qtyStep;
      
      // Ensure both quantities are not below the minimum order quantity
      const validFloorQty = floorQty < minOrderQty ? minOrderQty : floorQty;
      const validCeilQty = ceilQty < minOrderQty ? minOrderQty : ceilQty;
      
      // Calculate the absolute differences in USDT value
      const floorValueDiff = Math.abs(parseFloat(qty) - validFloorQty * currentPrice);
      const ceilValueDiff = Math.abs(parseFloat(qty) - validCeilQty * currentPrice);
      
      // Choose the quantity that yields the order value closest to the target USDT amount
      let finalQty = (floorValueDiff <= ceilValueDiff) ? validFloorQty : validCeilQty;
      
      // Format the quantity with the correct precision (based on the lot size step)
      const decimalPlaces = qtyStep.toString().split('.')[1]?.length || 0;
      const formattedQty = finalQty.toFixed(decimalPlaces);
      
      console.log(`Converting ${qty} USDT to ${formattedQty} ${symbol} at price ${currentPrice}`);
      console.log(`Using lot size step: ${qtyStep}, min order qty: ${minOrderQty}`);
      
      // Place the order
      const orderParams = {
        category: 'linear',
        symbol: orderSymbol,
        side: side,
        orderType: type.toUpperCase(),
        qty: formattedQty,
        timeInForce: 'GTC',
        recv_window: '5000',
        positionIdx: 0,
        reduceOnly: false,
        closeOnTrigger: false
      };
      
      console.log('Placing order with params:', orderParams);
      
      const orderSignature = getSignature(orderParams, timestamp);
      
      try {
        const response = await axios.post(
          'https://api-testnet.bybit.com/v5/order/create',
          orderParams,
          {
            headers: {
              'X-BAPI-API-KEY': API_KEY,
              'X-BAPI-SIGN': orderSignature,
              'X-BAPI-TIMESTAMP': timestamp,
              'X-BAPI-RECV-WINDOW': orderParams.recv_window,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Order response:', response.data);
        
        if (response.data.retCode === 0) {
          res.json({
            ...response.data,
            orderDetails: {
              qty,
              calculatedQty: formattedQty,
              price: currentPrice
            }
          });
        } else {
          res.status(400).json({
            error: 'Order placement failed',
            details: response.data
          });
        }
      } catch (orderError) {
        console.error('Order API error:', orderError.response?.data || orderError.message);
        throw orderError;
      }
    }
  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({
      error: 'Failed to place order',
      details: error.message,
      message: error.message
    });
  }
});

// Update the positions endpoint
app.get('/api/positions', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    const params = {
      category: 'linear',
      settleCoin: 'USDT', // Required for linear positions
      limit: '50',        // Increased limit to get more positions
      recv_window: '5000'
    };
    
    console.log('Fetching positions with params:', params);
    
    const signature = getSignature(params, timestamp, true);
    
    console.log('Generated signature:', signature);
    
    const response = await axios.get(
      'https://api-testnet.bybit.com/v5/position/list',
      {
        params: params,
        headers: {
          'X-BAPI-API-KEY': API_KEY,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': params.recv_window,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Raw positions response:', response.data);
    
    if (response.data && response.data.retCode === 0) {
      // Filter out positions with zero size if needed
      const activePositions = response.data.result.list.filter(
        position => parseFloat(position.size) > 0
      );
      
      res.json({
        ...response.data,
        result: {
          ...response.data.result,
          list: activePositions
        }
      });
    } else {
      console.error('Invalid positions response:', response.data);
      res.status(400).json({
        error: 'Failed to fetch positions',
        details: response.data
      });
    }
  } catch (error) {
    console.error('Error fetching positions:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch positions',
      details: error.response?.data || error.message
    });
  }
});

// New endpoint for closed positions
app.get('/api/v5/position/closed-pnl', async (req, res) => {
  try {
    const { category, limit } = req.query;
    const timestamp = Date.now().toString();
    const params = {
      category: category || 'linear',
      limit: limit || '50',
      recv_window: '5000'
    };
    
    const signature = getSignature(params, timestamp, true);
    
    const response = await axios.get('https://api-testnet.bybit.com/v5/position/closed-pnl', {
      params: params,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recv_window,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Closed PNL response:', response.data);
    
    if (response.data && response.data.retCode === 0) {
      res.json(response.data);
    } else {
      console.error('Invalid closed PNL response:', response.data);
      res.status(400).json({
        error: 'Failed to fetch closed positions',
        details: response.data
      });
    }
  } catch (error) {
    console.error('Error fetching closed positions:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch closed positions',
      details: error.response?.data || error.message 
    });
  }
});

// Add HTTPS options
const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/ecommerzz.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/ecommerzz.com/fullchain.pem')
};

const PORT = 4001;
// Create HTTPS server
https.createServer(httpsOptions, app).listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
});