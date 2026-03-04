import { z } from "zod";

// Shared field schemas
export const requiredString = z.string().trim().min(1, "This field is required");

export const emailField = z.string().trim().email("Please enter a valid email address");

export const passwordField = z.string().min(8, "Password must be at least 8 characters");

export const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const nonNegativeNumber = z.number().min(0, "Cannot be negative");

export const positiveNumber = z.number().positive("Must be greater than zero");

// Form schemas

export const profileSchema = z.object({
  firstName: requiredString,
  lastName: requiredString,
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", { error: 'Type "DELETE" to confirm' }),
});
export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: requiredString,
    newPassword: passwordField,
    confirmPassword: requiredString,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export const addEmailSchema = z.object({
  email: emailField,
});
export type AddEmailFormValues = z.infer<typeof addEmailSchema>;

export const verificationCodeSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit verification code"),
});
export type VerificationCodeFormValues = z.infer<typeof verificationCodeSchema>;

export const createOrgSchema = z.object({
  name: requiredString,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
});
export type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

export const inviteMemberSchema = z.object({
  email: emailField,
  role: z.enum(["org:member", "org:admin"]),
});
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export const addPromoSchema = z
  .object({
    description: requiredString,
    aprPercentage: nonNegativeNumber,
    balance: positiveNumber,
    startDate: dateField,
    expirationDate: dateField,
    isDeferredInterest: z.boolean(),
  })
  .refine((data) => data.expirationDate > data.startDate, {
    message: "Expiration date must be after start date",
    path: ["expirationDate"],
  });
export type AddPromoFormValues = z.infer<typeof addPromoSchema>;

export const createWalletSchema = z.object({
  name: requiredString.max(50, "Name must be 50 characters or less"),
});
export type CreateWalletFormValues = z.infer<typeof createWalletSchema>;
