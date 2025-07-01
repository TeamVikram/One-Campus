import express from "express";
import {
  createDean,
  createCollegeYear,
  updateCollegeYear,
  deleteCollegeYear,
} from "../controller/collegeyearController.js";

const router = express.Router();

//For CollegeYear
router.post("/", createDean);
router.post("/", createCollegeYear);
router.put("/:id", updateCollegeYear);
router.delete("/:id", deleteCollegeYear);

export default router;
