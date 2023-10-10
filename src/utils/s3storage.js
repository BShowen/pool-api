import * as dotenv from "dotenv";
dotenv.config();
import {
  S3,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { createReadStream } from "fs";

const s3Client = new S3({ region: process.env.REGION });

const getObject = async ({ key }) => {
  // Get the image url for the provided "key"
  const input = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: "inline",
    // ResponseContentType:
  };

  if (!(await objectExists({ key }))) {
    return "";
  }

  const getObjectCommand = new GetObjectCommand(input);
  const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 60,
  });

  return presignedUrl;
};

const putObjects = async ({ fileList = [] }) => {
  const amazonResponse = await Promise.allSettled(
    fileList.map(
      async (file) =>
        await putObject({ filePathUrl: file.fileUrl, mime: file.mime })
    )
  );
  return amazonResponse
    .filter((file) => file.status === "fulfilled")
    .map((file) => {
      return file.value;
    });
};

const putObject = async ({ filePathUrl, mime }) => {
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

const deleteObject = async ({ key }) => {
  const input = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  const deleteCommand = new DeleteObjectCommand(input);
  return await s3Client.send(deleteCommand);
};

const objectExists = async ({ key }) => {
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
    validateAwsKey: objectExists,
    getObject,
    putObjects,
    deleteObject,
  };
})();
