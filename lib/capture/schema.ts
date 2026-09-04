import { z } from "zod";

const money = z.object({
  amount: z.int().nonnegative(),
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "Expected a 3-letter ISO currency code")
    .transform((code) => code.toUpperCase()),
});

export const captureSchema = z.object({
  url: z.url(),
  title: z.string().min(1).max(500),
  price: money.nullish(),
  shipping: money.nullish(),
  image_url: z.url().nullish(),
  variant: z.string().max(300).nullish(),
  in_stock: z.boolean().nullish(),
  captured_at: z.iso.datetime().nullish(),

  item_id: z.uuid().nullish(),
  force_new: z.boolean().default(false),
});

export type CaptureInput = z.infer<typeof captureSchema>;
