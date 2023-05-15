export default `#graphql
  type Technician{
    firstName: String, 
    lastName: String, 
    emailAddress: String, 
    id: ID, 
    password: String, 
    companyId: ID, 
    registrationSecret: String
  }

  type AccountOwner{
    firstName: String,
    lastName: String,
    emailAddress: String,
    phoneNumber: String,
  }

  type CustomerAccount {
    accountName: String,
    serviceType: String,
    serviceDay: String, 
    serviceFrequency: String, 
    address: String,
    price: Int,
    companyId: ID
    id: ID
    technician: Technician
    accountOwners: [AccountOwner]!
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
  
  type Mutation {
    "Get and authorization token (JWT) for the user"
    login(email: String, password: String): String
  }
`;
