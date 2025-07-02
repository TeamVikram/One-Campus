import express from "express";
import {
  createDepartment,
  getAllDepartment,
  getDepartmentById,
  // updateDepartment,
  // deleteDepartment,
} from "../controller/departmentController.js";

const router = express.Router();

//For Department

// router.post("/", createHOD);

router.post("/:id/department", createDepartment);
router.get("/:id/department", getAllDepartment);
router.get("/:id/department/:uid", getDepartmentById);
// router.put("/:id", updateDepartment);
// router.delete("/:id", deleteDepartment);

export default router;
