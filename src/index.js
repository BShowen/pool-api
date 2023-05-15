import * as dotenv from "dotenv";
dotenv.config();

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import mongoose from "mongoose";

import getUserFromToken from "./utils/getUserFromToken.js";
import resolvers from "./resolvers/resolvers.js";
import typeDefs from "./schema/typeDefs.js";
import CustomerAccount from "./models/CustomerAccount.js";
import Technician from "./models/Technician.js";
import Company from "./models/Company.js";

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
  context: async ({ req }) => {
    return {
      models: {
        CustomerAccount,
        Technician,
        Company,
      },
      user: getUserFromToken({ req }),
    };
  },
});

console.log(`🚀  Server ready at: ${url}`);
