import { app } from './app.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = '0.0.0.0'; // Essential for Render container port binding

app.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(`🏙️  WhatIf City Simulation Server is active!`);
  console.log(`🚀  Host: ${HOST}:${PORT}`);
  console.log(`🔗  Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`===============================================`);
});
