module.exports = function preSaveFormatter(document) {
  /**
   * Recursively navigate through "document" and the sub documents and
   * convert all strings to lowercase.
   * Arrays and ObjectId's are ignored.
   */
  for (const [key, value] of Object.entries(document)) {
    if (typeof value === "string" && key !== "password") {
      document[key] = value.trim().toLowerCase();
    } else if (
      typeof value === "object" &&
      key != "_id" &&
      !Array.isArray(value)
    ) {
      /**
       * Recursively navigate through sub documents.
       * typeof mongoose.Types.ObjectId === "object" // true
       * Do NOT navigate through the ObjectId object.
       */
      preSaveFormatter(value);
    } else if (Array.isArray(value)) {
      value.forEach((subDocument) => {
        preSaveFormatter(subDocument);
      });
    }
  }
};
