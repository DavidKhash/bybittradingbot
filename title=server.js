app.get('/api/tickers', async (req, res) => {
  try {
    const timestamp = Date.now().toString();
    // Use query parameters if provided; default to category 'spot'
    const params = {
      category: req.query.category ? req.query.category : 'spot',
      recv_window: '5000'
    };

    // Optionally add symbol if provided (always uppercase per docs)
    if (req.query.symbol) {
      params.symbol = req.query.symbol.toUpperCase();
    }

    // Optionally add baseCoin if provided (uppercase only, applies to option only)
    if (req.query.baseCoin) {
      params.baseCoin = req.query.baseCoin.toUpperCase();
    }

    const signature = getSignature(params, timestamp);

    // You can choose the endpoint here. For production:
    const endpoint = 'https://api.bybit.com/v5/market/tickers';
    // Or, if you prefer testnet:
    // const endpoint = 'https://api-testnet.bybit.com/v5/market/tickers';

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
      res.status(500).json({ error: 'Failed to fetch tickers' });
    }
  } catch (error) {
    console.error('Error fetching tickers:', error);
    res.status(500).json({ error: 'An error occurred while fetching tickers' });
  }
}); 