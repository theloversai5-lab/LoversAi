import { z } from "zod";

export const plannerSignupSchema = z
  .object({
    role: z.enum(["Couple", "Planner"]),
    fullName: z
      .string()
      .trim()
      .max(80, "Full name is too long.")
      .optional()
      .or(z.literal("")),
    companyName: z
      .string()
      .trim()
      .max(120, "Company name is too long.")
      .optional()
      .or(z.literal("")),
    partnerName: z
      .string()
      .trim()
      .max(80, "Partner name is too long.")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address."),
    phone: z
      .string()
      .trim()
      .min(10, "Please enter a valid phone number.")
      .max(15, "Phone number is too long."),
    socialLink: z
      .string()
      .trim()
      .min(5, "Please enter your LinkedIn or Instagram profile URL."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/\d/, "Password must include a number.")
      .regex(/[^A-Za-z0-9]/, "Password must include a symbol."),
  })
  .superRefine((values, context) => {
    if (values.role === "Planner") {
      if (!values.companyName?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Please enter your company name.",
        });
      }
      if (!values.fullName?.trim() || values.fullName.trim().length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fullName"],
          message: "Please enter your full name.",
        });
      }
    }
  });

export const authLoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

export const formatZodErrors = (error) =>
  error.issues.map((issue) => issue.message).join(" ");
