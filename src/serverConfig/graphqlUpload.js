import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";

export const graphqlUploadConfig = () => {
  const params = {
    maxFileSize: process.env.MAX_UPLOAD_SIZE,
    maxFiles: process.env.MAX_IMAGE_UPLOAD,
  };
  return graphqlUploadExpress(params);
};
