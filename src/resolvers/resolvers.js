// Queries
import customerAccountList, {
  fieldResolvers as customerAccountFields,
} from "./query/customerAccountList.js";
import technicianList from "./query/technicianList.js";
import serviceRouteList, {
  fieldResolvers as serviceRouteFields,
} from "./query/serviceRouteList.js";

// Mutations
import loginResolver from "./mutation/login.js";

export default {
  Query: {
    customerAccounts: customerAccountList,
    technicians: technicianList,
    serviceRoutes: serviceRouteList,
  },
  Mutation: {
    login: loginResolver,
  },
  ...serviceRouteFields,
  ...customerAccountFields,
};
