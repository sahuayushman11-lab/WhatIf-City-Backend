import { app } from './app.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏙️  WhatIf City Simulation Server is active!`);
  console.log(`🚀  Port: ${PORT}`);
  console.log(`🔗  Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});
