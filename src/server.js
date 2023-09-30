import * as dotenv from "dotenv";
dotenv.config();

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";

import { mongoConfig } from "./serverConfig/mongoConfig.js";
import { contextConfig } from "./serverConfig/contextConfig.js";
import { schemaConfig } from "./serverConfig/schemaConfig.js";
import { corsConfig } from "./serverConfig/corsConfig.js";

await mongoConfig(); // Connect to mongoDB.

const app = express();
const httpServer = http.createServer(app);
const server = new ApolloServer({
  schema: schemaConfig,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});
await server.start();

app.use(
  "/",
  corsConfig,
  bodyParser.json({ limit: "50mb" }),
  graphqlUploadExpress({
    maxFileSize: 10000000, // 10 MB (maxFileSize: bytes)
    maxFiles: 2,
  }), // Enable file uploads.
  expressMiddleware(server, {
    context: contextConfig,
  })
);

await new Promise((resolve) =>
  httpServer.listen({ port: process.env.PORT }, resolve)
);

const url = `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}`;
console.log(
  `🚀 Server ready at http://localhost:${process.env.PORT}/ or ${url}`
);
