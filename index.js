const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = 3000;



app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});