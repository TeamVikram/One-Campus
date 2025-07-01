import express from "express";
import {
  createSubjectTeacher,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controller/subjectController.js";

const router = express.Router();

//For Subject
router.post("/", createSubjectTeacher);
router.post("/", createSubject);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

export default router;
