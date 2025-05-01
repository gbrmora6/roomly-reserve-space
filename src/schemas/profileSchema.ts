
import { z } from "zod";

export const profileSchema = z.object({
  first_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  last_name: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  crp: z.string().optional(), // Make CRP optional to avoid validation issues
  specialty: z.string().min(2, "Especialidade deve ter pelo menos 2 caracteres"),
  cpf: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  // New address fields
  cep: z.string().min(8, "CEP inválido").max(9, "CEP inválido"),
  state: z.string().min(2, "Estado inválido"),
  city: z.string().min(2, "Cidade inválida"),
  neighborhood: z.string().min(2, "Bairro inválido"),
  street: z.string().min(2, "Rua inválida"),
  house_number: z.string().min(1, "Número inválido"),
}).refine(data => !data.cpf || !data.cnpj, {
  message: "Você deve preencher apenas CPF ou CNPJ, não ambos",
  path: ["cpf"]
});

export type ProfileFormData = z.infer<typeof profileSchema>;
