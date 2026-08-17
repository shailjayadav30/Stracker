import type { Request, Response } from "express";
import prisma from "../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "../validationSchema/authSchema.js";
export async function register(req: Request, res: Response) {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "validation failed" });
    }
    const data: RegisterInput = validation.data;
    const { userName, email, password } = data;
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (existingUser) {
      return res.status(409).json({
        message: "User allready exists",
      });
    }
    const hashedPass = await bcrypt.hash(password, 12);
    const userWithoutPassword = await prisma.user.create({
      data: {
        userName,
        email,
        password: hashedPass,
      },
      select: {
        id: true,
        userName: true,
        email: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      userWithoutPassword,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Internal Server error",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "validation failed" });
    }
    const data: LoginInput = validation.data;
    const { email, password } = data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!existingUser) {
      return res.status(409).json({
        message: "User doesn't exists",
      });
    }
    // const token=await jwt.sign()
    const isPassCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPassCorrect) {
      return res.status(404).json({
        message: "Invalid email or password",
      });
    }

    return res.status(201).json({
      message: "User logged in successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Internal Server error",
    });
  }
}
