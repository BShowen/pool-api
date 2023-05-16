import path from "path";
import url from "url";
import { loadFiles } from "@graphql-tools/load-files";
import { mergeResolvers } from "@graphql-tools/merge";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically load all [fileName]/resolvers.js from the models directory
const resolversArray = await loadFiles(
  path.join(__dirname, "../models/**/*resolvers.js"),
  {
    ignoreIndex: true,
    requireMethod: async (path) => {
      return await import(url.pathToFileURL(path));
    },
  }
);

const resolvers = mergeResolvers(resolversArray);
export default mergeResolvers(resolvers);
