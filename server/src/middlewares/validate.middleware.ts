import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Generic Zod validation middleware.
 * Validates req.body against the provided schema.
 * Returns 400 with structured error messages on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = ((error as any).errors || error.issues).map((e: any) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        res.status(400).json({ error: "Validation failed", details: messages });
        return;
      }
      next(error);
    }
  };
}
