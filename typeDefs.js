const typeDefs = `#graphql
  type Technician{
    firstName: String, 
    lastName: String, 
    emailAddress: String, 
    id: ID, 
    password: String, 
    companyId: ID, 
    registrationSecret: String
  }

  type CustomerAccount {
    accountName: String,
    serviceType: String,
    serviceDay: String, 
    serviceFrequency: String, 
    price: Int,
    companyId: ID
    id: ID
    technician: Technician
  }

  type ServiceRoute {
    "A list of customers in this route"
    customers: [CustomerAccount]!
    "The technician associated with this route"
    technician: Technician
  }

  type Query {
    "Get a list of customers"
    customerAccounts: [CustomerAccount]!
    "Get a list of technicians"
    technicians: [Technician]!
    "Get a list of service routes"
    serviceRoutes: [ServiceRoute]!
  }
`;

export default typeDefs;
