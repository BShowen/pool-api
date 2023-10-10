import { fileURLToPath } from "url";
import { createWriteStream, unlink } from "node:fs";
import { mkdir, constants, access, rm } from "node:fs/promises";
import { fileTypeStream } from "file-type";

import { UPLOAD_DIR_URL } from "../serverConfig/UPLOAD_DIR_URL.js";

export const serverStorage = (() => {
  const filePathUrl = fileURLToPath(UPLOAD_DIR_URL);

  return { storeImagesLocally, deleteUploadDir, validateFiles };

  async function validateFiles({ files = [], mimeType = undefined }) {
    if (!mimeType) {
      // Throw error if mimeType is not provided.
      throw new Error(
        "serverStorage.js function validateFileType param mimeType cannot be undefined"
      );
    }
    const validatedFiles = await Promise.allSettled(
      files.map(async (file) => {
        try {
          const { createReadStream, filename } = await file;
          const stream = createReadStream();
          const validatedFile = await fileTypeStream(stream);
          // Make sure each file's mimeType matches the mimeType provided.
          if (validatedFile?.fileType?.mime?.startsWith(mimeType)) {
            return {
              createReadStream,
              filename,
              mime: validatedFile.fileType.mime,
            };
          } else {
            return Promise.reject(
              `${validatedFile?.fileType?.mime} is not a valid file type. Only file types that start with "image/" are valid.`
            );
          }
        } catch (error) {
          console.log("Error validating the file type: ", error);
        }
      })
    );
    return (
      validatedFiles
        // Filter out rejected files
        .filter((file) => file.status === "fulfilled")
        // I want only the value of the resolved promise.
        .map((file) => file.value)
    );
  }

  async function storeImagesLocally({ files = [] }) {
    // Validate that the uploads directory exists and Node has permission to access
    await validateUploadDir();
    // fileUploads is an array of responses from calling saveFileLocally on each
    // file. Any successful file uploads will have a status and value. Any
    // failed file uploads will have a status and reason. See the example below.
    // fileUploads == [
    //   { status: "fulfilled", value: { fileName, fileUrl } },
    //   { status: "rejected", reason: "error message" },
    // ];
    const fileUploads = await Promise.allSettled(
      files.map(async (file) => await saveFileLocally({ file }))
    );

    // await Promise.allSettled(
    //   fileUploads.map(async (upload, index) => {
    //     if (upload.status === "rejected") {
    //       return await saveFileLocally({ file: files[index] });
    //     }
    //   })
    // );

    // fileUploads = [ { status: String, value: Object }, ... ]
    // Filter so the return value is: [ Object, Object, ... ]
    return fileUploads.map((file) => file.value);
  }

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

  async function saveFileLocally({ file }) {
    const { createReadStream, filename, mime } = await file;
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

    return {
      // fileName: storedFileName,
      fileUrl: storedFileUrl,
      mime,
    };
  }

  async function createDir() {
    try {
      await mkdir(filePathUrl);
    } catch (error) {
      console.log(`Error creating uploads directory.`, { error });
    }
  }
})();
