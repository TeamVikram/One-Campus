// import express from "express";
// import helmet from "helmet";
// import morgan from "morgan";
// import cors from "cors";
// import dotenv from "dotenv";
// import academicyearRoutes from "./routes/academicyearRoutes.js";
// // import departmentRoutes from "./routes/departmentRoutes.js";
// // import collegeyearRoutes from "./routes/collegeyearRoutes.js";
// // import sectionRoutes from "./routes/sectionRoutes.js";
// // import subjectRoutes from "./routes/subjectRoutes.js";

// import { sql } from "./config/db.js";

// dotenv.config();
// import { aj } from "./lib/arcjet.js";
// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.json());
// app.use(cors());
// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//   })
// );
// app.use(morgan("dev"));
// app.use("/api/", academicyearRoutes);
// // app.use("/api/academicyear", academicyearRoutes);
// // app.use("/api/academicyear", departmentRoutes); // same prefix

// // apply arcjet rate-limit to all routes
// app.use(async (req, res, next) => {
//   try {
//     const decision = await aj.protect(req, {
//       requested: 10000000, // specifies that each request consumes 1 token #TODO change it to 1
//     });

//     if (decision.isDenied()) {
//       if (decision.reason.isRateLimit()) {
//         res.status(429).json({ error: "Too Many Requests" });
//         // } else if (decision.reason.isBot()) {
//         //   res.status(403).json({ error: "Bot access denied" });
//         // } else {
//         //   res.status(403).json({ error: "Forbidden" });
//       }
//       return;
//     }

//     // check for spoofed bots
//     if (
//       decision.results.some(
//         (result) => result.reason.isBot() && result.reason.isSpoofed()
//       )
//     ) {
//       res.status(403).json({ error: "Spoofed bot detected" });
//       return;
//     }

//     next();
//   } catch (error) {
//     console.log("Arcjet error", error);
//     next(error);
//   }
// });

// async function initDB() {
//   try {
//     await sql`
//       CREATE TABLE IF NOT EXISTS academic_year (
//         academic_year_id VARCHAR NOT NULL UNIQUE,
//         principal_id VARCHAR NOT NULL,
//         principal_name VARCHAR NOT NULL,
//         email VARCHAR NOT NULL,
//         academic_year VARCHAR NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `;

//     await sql`
//       CREATE TABLE IF NOT EXISTS department (
//         department_id VARCHAR NOT NULL UNIQUE,
//         academic_year_id VARCHAR NOT NULL,
//         hod_id VARCHAR NOT NULL,
//         hod_name VARCHAR NOT NULL,
//         email VARCHAR NOT NULL,
//         department_name VARCHAR NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (academic_year_id) REFERENCES academic_year(academic_year_id)
//       );
//     `;

//     await sql`
//       CREATE TABLE IF NOT EXISTS college_year (
//         college_year_id VARCHAR NOT NULL UNIQUE,
//         department_id VARCHAR NOT NULL,
//         dean_id VARCHAR NOT NULL,
//         dean_name VARCHAR NOT NULL,
//         email VARCHAR NOT NULL,
//         college_year_name VARCHAR NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (department_id) REFERENCES department(department_id)
//       );
//     `;
//     await sql`
//       CREATE TABLE IF NOT EXISTS section (
//         section_id VARCHAR NOT NULL UNIQUE,
//         college_year_id VARCHAR NOT NULL,
//         class_teacher_id VARCHAR NOT NULL,
//         class_teacher_name VARCHAR NOT NULL,
//         email VARCHAR NOT NULL,
//         section_name VARCHAR NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (college_year_id) REFERENCES college_year(college_year_id)
//       );
//     `;
//     await sql`
//       CREATE TABLE IF NOT EXISTS subject (
//         subject_id VARCHAR NOT NULL UNIQUE,
//         section_id VARCHAR NOT NULL,
//         subject_teacher_id VARCHAR NOT NULL,
//         subject_teacher_name VARCHAR NOT NULL,
//         email VARCHAR NOT NULL,
//         subject_name VARCHAR NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (section_id) REFERENCES section(section_id)
//       );
//     `;
//     console.log("Database is connected");
//   } catch (error) {
//     console.log(`Error initDB${error}`);
//   }
// }
// initDB().then(() => {
//   app
//     .listen(PORT, () => {
//       console.log(`Server is running on Port ${PORT}`);
//     })
//     .on("error", (err) => {
//       console.error("Server failed to start:", err);
//     });
// });

import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import { sql } from "./config/db.js";
import { aj } from "./lib/arcjet.js";
import academicyearRoutes from "./routes/academicyearRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(morgan("dev"));

// Arcjet protection middleware
app.use(async (req, res, next) => {
  try {
    const decision = await aj.protect(req, {
      requested: 10000000, // specifies that each request consumes 1 token #TODO change it to 1
    });

    // if (decision.isDenied()) {
    //   if (decision.reason.isRateLimit()) {
    //     return res.status(429).json({ error: "Too Many Requests" });
    //   }
    //   return res.status(403).json({ error: "Forbidden" });
    // }

    // if (
    //   decision.results.some(
    //     (result) => result.reason.isBot() && result.reason.isSpoofed()
    //   )
    // ) {
    //   return res.status(403).json({ error: "Spoofed bot detected" });
    // }

    next();
  } catch (error) {
    console.error("Arcjet error:", error);
    next(error);
  }
});

// Routes
app.use("/api/", academicyearRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Initialize DB
async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS academic_year (
        academic_year_id VARCHAR NOT NULL UNIQUE,
        principal_id VARCHAR NOT NULL,
        principal_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        academic_year VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS department (
        department_id VARCHAR NOT NULL UNIQUE,
        academic_year_id VARCHAR NOT NULL,
        hod_id VARCHAR NOT NULL,
        hod_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        department_name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (academic_year_id) REFERENCES academic_year(academic_year_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS college_year (
        college_year_id VARCHAR NOT NULL UNIQUE,
        department_id VARCHAR NOT NULL,
        dean_id VARCHAR NOT NULL,
        dean_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        college_year_name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES department(department_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS section (
        section_id VARCHAR NOT NULL UNIQUE,
        college_year_id VARCHAR NOT NULL,
        class_teacher_id VARCHAR NOT NULL,
        class_teacher_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        section_name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_year_id) REFERENCES college_year(college_year_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS subject (
        subject_id VARCHAR NOT NULL UNIQUE,
        section_id VARCHAR NOT NULL,
        subject_teacher_id VARCHAR NOT NULL,
        subject_teacher_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        subject_name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (section_id) REFERENCES section(section_id)
      );
    `;

    console.log("Database initialized");
  } catch (error) {
    console.error("Error initializing DB:", error);
  }
}

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
