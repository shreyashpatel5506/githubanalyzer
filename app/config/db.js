import mongoose from "mongoose";

const connectMongo = async () => {
  // Check if the URI is defined before connecting
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error(
      "CRITICAL ERROR: MONGODB_URI environment variable is not defined in process.env."
    );
    console.error(
      "HINT: Ensure the .env file is in the root and dotenv.config() is called in src/index.js."
    );
    process.exit(1);
  }

  return mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
};

export default connectMongo;
