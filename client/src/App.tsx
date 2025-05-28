import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React from "react";
import CheckoutForm from "./paymentintegration/checkoutForm";

// Replace this with your actual Stripe publishable key
const stripePromise = loadStripe("your_stripe_publishable_key");

function App() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}

// ✅ Exporting the component
export default App;
