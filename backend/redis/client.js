import Redis from "ioredis";

// Connect to Redis
const client = new Redis({
  host: process.env.REDIS_HOST || "redis-stack", // Redis hostname
  port: process.env.REDIS_PORT || 6379, // Default Redis port
});

// Example: Set and Get data from Redis
client
  .set("my-key", "Hello from Redis Stack!")
  .then(() => client.get("my-key"))
  .then((result) => {
    console.log("Redis get result:", result); // Should print "Hello from Redis Stack!"
  })
  .catch((err) => {
    console.error("Redis error:", err);
  });

export default client;
