import { z } from "zod";

export const registerSchema = z.object({
  userName: z
    .string({ error: "Username is required" })
    .trim()
    .min(3, "UserName must be atleast 3 characters")
    .max(100, "UserName cannot  be more than 100 characters"),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Invalid email format")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "password must be atleast 8 characters")
    .max(72, "Password is too long"),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Invalid email format")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "password must be atleast 8 characters")
    .max(72, "Password is too long"),
});



export type RegisterInput  = z.infer<typeof registerSchema>;
export type LoginInput  = z.infer<typeof loginSchema>;


