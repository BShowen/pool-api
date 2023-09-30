import cors from "cors";

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
  allowedHeaders: [
    // Required by Apollo.
    "Content-Type",
    // Allow jwt to be sent in the req header.
    "Authorization",
    // Allow pre flight for enhanced CSRF protection during file uploads.
    "Apollo-Require-Preflight",
  ],
};

export const corsConfig = cors(corsOptions);
