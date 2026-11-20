import { z } from "zod";

export const nationalEmailSchema = z.string().trim().email("Informe um e-mail válido para pagar").max(160);
export const validNationalEmail = (email: string) => nationalEmailSchema.safeParse(email).success;