const path = require('node:path');
module.exports = () => path.resolve(process.env.ZPROP_DATA_DIR || path.join(__dirname, '..'));
