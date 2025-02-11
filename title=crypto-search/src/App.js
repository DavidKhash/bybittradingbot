  <ul>
    {tickers.map((ticker) => (
      <li key={ticker.symbol}>
        <span className="symbol">{ticker.symbol}</span>:&nbsp;
        <span className="price">
          ${parseFloat(ticker.lastPrice).toLocaleString()}
        </span>
      </li>
    ))}
  </ul> 