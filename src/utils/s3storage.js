import * as dotenv from "dotenv";
dotenv.config();
import {
  S3,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { createReadStream } from "fs";
import { fileTypeFromFile } from "file-type";

const s3Client = new S3({ region: process.env.REGION });

export const s3storage = () => {
  return {
    getObject,
    putObject,
  };
};

const getObject = async ({ key }) => {
  // Get the image url for the provided "key"
  const input = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: "inline",
    // ResponseContentType:
  };

  if (!(await objectExists({ key }))) {
    return false;
  }

  const getObjectCommand = new GetObjectCommand(input);
  const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 60,
  });

  return presignedUrl;
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
  return { ...(await s3Client.send(putObjectCommand)), Key: params.Key };
};

const objectExists = async ({ key }) => {
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
      console.log("Error getting object", error);
      return false;
    }
  }
};

class AWS_Error extends Error {
  constructor(message) {
    super(message);
    this.name = "AWS_Error";
  }
}
