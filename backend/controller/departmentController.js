import { sql } from "./../config/db.js";
import generateUniqueAlphaNumericId from "../lib/idGenerator.js";
import client from "../redis/client.js";
const timeToStoreRedisCache = 600; // 10 mins

// Helper function to store single academic year data in Redis using hash format
export const storeSingleDepartmentInRedis = async (departmentRecord) => {
  try {
    const hashKey = `department:${departmentRecord.department_id}`;

    // Store individual record as hash
    await client.hset(hashKey, {
      department_id: departmentRecord.department_id,
      academic_year_id: departmentRecord.academic_year_id,
      hod_id: departmentRecord.hod_id,
      hod_name: departmentRecord.hod_name,
      email: departmentRecord.email,
      department_name: departmentRecord.department_name,
      created_at: departmentRecord.created_at,
    });

    // Set expiration for the hash
    await client.expire(hashKey, timeToStoreRedisCache);

    // Add to set of all academic year IDs for easy retrieval
    await client.sadd("department:all", departmentRecord.department_id);
    await client.expire("department:all", timeToStoreRedisCache);

    console.log(
      `Stored department in Redis: ${departmentRecord.department_id}`
    );
    return true;
  } catch (error) {
    console.log(`Error storing single department in Redis: ${error}`);
    return false;
  }
};

// Function to create academic year & store it in redis & database
export const createDepartment = async (req, res) => {
  const { id } = req.params;
  const { hod_id, hod_name, email, department_name } = req.body;

  if (!department_name) {
    return res
      .status(400)
      .json({ success: false, message: "Department name is required" });
  }

  try {
    const newId = generateUniqueAlphaNumericId(6);
    const DepartmentData = await sql`
      INSERT INTO department (department_id, academic_year_id, hod_id, hod_name, email, department_name)
      VALUES (${newId},${id},${hod_id},${hod_name},${email},${department_name})
      RETURNING *
    `;

    console.log("Data inserted into Database:", DepartmentData);
    const departmentRecord = DepartmentData[0];

    // Use the helper function to store in Redis
    await storeSingleDepartmentInRedis(departmentRecord);

    res.status(201).json({ success: true, data: departmentRecord });
    console.log(
      `New Department added to database and Redis: ${departmentRecord.department_id}`
    );
  } catch (error) {
    console.log(`Error in createDepartment function -> ${error}`);
    res.status(500).json({
      success: false,
      message: "createDepartment function Internal Server Error",
    });
  }
};

export const getDepartmentFromRedisById = async (department_id) => {
  try {
    const hashKey = `department:${department_id}`;
    const data = await client.hgetall(hashKey);

    // Check if hash exists and has data
    if (Object.keys(data).length === 0) {
      return null;
    }

    return data;
  } catch (error) {
    console.log(`Error retrieving department from Redis: ${error}`);
    return null;
  }
};

export const getAllDepartmentsFromRedis = async () => {
  try {
    const departmentIds = await client.smembers("department:all");
    const departments = [];

    for (const id of departmentIds) {
      const data = await getDepartmentFromRedisById(id);
      if (data) {
        departments.push(data);
      }
    }

    return departments;
  } catch (error) {
    console.log(`Error retrieving all departments from Redis: ${error}`);
    return [];
  }
};

export const storeAllDepartmentsInRedis = async (departmentData) => {
  try {
    // Clear existing data
    const existingIds = await client.smembers("department:all");
    for (const id of existingIds) {
      await client.del(`department:${id}`);
    }
    await client.del("department:all");

    // Store new data using the helper function
    for (const record of departmentData) {
      await storeSingleDepartmentInRedis(record);
    }

    console.log(`Stored ${departmentData.length} department in Redis hashes`);
  } catch (error) {
    console.log(`Error storing department in Redis: ${error}`);
  }
};

