import * as dotenv from "dotenv";
dotenv.config();
import { CourierClient } from "@trycourier/courier";

const courier = CourierClient({
  authorizationToken: process.env.COURIER_API_KEY,
});

/**
 * This functions takes in a technician object and the companyEmail address,
 * and sends an email to the technicians email address.
 */

export default async ({ technician, companyEmail }) => {
  if (process.env.EMAIL_ENABLED === undefined) {
    throw new Error("Please define process.env.EMAIL_ENABLED");
  }

  const canSendEmail = JSON.parse(process.env.EMAIL_ENABLED);
  if (!canSendEmail) {
    return;
  }

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
