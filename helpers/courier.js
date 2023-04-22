const { CourierClient } = require("@trycourier/courier");
const courier = CourierClient({
  authorizationToken: process.env.COURIER_API_KEY,
});

module.exports.sendTechnicianSignupEmail = async function ({
  technician,
  companyEmail,
}) {
  const { requestId } = await courier.send({
    message: {
      to: {
        email: technician.emailAddress,
      },
      content: {
        title: `Hi ${technician.firstName}!`,
        body: `Use the following link to complete your registration: ${technician.registrationUrl}`,
      },
      routing: {
        method: "single",
        channels: ["email"],
      },
      channels: {
        email: {
          override: {
            reply_to: companyEmail,
          },
        },
      },
    },
  });
  return requestId;
};
