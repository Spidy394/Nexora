import express from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  generateArticle,
  generateBlogTitle,
  generateImage,
  removeBackground,
  removeObject,
  reviewResume,
} from "../controllers/ai.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const aiRouter = express.Router();

aiRouter.post("/generate-article", auth, generateArticle);
aiRouter.post("/generate-blog-title", auth, generateBlogTitle);
aiRouter.post("/generate-image", auth, generateImage);
aiRouter.post("/remove-background", upload.single("imgae"), auth, removeBackground);
aiRouter.post("/generate-object", upload.single("imgae"), auth, removeObject);
aiRouter.post("/resume-review", upload.single("resume"), auth, reviewResume);

export default aiRouter;
