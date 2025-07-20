import express from "express";
import {
  getPublishedCreations,
  getUserCreations,
  toggleLikeCreations,
} from "../controllers/user.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const userRouter = express.Router();

userRouter.get("/get-user-creations", auth, getUserCreations);
userRouter.get("/get-published-creations", auth, getPublishedCreations);
userRouter.post("/toggle-like-creation", auth, toggleLikeCreations);

export default userRouter;
