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
router.post("/", createAcademicYear);
router.get("/", getAllAcademicYear);
router.get("/:id", getAcademicYearById);
router.put("/:id", updateAcademicYear);
router.delete("/:id", deleteAcademicYear);

export default router;
