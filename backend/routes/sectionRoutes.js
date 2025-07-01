import express from "express";
import {
  createClassTeacher,
  createSection,
  updateSection,
  deleteSection,
} from "../controller/sectionController.js";

const router = express.Router();

//For Section
router.post("/", createClassTeacher);
router.post("/", createSection);
router.put("/:id", updateSection);
router.delete("/:id", deleteSection);

export default router;
