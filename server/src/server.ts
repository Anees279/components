// src/server.ts
import dotenv from 'dotenv';
dotenv.config(); // Must be first before using process.env
import cors from 'cors';
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import bodyParser from "body-parser";
import Stripe from "stripe";

import paymentRouter from "./routes/payment";
const app = express();
app.use(cors({
  origin: "http://localhost:3000", // or use "*" to allow all
}));

const staticDir: string = process.env.STATIC_DIR || path.join(__dirname, "../public");
app.use(express.static(staticDir));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.get("/", (_req: Request, res: Response) => {
  const indexPath = path.resolve(staticDir + "/index.html");
  res.sendFile(indexPath);
});

app.get("/config", (_req: Request, res: Response) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.use("/", paymentRouter);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16" as any,
  typescript: true,
});

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    let event: Stripe.Event;

    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        console.log(`⚠️  Webhook signature is missing.`);
        res.sendStatus(400);
        return;
      }
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET is not defined in environment variables.");
      }
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      res.sendStatus(400);
      return;
    }

    const eventType = event.type;

    if (eventType === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`🔔  PaymentIntent succeeded: ${pi.id}`);
    } else if (eventType === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Payment failed for PaymentIntent: ${pi.id}`);
    }

    res.sendStatus(200);
  }
);

const PORT = 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));
