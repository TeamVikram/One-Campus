import { sql } from "./../config/db.js";
import { v4 as uuidv4 } from "uuid";
import client from "../redis/client.js";
const timeToStoreRedisCache = 600; // 10 mins

// Helper function to store single academic year data in Redis using hash format
export const storeSingleAcademicYearInRedis = async (academicRecord) => {
  try {
    const hashKey = `academic_year:${academicRecord.academic_year_id}`;

    // Store individual record as hash
    await client.hset(hashKey, {
      academic_year_id: academicRecord.academic_year_id,
      principal_id: academicRecord.principal_id,
      principal_name: academicRecord.principal_name,
      email: academicRecord.email,
      academic_year: academicRecord.academic_year,
      created_at: academicRecord.created_at,
    });

    // Set expiration for the hash
    await client.expire(hashKey, timeToStoreRedisCache);

    // Add to set of all academic year IDs for easy retrieval
    await client.sadd("academic_years:all", academicRecord.academic_year_id);
    await client.expire("academic_years:all", timeToStoreRedisCache);

    console.log(
      `Stored academic year in Redis: ${academicRecord.academic_year_id}`
    );
    return true;
  } catch (error) {
    console.log(`Error storing single academic year in Redis: ${error}`);
    return false;
  }
};

// Function to create academic year & store it in redis & database
export const createAcademicYear = async (req, res) => {
  const { principal_id, principal_name, email, academic_year } = req.body;

  if (!academic_year) {
    return res
      .status(400)
      .json({ success: false, message: "Academic year is required" });
  }

  try {
    const newId = uuidv4();
    const AcademicYearData = await sql`
      INSERT INTO academic_year (academic_year_id, principal_id, principal_name, email, academic_year)
      VALUES (${newId},${principal_id},${principal_name},${email},${academic_year})
      RETURNING *
    `;

    console.log("Data inserted into PostgreSQL:", AcademicYearData);
    const academicRecord = AcademicYearData[0];

    // Use the helper function to store in Redis
    await storeSingleAcademicYearInRedis(academicRecord);

    res.status(201).json({ success: true, data: academicRecord });
    console.log(
      `New academic year added to database and Redis: ${academicRecord.academic_year_id}`
    );
  } catch (error) {
    console.log(`Error in createAcademicYear function -> ${error}`);
    res.status(500).json({
      success: false,
      message: "createAcademicYear function Internal Server Error",
    });
  }
};

export const getAcademicYearFromRedisById = async (academic_year_id) => {
  try {
    const hashKey = `academic_year:${academic_year_id}`;
    const data = await client.hgetall(hashKey);

    // Check if hash exists and has data
    if (Object.keys(data).length === 0) {
      return null;
    }

    return data;
  } catch (error) {
    console.log(`Error retrieving academic year from Redis: ${error}`);
    return null;
  }
};

export const getAllAcademicYearsFromRedis = async () => {
  try {
    const academicYearIds = await client.smembers("academic_years:all");
    const academicYears = [];

    for (const id of academicYearIds) {
      const data = await getAcademicYearFromRedisById(id);
      if (data) {
        academicYears.push(data);
      }
    }

    return academicYears;
  } catch (error) {
    console.log(`Error retrieving all academic years from Redis: ${error}`);
    return [];
  }
};

export const storeAllAcademicYearsInRedis = async (academicYearsData) => {
  try {
    // Clear existing data
    const existingIds = await client.smembers("academic_years:all");
    for (const id of existingIds) {
      await client.del(`academic_year:${id}`);
    }
    await client.del("academic_years:all");

    // Store new data using the helper function
    for (const record of academicYearsData) {
      await storeSingleAcademicYearInRedis(record);
    }

    console.log(
      `Stored ${academicYearsData.length} academic years in Redis hashes`
    );
  } catch (error) {
    console.log(`Error storing academic years in Redis: ${error}`);
  }
};

export const getAllAcademicYear = async (req, res) => {
  try {
    // First, try to get from Redis hashes
    const { principal_id } = req.body;
    const cachedData = await getAllAcademicYearsFromRedis();

    if (cachedData && cachedData.length > 0) {
      console.log(
        `Fetched ${cachedData.length} Academic Years from Redis cache`
      );
      return res.status(200).json({
        success: true,
        data: cachedData,
        source: "cache",
      });
    }

    // If not in cache or empty, fetch from database
    console.log("Cache miss - fetching from database");
    const AcademicYearData = await sql`
      SELECT * FROM academic_year
      WHERE principal_id = ${principal_id}
      ORDER BY created_at DESC
    `;

    // Store in Redis hashes for future requests
    await storeAllAcademicYearsInRedis(AcademicYearData);

    console.log(
      `Fetched ${AcademicYearData.length} academic years from database and cached in Redis`
    );

    return res.status(200).json({
      success: true,
      data: AcademicYearData,
      source: "database",
    });
  } catch (error) {
    console.log(`Error in getAllAcademicYear function -> ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getAcademicYearById = async (req, res) => {
  const { id } = req.params;
  const { principal_id } = req.body;
  try {
    // First, try to get from Redis using the correct hash key format
    const cacheData = await getAcademicYearFromRedisById(id);

    if (cacheData) {
      console.log(
        `Fetched Academic Year from Redis cache: ${JSON.stringify(cacheData)}`
      );
      return res.status(200).json({
        success: true,
        data: cacheData,
        source: "cache",
      });
    }

    // If not in cache, fetch from database
    console.log("Cache miss - fetching from database");
    const AcademicYearData = await sql`
      SELECT * FROM academic_year 
      WHERE academic_year_id = ${id} and principal_id = ${principal_id}
    `;

    // Check if record exists
    if (AcademicYearData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found",
      });
    }

    const academicRecord = AcademicYearData[0];

    // Use the helper function to store in Redis
    await storeSingleAcademicYearInRedis(academicRecord);

    console.log(
      `Fetched academic year from database and cached in Redis: ${academicRecord.academic_year_id}`
    );

    return res.status(200).json({
      success: true,
      data: academicRecord,
      source: "database",
    });
  } catch (error) {
    console.log(`Error in getAcademicYearById function -> ${error}`);
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
    const searchingInRedis = await getAcademicYearFromRedisById(id);

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
    const searchingInRedis = await getAcademicYearFromRedisById(id);
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
      await client.srem("academic_years:all", id);
    }
    res.status(200).json({ success: true, data: AcademicYearData[0] });
  } catch (error) {
    console.log(`Error in deleteAcademicYear function ->${error}`);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