export const getAllDepartment = async (req, res) => {
  try {
    // First, try to get from Redis hashes
    const { hod_id } = req.body;
    const cachedData = await getAllDepartmentsFromRedis();

    if (cachedData && cachedData.length > 0) {
      console.log(`Fetched ${cachedData.length} Departments from Redis cache`);
      return res.status(200).json({
        success: true,
        data: cachedData,
        source: "cache",
      });
    }

    // If not in cache or empty, fetch from database
    console.log("Cache miss - fetching from database");
    const DepartmentData = await sql`
      SELECT * FROM department
      WHERE hod_id = ${hod_id}
      ORDER BY created_at DESC
    `;

    // Store in Redis hashes for future requests
    await storeAllDepartmentsInRedis(DepartmentData);

    console.log(
      `Fetched ${DepartmentData.length} departments from database and cached in Redis`
    );

    return res.status(200).json({
      success: true,
      data: DepartmentData,
      source: "database",
    });
  } catch (error) {
    console.log(`Error in getAllDepartment function -> ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getDepartmentById = async (req, res) => {
  const { uid } = req.params;
  const { hod_id } = req.body;
  try {
    // First, try to get from Redis using the correct hash key format
    const cacheData = await getDepartmentFromRedisById(uid);

    if (cacheData) {
      console.log(
        `Fetched Department from Redis cache: ${JSON.stringify(cacheData)}`
      );
      return res.status(200).json({
        success: true,
        data: cacheData,
        source: "cache",
      });
    }

    // If not in cache, fetch from database
    console.log("Cache miss - fetching from database");
    const DepartmentData = await sql`
      SELECT * FROM department
      WHERE department_id = ${uid} and hod_id = ${hod_id}
    `;

    // Check if record exists
    if (DepartmentData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const departmentRecord = DepartmentData[0];

    // Use the helper function to store in Redis
    await storeSingleDepartmentInRedis(departmentRecord);

    console.log(
      `Fetched department from database and cached in Redis: ${departmentRecord.department_id}`
    );

    return res.status(200).json({
      success: true,
      data: departmentRecord,
      source: "database",
    });
  } catch (error) {
    console.log(`Error in getDepartmentById function -> ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updateAcademicYearInRedis = async (academicRecord) => {
  try {
    // Remove the old record first (in case the ID changed)
    const hashKey = `academic_year:${academicRecord.academic_year_id}`;
    await client.del(hashKey);

    // Store the updated record
    const success = await storeSingleAcademicYearInRedis(academicRecord);

    if (success) {
      console.log(
        `Updated academic year in Redis: ${academicRecord.academic_year_id}`
      );
    }

    return success;
  } catch (error) {
    console.log(`Error updating academic year in Redis: ${error}`);
    return false;
  }
};

export const updateAcademicYear = async (req, res) => {
  const { id } = req.params;
  const { academic_year } = req.body;

  if (!academic_year) {
    return res.status(400).json({
      success: false,
      message: "Academic year is required",
    });
  }

  try {
    // First, check if data exists in Redis
    const searchingInRedis = await getDepartmentFromRedisById(id);

    // Update in database
    const AcademicYearData = await sql`
      UPDATE academic_year
      SET academic_year=${academic_year}
      WHERE academic_year_id=${id}
      RETURNING *
    `;

    if (AcademicYearData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Academic Year not found",
      });
    }

    const updatedRecord = AcademicYearData[0];

    await storeSingleAcademicYearInRedis(updatedRecord);

    return res.status(200).json({
      success: true,
      data: updatedRecord,
      message: searchingInRedis
        ? "Data is updated in both, Redis and database"
        : "Data is updated in database and stored in Redis",
    });
  } catch (error) {
    console.log(`Error in updateAcademicYear function -> ${error}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const deleteAcademicYear = async (req, res) => {
  const { id } = req.params;
  try {
    const searchingInRedis = await getDepartmentFromRedisById(id);
    const AcademicYearData = await sql`
      DELETE FROM academic_year
      WHERE academic_year_id=${id}
      RETURNING *
    `;
    if (AcademicYearData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Academic Year not found",
      });
    }
    if (searchingInRedis) {
      const hashKey = `academic_year:${id}`;

      // Remove the hash
      await client.del(hashKey);

      // Remove from the set of all academic year IDs
      await client.srem("department:all", id);
    }
    res.status(200).json({ success: true, data: AcademicYearData[0] });
  } catch (error) {
    console.log(`Error in deleteAcademicYear function ->${error}`);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
