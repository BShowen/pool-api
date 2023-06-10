import * as dotenv from "dotenv";
dotenv.config();
import { CourierClient } from "@trycourier/courier";

const courier = CourierClient({
  authorizationToken: process.env.COURIER_API_KEY,
});

/**
 * This functions takes in a user object and the companyEmail address,
 * and sends an email to the users email address.
 */

export default async ({ user, companyEmail }) => {
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
        email: user.emailAddress,
      },
      content: {
        title: `Hi ${user.firstName}!`,
        body: `Use the following link to complete your registration: ${user.registrationUrl}`,
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
