import mongoose from "mongoose";

const connect = () => {
  return new Promise((resolve) => {
    mongoose.connect(process.env.DB_STRING);
    const db = mongoose.connection;
    db.on("error", (error) => {
      console.log("Exiting because mongoDB connection refused.");
      console.log(`MongoDB error message: ${error.message}`);
      process.exit(1);
    });
    db.once("open", async () => {
      console.log("Connected to MongoDB.\n");
      resolve(true);
    });
  });
};

export { connect as mongoConfig };
