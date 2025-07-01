import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import academicyearRoutes from "./routes/academicyearRoutes.js";
import { sql } from "./config/db.js";

dotenv.config();
import { aj } from "./lib/arcjet.js";
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(morgan("dev"));
app.use("/api/academicyear", academicyearRoutes);
// apply arcjet rate-limit to all routes
app.use(async (req, res, next) => {
  try {
    const decision = await aj.protect(req, {
      requested: 1000, // specifies that each request consumes 1 token #TODO change it to 1
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        res.status(429).json({ error: "Too Many Requests" });
      } else if (decision.reason.isBot()) {
        res.status(403).json({ error: "Bot access denied" });
      } else {
        res.status(403).json({ error: "Forbidden" });
      }
      return;
    }

    // check for spoofed bots
    if (
      decision.results.some(
        (result) => result.reason.isBot() && result.reason.isSpoofed()
      )
    ) {
      res.status(403).json({ error: "Spoofed bot detected" });
      return;
    }

    next();
  } catch (error) {
    console.log("Arcjet error", error);
    next(error);
  }
});

async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS academic_year (
        academic_year_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        principal_id VARCHAR NOT NULL,
        principal_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        academic_year VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

    `;
    console.log("Database is connected");
  } catch (error) {
    console.log(`Error initDB${error}`);
  }
}
initDB().then(() => {
  app
    .listen(PORT, () => {
      console.log(`Server is running on Port ${PORT}`);
    })
    .on("error", (err) => {
      console.error("Server failed to start:", err);
    });
});
