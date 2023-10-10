import * as dotenv from "dotenv";
dotenv.config();
import {
  S3,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { createReadStream } from "fs";

const s3Client = new S3({ region: process.env.REGION });

const _getObject = async ({ key }) => {
  // Get the image url for the provided "key"
  const input = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: "inline",
    // ResponseContentType:
  };

  if (!(await _objectExists({ key }))) {
    return Promise.reject("Object doesn't exist");
  }

  const getObjectCommand = new GetObjectCommand(input);
  const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 86_400, // One day.
  });

  return { url: presignedUrl, key };
};

const getObjects = async ({ awsKeyList }) => {
  const preSignedUrls = await Promise.allSettled(
    awsKeyList.map(async (key) => {
      return await _getObject({ key });
    })
  );
  return preSignedUrls
    .filter((response) => response.status === "fulfilled")
    .map((response) => response.value);
};

const putObjects = async ({ fileList = [] }) => {
  const amazonResponse = await Promise.allSettled(
    fileList.map(
      async (file) =>
        await _putObject({ filePathUrl: file.fileUrl, mime: file.mime })
    )
  );
  return amazonResponse
    .filter((file) => file.status === "fulfilled")
    .map((file) => {
      return file.value;
    });
};

const _putObject = async ({ filePathUrl, mime }) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: crypto.randomBytes(32).toString("hex"),
    Body: createReadStream(filePathUrl),
    ContentDisposition: "inline",
    ContentType: mime,
  };

  const putObjectCommand = new PutObjectCommand(params);

  await s3Client.send(putObjectCommand);
  return params.Key;
};

const deleteObjects = async ({ awsKeyList }) => {
  try {
    if (!awsKeyList || awsKeyList.length == 0) {
      throw new Error(
        "s3storage.js -> deleteObjects aborted because no args given."
      );
    }
    const input = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Delete: {
        Objects: awsKeyList.map((key) => {
          return { Key: key };
        }),
        Quiet: false,
      },
    };
    const command = new DeleteObjectsCommand(input);
    return await s3Client.send(command);
  } catch (error) {
    console.log(error);
    return {};
  }
};

const _objectExists = async ({ key }) => {
  if (!key) return false;
  try {
    const input = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };
    const headObjectCommand = new HeadObjectCommand(input);
    await s3Client.send(headObjectCommand);
    return true;
  } catch (error) {
    if (error.name === "NotFound") {
      return false;
    } else {
      console.log(error);
      return false;
    }
  }
};

export const s3storage = (() => {
  return {
    getObjects,
    putObjects,
    deleteObjects,
  };
})();
