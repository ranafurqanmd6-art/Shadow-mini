// Chhota web server. Render / Koyeb / Heroku / Railway jaise hosting par
// port open rakhne ke kaam aata hai taake bot band na ho.
const http = require('http');
const config = require('./config');
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>✅ ${config.botName} is running</h2>`);
  })
  .listen(PORT, () => console.log(`🌐 Web server port ${PORT} par chal raha hai`));
