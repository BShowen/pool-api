/**
 * This function returns an array of strings. Each string is a field that is in
 * the GraphQL query.
 *
 * Pass in the "info" parameter from your resolver and you get an array of any
 * field selections.
 */

export function extractQueryFieldSelection(info) {
  const field = info.fieldNodes[0];
  return extractFields(field);
}

function extractFields(field) {
  const selections = [field.name.value];
  // if (field.selectionSet?.selections) {
  field?.selectionSet?.selections?.map((subField) => {
    selections.push(...extractFields(subField));
  });
  // }
  return selections;
}
