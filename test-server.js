// Minimal test server - bypasses everything to test if Node.js works at all
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Server is working!');
});

app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        message: 'API is working',
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasDbHost: !!process.env.MYSQL_HOST,
            hasDbPassword: !!process.env.MYSQL_PASSWORD
        }
    });
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
