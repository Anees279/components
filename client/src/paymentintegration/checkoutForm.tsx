// src/PaymentPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const PaymentPage: React.FC = () => {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch publishable key
    fetch("http://localhost:4242/config")
      .then((res) => res.json())
      .then((data) => {
        setPublishableKey(data.publishableKey);
      })
      .catch(() => setError("Failed to load Stripe publishable key"));
  }, []);

  useEffect(() => {
    if (!publishableKey) return;

    // Fetch client secret to initialize payment intent
    fetch("http://localhost:4242/create-payment-intent")
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError("Failed to create payment intent");
        }
      })
      .catch(() => setError("Failed to create payment intent"));
  }, [publishableKey]);

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!publishableKey || !clientSecret) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" mt={2}>
          Loading payment info...
        </Typography>
      </Container>
    );
  }

  const stripePromise = loadStripe(publishableKey);

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe", // default stripe style, you can customize
      variables: {
        colorPrimary: "#556cd6",
        colorBackground: "#f6f9fc",
        colorText: "#30313d",
        colorDanger: "#df1b41",
      },
      rules: {
        ".Label": {
          color: "#6b7c93",
        },
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
};

const CheckoutForm: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!stripe || !elements) {
      setMessage("Stripe has not loaded yet.");
      return;
    }

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/success",
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? "An unexpected error occurred.");
    } else if (paymentIntent?.status === "succeeded") {
      setMessage("Payment succeeded!");
    }

    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      <form id="payment-form" onSubmit={handleSubmit}>
        <Box mb={3}>
          <PaymentElement />
        </Box>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || !stripe || !elements}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : "Pay Now"}
        </Button>
      </form>

      {message && (
        <Box mt={3}>
          <Alert severity={message.includes("succeeded") ? "success" : "error"}>
            {message}
          </Alert>
        </Box>
      )}
    </Container>
  );
};

export default PaymentPage;
