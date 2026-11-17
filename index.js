const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect("/index.html");
});

app.post("/api/chat", async (req, res) => {
    try {
        const messages = req.body.messages;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: "Message harus berupa Array"
            });
        }
//

    } catch (error) {

        console.error("Server Error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                error: "Terjadi kesalahan pada server"
            });
        } else {
            res.write(
                `data: ${JSON.stringify(
                    "Terjadi kesalahan pada server"
                )}\n\n`
            );

            res.end();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});