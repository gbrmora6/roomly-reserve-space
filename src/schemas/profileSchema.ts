
import { z } from "zod";

export const profileSchema = z.object({
  first_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  last_name: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  crp: z.string().regex(/^[0-9]{7,9}$/, "CRP deve conter entre 7 e 9 dígitos"),
  specialty: z.string().min(2, "Especialidade deve ter pelo menos 2 caracteres"),
  cpf: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
}).refine(data => !data.cpf || !data.cnpj, {
  message: "Você deve preencher apenas CPF ou CNPJ, não ambos",
  path: ["cpf"]
});

export type ProfileFormData = z.infer<typeof profileSchema>;
