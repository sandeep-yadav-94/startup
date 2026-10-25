import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { initSocket } from "./socket.js";
import internalRoute from "./routes/internal.js";

dotenv.config();


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/internal", internalRoute);


const server = http.createServer(app);

initSocket(server);



server.listen(process.env.PORT, () => {
  console.log(`Real-time server is running on port ${process.env.PORT}`);
});