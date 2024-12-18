require("dotenv").config();
const connectDB = require("./config/MongoDB.js");
const app =require("./app.js")
const os = require('os');

connectDB();

const PORT = process.env.PORT || 5353;

// Get the local network IP address
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  };

app.listen(PORT, (err) => { 
    if (err) {
        console.log("Server not connected");
    } else {
        const localIp = getLocalIp();
        console.log(`Server is running at:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${localIp}:${PORT}`);
        }
});
