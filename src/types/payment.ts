export interface PaymentData {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  numeroCartao: string;
  nomeNoCartao: string;
  validadeCartao: string;
  cvv: string;
  parcelas: number;
}

export interface PaymentDataExtended extends PaymentData {
  nomeCompleto: string;
  cpfCnpj: string;
  card_hash?: string;
}