import { z } from "zod";

export const plannerSignupSchema = z
  .object({
    role: z.enum(["Couple", "Planner"]),
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name.")
      .max(80, "Full name is too long."),
    companyName: z
      .string()
      .trim()
      .max(120, "Company name is too long."),
    partnerName: z
      .string()
      .trim()
      .max(80, "Partner name is too long."),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/\d/, "Password must include a number.")
      .regex(/[^A-Za-z0-9]/, "Password must include a symbol."),
  })
  .superRefine((values, context) => {
    if (values.role === "Planner" && !values.companyName.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyName"],
        message: "Please enter your company name.",
      });
    }

    if (values.role === "Couple" && !values.partnerName.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partnerName"],
        message: "Please enter your partner's name.",
      });
    }
  });

export const authLoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

export const formatZodErrors = (error) =>
  error.issues.map((issue) => issue.message).join(" ");
