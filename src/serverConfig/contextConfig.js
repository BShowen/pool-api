import getUserFromToken from "../utils/getUserFromToken.js";

import CustomerAccount from "../models/CustomerAccount/CustomerAccount.js";
import User from "../models/User/User.js";
import Company from "../models/Company/Company.js";
import Technician from "../models/Technician/Technician.js";
import Customer from "../models/Customer/Customer.js";
import PoolReport from "../models/PoolReport/PoolReport.js";
import ChemicalLog from "../models/ChemicalLog/ChemicalLog.js";
import Service from "../models/Service/Service.js";
import { s3storage } from "../utils/s3storage.js";
export const contextConfig = async ({ req }) => {
  return {
    models: {
      CustomerAccount,
      User,
      Company,
      Technician,
      Customer,
      PoolReport,
      ChemicalLog,
      Service,
    },
    s3: s3storage,
    user: getUserFromToken({ req }),
  };
};
