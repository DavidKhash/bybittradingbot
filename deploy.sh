   #!/bin/bash
   # Navigate to the project folder (adjust the path if needed)
   cd ~/crypto-search || exit
   # Pull on the latest changes from GitHub
   git pull origin main
   # Or if not using PM2, you might run:
   # pkill node
   # node server.js &