import express from "express";
import {
  createAcademicYear,
  getAllAcademicYear,
  getAcademicYearById,
  updateAcademicYear,
  deleteAcademicYear,
} from "../controller/academicyearController.js";

const router = express.Router();

//For AcademicYear
// router.post("/", createPrincipal);
router.post("/academicyear", createAcademicYear);
router.post("/allacademicyear", getAllAcademicYear);
router.post("/academicyear/:id", getAcademicYearById);
router.put("/academicyear/:id", updateAcademicYear);
router.delete("/academicyear/:id", deleteAcademicYear);

export default router;
