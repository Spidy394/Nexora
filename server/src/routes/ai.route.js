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

const router = express.Router();

router.post("/generate-article", auth, generateArticle);
router.post("/generate-blog-title", auth, generateBlogTitle);
router.post("/generate-image", auth, generateImage);
router.post("/remove-bg", upload.single("imgae"), auth, removeBackground);
router.post("/generate-object", upload.single("imgae"), auth, removeObject);
router.post("/resume-review", upload.single("resume"), auth, reviewResume);

export default router;
