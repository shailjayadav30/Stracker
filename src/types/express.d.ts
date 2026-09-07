// import { auth } from "../lib/auth.js";
// declare global {
//   namespace Express {
//     interface Request {
//       user?: typeof auth.$Infer.Session.user;
//     }
//   }
// }

// export {};


// src/types/express.d.ts
import { auth } from "../lib/auth.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: typeof auth.$Infer.Session.user;
  }
}