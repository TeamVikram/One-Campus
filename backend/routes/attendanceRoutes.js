import express from "express";
import {
  getAttendance,
  getAttendanceById,
  updateAttendance,
} from "../controller/attendanceController.js";

const router = express.Router();

//For Subject
router.get("/", getAttendance);
router.get("/:id", getAttendanceById);
router.put("/:id", updateAttendance);

export default router;
