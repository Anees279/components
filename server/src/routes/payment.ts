// src/routes/payment.ts
import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from "express";
import Stripe from "stripe";

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16" as any,
  typescript: true,
  appInfo: {
    name: "stripe-samples/accept-a-payment",
    url: "https://github.com/stripe-samples",
    version: "0.0.2",
  },
});

const calculateTaxFlag = false; // or set from env if needed

const calculate_tax = async (orderAmount: number, currency: string) => {
  const taxCalculation = await stripe.tax.calculations.create({
    currency,
    customer_details: {
      address: {
        line1: "10709 Cleary Blvd",
        city: "Plantation",
        state: "FL",
        postal_code: "33322",
        country: "US",
      },
      address_source: "shipping",
    },
    line_items: [
      {
        amount: orderAmount,
        reference: "ProductRef",
        tax_behavior: "exclusive",
        tax_code: "txcd_30011000",
      },
    ],
  });

  return taxCalculation;
};

// Create payment intent route
router.get("/create-payment-intent", async (req: Request, res: Response) => {
  let orderAmount = 1400; // you can get this dynamically from req query/body if needed

  try {
    let paymentIntent: Stripe.PaymentIntent;

    if (calculateTaxFlag) {
      const taxCalculation = await calculate_tax(orderAmount, "usd");
      paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: taxCalculation.amount_total,
        automatic_payment_methods: { enabled: true },
        metadata: { tax_calculation: taxCalculation.id },
      });
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: orderAmount,
        automatic_payment_methods: { enabled: true },
      });
    }

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    let message = "An unknown error occurred";
    if (error instanceof Error) message = error.message;
    res.status(400).send({ error: { message } });
  }
});

export default router;
