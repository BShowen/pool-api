import { makeExecutableSchema } from "@graphql-tools/schema";

import resolvers from "../resolvers/index.js";
import typeDefs from "../typeDefs/index.js";
export const schemaConfig = makeExecutableSchema({ typeDefs, resolvers });
