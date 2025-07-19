import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import router from "./src/routes/ai.route.js";
import connectCloudinary from "./src/configs/cloudinary.js";

const app = express();
const PORT = process.env.PORT || 3000;

await connectCloudinary();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("Server is live!"));

app.use(requireAuth());
app.use('/api/ai', router)

app.listen(PORT, () => {
  console.log("server is running on point", PORT);
});
