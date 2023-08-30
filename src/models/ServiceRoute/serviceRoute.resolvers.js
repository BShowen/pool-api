import mongoose from "mongoose";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import { extractQueryFieldSelection } from "../../utils/extractQueryFieldSelection.js";
export default {
  Query: {
    serviceRouteAll: async (_, __, { models, user }) => {
      const companyId = new mongoose.Types.ObjectId(user.c_id);
      // Get all technicians and customerAccounts
      const [technicianList, customerList] = await Promise.all([
        models.Technician.find({
          company: companyId,
        }),
        models.CustomerAccount.find({
          company: companyId,
        }),
      ]);

      // Reduce technicianList array into an object of serviceRoutes where each
      // key is the technician id and the value is the serviceRoute type.
      const technicianObject = technicianList.reduce(
        (accumulator, tech) => {
          accumulator[tech._id.toString()] = {
            ...tech._doc,
            customerAccounts: [],
            count: 0,
          };
          return accumulator;
        },
        {
          0: {
            firstName: "unassigned",
            lastName: "unassigned",
            customerAccounts: [],
            count: 0,
          },
        }
      );

      // Add the customerAccount to the appropriate serviceRoute
      customerList.forEach((customer) => {
        if (customer.technician) {
          technicianObject[
            customer.technician._id.toString()
          ].customerAccounts.push(customer);
          technicianObject[customer.technician._id.toString()].count++;
        } else {
          technicianObject["0"].customerAccounts.push(customer);
          technicianObject["0"].count++;
        }
      });
      return Object.values(technicianObject);
    },
    serviceRouteWeek: async (_, __, context) => {
      /**
       * Get all service routes associated with the currently logged in user.
       * This is a list of ALL serviceRoutes and not just today's service route
       */
      const { user, models } = context;

      user.authenticateAndAuthorize({ role: "TECH" });

      const routes = await models.CustomerAccount.aggregate([
        {
          $match: {
            technician: new mongoose.Types.ObjectId(user.u_id),
            company: new mongoose.Types.ObjectId(user.c_id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "account",
            as: "accountOwners",
          },
        },
        {
          $group: {
            _id: "$serviceDay",
            customerAccounts: { $push: "$$ROOT" },
            total: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            serviceDay: "$_id",
            customerAccounts: 1,
            total: 1,
            count: 1,
          },
        },
      ]);
      return routes;
    },
    serviceRouteToday: async (_, __, { user, models }) => {
      user.authenticateAndAuthorize({ role: "TECH" });

      const { CustomerAccount, Technician } = models;

      const formatter = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });

      // today = "06/07/2023" or "01/13/2023" etc
      const today = formatter.format(new Date()).toLowerCase();

      // Get all customers
      // where serviceDay === today
      // where technician === technicianId
      // where company === companyId
      const customerAccounts = await CustomerAccount.find({
        // serviceDay: "wednesday" or "sunday" or "friday" etc.
        serviceDay: new Intl.DateTimeFormat([], { weekday: "long" })
          .format() //This formats today's date.
          .toLowerCase(),
        technician: user.u_id,
        company: user.c_id,
      });

      /**
       * Filter the results and remove all customers where
       * customerAccount.poolReport.date === todaysDate
       * The reason is because this resolver is responsible for retrieving the
       * customerAccounts that need to be serviced TODAY and if a
       * customerAccount has a pool report with today's date, then that customer
       * has already been serviced and shouldn't be included in the list.
       * If a customerAccount has a pool report for today, then they have
       * already been serviced and
       */
      const filtered = customerAccounts.filter((customerAccount) => {
        if (customerAccount.poolReports.length > 0) {
          // If the customerAccount has pool reports, then determine whether or
          // not to keep the customerAccount.

          // Get the most recent pool report.
          // await customerAccount.populate("latestPoolReport");
          const poolReport = customerAccount.latestPoolReport;

          /**
           * If the date on the pool report is todays date then we don't want
           * to keep this customer as they have already been serviced today.
           */
          const poolReportDate = formatter.format(poolReport.date);
          if (poolReportDate === today) {
            return false; //Remove this customer
          } else {
            return true; //Keep this customer
          }
        } else {
          // If no pool reports on the customerAccount then this is the first
          // time servicing this customer and they should be kept in the list.
          // Also, there is no need to populate the "latestPoolReport" field as
          // there are no pool reports.
          return true;
        }
      });

      const technician = await Technician.findOne({ _id: user.u_id });
      const count = filtered.length;
      return {
        ...technician._doc,
        customerAccounts: filtered,
        count,
      };
    },
    serviceRouteByTechId: async (_, { technicianId }, context) => {
      const { user, models } = context;
      user.authenticateAndAuthorize({ role: "TECH" });
      validateMongooseId(technicianId);
      const routes = await models.CustomerAccount.aggregate([
        {
          $match: {
            technician: new mongoose.Types.ObjectId(technicianId),
            company: new mongoose.Types.ObjectId(user.c_id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "account",
            as: "accountOwners",
          },
        },
        {
          $group: {
            _id: "$serviceDay",
            customerAccounts: { $push: "$$ROOT" },
            total: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            serviceDay: "$_id",
            customerAccounts: 1,
            total: 1,
            count: 1,
          },
        },
      ]);
      return routes;
    },
  },
  ServiceRouteGrouped: {
    total: (parent) => {
      return Number.parseFloat(parent.total).toFixed(2);
    },
    customerAccounts: (parent) => {
      // Assign "id" to customerAccount and give it the value of "_id"
      parent.customerAccounts.forEach((customerAccount) => {
        customerAccount.id = customerAccount._id;
      });
      return parent.customerAccounts;
    },
  },
  ServiceRoute: {
    // technician: (parent) => {
    //   // The document received from mongoDB has an _id field. However,
    //   // the typeDef defines this document with an id not an _id
    //   // Return a technician with all fields and replace "_id" with "id".
    //   const technician = {
    //     ...parent.technician,
    //     id: parent?.technician?._id || null,
    //   };
    //   technician.firstName = technician.firstName
    //     ? technician.firstName
    //     : "Unassigned";
    //   technician.lastName = technician.lastName
    //     ? technician.lastName
    //     : "Unassigned";
    //   return technician;
    // },
    technician: (parent) => {
      return { ...parent, id: parent._id || null };
    },
    customerAccounts: async (parent) => {
      for (const customerAccount of parent.customerAccounts) {
        customerAccount.id = customerAccount._id;
      }
      return parent.customerAccounts;
    },
  },
};
