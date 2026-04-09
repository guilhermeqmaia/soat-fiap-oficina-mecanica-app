import { CpfCnpj } from "./cpf-cnpj.vo";

describe("CpfCnpj Value Object", () => {
  describe("CPF", () => {
    it("deve aceitar CPF valido", () => {
      const cpf = CpfCnpj.create("529.982.247-25");
      expect(cpf.getValue()).toBe("52998224725");
    });

    it("deve rejeitar CPF com digitos repetidos", () => {
      expect(() => CpfCnpj.create("111.111.111-11")).toThrow("CPF invalido");
    });

    it("deve rejeitar CPF com digito verificador errado", () => {
      expect(() => CpfCnpj.create("529.982.247-99")).toThrow("CPF invalido");
    });
  });

  describe("CNPJ", () => {
    it("deve aceitar CNPJ valido", () => {
      const cnpj = CpfCnpj.create("11.222.333/0001-81");
      expect(cnpj.getValue()).toBe("11222333000181");
    });

    it("deve rejeitar CNPJ invalido", () => {
      expect(() => CpfCnpj.create("11.222.333/0001-99")).toThrow(
        "CNPJ invalido",
      );
    });
  });

  describe("Formato", () => {
    it("deve rejeitar documento com tamanho incorreto", () => {
      expect(() => CpfCnpj.create("123")).toThrow(
        "Documento deve ter 11 (CPF) ou 14 (CNPJ) digitos",
      );
    });
  });
});
