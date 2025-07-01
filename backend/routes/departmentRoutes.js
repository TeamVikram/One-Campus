import express from "express";

import {
  createHOD,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controller/departmentController.js";

const router = express.Router();

//For Department
router.post("/", createHOD);
router.post("/", createDepartment);
router.put("/:id", updateDepartment);
router.delete("/:id", deleteDepartment);

export default router;
