//Author: Amin Shahamiri
//Sample Node.js API for demonstration purposes
const express = require('express');
const app = express();

app.use(express.json()); // Allows the API to read JSON bodies

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the sample API' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' , timestamp: new Date().toISOString() });
});

// Start server
// Add a fallback to 3000 if APP_PORT is missing
const PORT = process.env.APP_PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
