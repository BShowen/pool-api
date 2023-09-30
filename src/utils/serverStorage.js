import { fileURLToPath } from "url";
import { createWriteStream, unlink } from "node:fs";
import { mkdir, constants, access, rm } from "node:fs/promises";
import { UPLOAD_DIR_URL } from "../serverConfig/UPLOAD_DIR_URL.js";

export const serverStorage = (file) => {
  const filePathUrl = fileURLToPath(UPLOAD_DIR_URL);

  async function storePhoto() {
    await validateUploadDir();
    return {
      ...(await saveFileLocally()),
      deleteUploadDir: deleteUploadDir.bind(this),
    };
  }

  return { storePhoto, deleteUploadDir };

  async function validateUploadDir() {
    try {
      await access(filePathUrl, constants.R_OK | constants.W_OK);
    } catch (error) {
      if (error.code === "EACCES") {
        console.log(`ERROR: No permission to access uploads directory.\n`);
      } else {
        await createDir();
      }
    }
  }

  async function deleteUploadDir() {
    try {
      await rm(filePathUrl, { recursive: true, force: true });
    } catch (error) {
      console.log("Error deleting upload dir: ", error);
    }
  }

  async function saveFileLocally() {
    const { createReadStream, filename } = await file;
    const stream = createReadStream();
    const storedFileName = filename;
    const storedFileUrl = new URL(storedFileName, UPLOAD_DIR_URL);

    // Store the file in the filesystem.
    await new Promise((resolve, reject) => {
      // Create a stream to which the upload will be written.
      const writeStream = createWriteStream(storedFileUrl);

      // When the upload is fully written, resolve the promise.
      writeStream.on("finish", resolve);

      // If there's an error writing the file, remove the partially written file
      // and reject the promise.
      writeStream.on("error", (error) => {
        unlink(storedFileUrl, () => {
          reject(error);
        });
      });

      // Pipe the upload into the write stream.
      stream.pipe(writeStream);
    });

    return { storedFileName, storedFileUrl };
  }

  async function createDir() {
    try {
      await mkdir(filePathUrl);
    } catch (error) {
      console.log(`Error creating uploads directory.`, { error });
    }
  }
};
