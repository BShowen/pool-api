import * as dotenv from "dotenv";
dotenv.config();

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import cors from "cors";
import http from "http";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { makeExecutableSchema } from "@graphql-tools/schema";

import getUserFromToken from "./utils/getUserFromToken.js";
import resolvers from "./resolvers/index.js";
import typeDefs from "./typeDefs/index.js";

import CustomerAccount from "./models/CustomerAccount/CustomerAccount.js";
import User from "./models/User/User.js";
import Company from "./models/Company/Company.js";

mongoose.connect(process.env.DB_STRING);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB");
});

const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
const httpServer = http.createServer(app);
const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});
await server.start();

const corsOptions = {
  origin: function (origin, cb) {
    // Allow any origin in development
    const originAllowed =
      process.env.NODE_ENV === "development" ||
      process.env.ALLOWED_ORIGIN === origin;

    if (originAllowed) {
      return cb(null, true);
    } else {
      return cb(new Error("Origin not allowed"));
    }
  },
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(
  "/",
  cors(corsOptions),
  bodyParser.json({ limit: "50mb" }),
  expressMiddleware(server, {
    context: async ({ req }) => {
      return {
        models: {
          CustomerAccount,
          User,
          Company,
        },
        user: getUserFromToken({ req }),
      };
    },
  })
);

await new Promise((resolve) =>
  httpServer.listen({ port: process.env.PORT }, resolve)
);

const url = `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}`;
console.log(
  `🚀 Server ready at http://localhost:${process.env.PORT}/\nor ${url}`
);
