import { loadStripe } from '@stripe/stripe-js';

// This is your test publishable API key.
const stripePromise = loadStripe('pk_test_51QYRlh3DpfSyrm2BgLFpN8YEYGEKEOSZT7qJHKr1Z6Jy7QoHDd1GNg7vYrF7uPu9UwBKLZqOqTmcXzJZFW5KbOcG00zZTgJHvQ');

export default stripePromise;