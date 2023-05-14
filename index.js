import * as dotenv from "dotenv";
dotenv.config();

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import mongoose from "mongoose";

import resolvers from "./resolvers.js";
import typeDefs from "./typeDefs.js";
import CustomerAccount from "./models/CustomerAccount.js";
import Technician from "./models/Technician.js";

mongoose.connect(process.env.DB_STRING);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB");
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: process.env.PORT },
  context: async () => {
    return {
      models: {
        CustomerAccount,
        Technician,
      },
    };
  },
});

console.log(`🚀  Server ready at: ${url}`);
