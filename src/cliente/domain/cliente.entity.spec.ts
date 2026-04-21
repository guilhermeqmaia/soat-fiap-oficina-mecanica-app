import { InvalidCpfCnpjError } from "./errors/invalid-cpf-cnpj.error";
import { NameRequiredError } from "./errors/name-required.error";
import { PhoneRequiredError } from "./errors/phone-required.error";
import { Cliente } from "./cliente.entity";

describe("Cliente (Entity)", () => {
  const validProps = {
    nome: "Joao da Silva",
    cpfCnpj: "52998224725",
    telefone: "11999998888",
    email: "joao@email.com",
  };

  // ==================== create ====================

  describe("create", () => {
    it("deve criar um Cliente valido com todos os campos", () => {
      const cliente = Cliente.create(validProps);

      expect(cliente.nome).toBe("Joao da Silva");
      expect(cliente.cpfCnpj.value).toBe("52998224725");
      expect(cliente.telefone).toBe("11999998888");
      expect(cliente.email).toBe("joao@email.com");
    });

    it("deve criar um Cliente valido sem email (opcional)", () => {
      const cliente = Cliente.create({ ...validProps, email: undefined });
      expect(cliente.email).toBeUndefined();
    });

    it("deve criar um Cliente com CNPJ", () => {
      const cliente = Cliente.create({
        ...validProps,
        cpfCnpj: "11222333000181",
      });
      expect(cliente.cpfCnpj.value).toBe("11222333000181");
      expect(cliente.cpfCnpj.isCnpj).toBe(true);
    });

    it("deve lancar NameRequiredError quando nome e vazio", () => {
      expect(() => Cliente.create({ ...validProps, nome: "" })).toThrow(
        NameRequiredError,
      );
    });

    it("deve lancar NameRequiredError quando nome e apenas espacos", () => {
      expect(() => Cliente.create({ ...validProps, nome: "   " })).toThrow(
        NameRequiredError,
      );
    });

    it("deve lancar PhoneRequiredError quando telefone e vazio", () => {
      expect(() => Cliente.create({ ...validProps, telefone: "" })).toThrow(
        PhoneRequiredError,
      );
    });

    it("deve lancar InvalidCpfCnpjError quando CPF e invalido", () => {
      expect(() =>
        Cliente.create({ ...validProps, cpfCnpj: "00000000000" }),
      ).toThrow(InvalidCpfCnpjError);
    });
  });

  // ==================== reconstitute ====================

  describe("reconstitute", () => {
    it("deve reconstituir um Cliente a partir de dados de persistencia", () => {
      const cliente = Cliente.reconstitute({
        id: "abc-123",
        nome: "Maria Souza",
        cpfCnpj: "52998224725",
        telefone: "21988887777",
        email: null,
      });

      expect(cliente.id).toBe("abc-123");
      expect(cliente.nome).toBe("Maria Souza");
      expect(cliente.cpfCnpj.value).toBe("52998224725");
      expect(cliente.telefone).toBe("21988887777");
      expect(cliente.email).toBeNull();
    });
  });

  // ==================== update ====================

  describe("update", () => {
    it("deve atualizar nome do cliente", () => {
      const cliente = Cliente.create(validProps);
      cliente.update({ nome: "Joao Pedro" });
      expect(cliente.nome).toBe("Joao Pedro");
    });

    it("deve atualizar telefone do cliente", () => {
      const cliente = Cliente.create(validProps);
      cliente.update({ telefone: "21977776666" });
      expect(cliente.telefone).toBe("21977776666");
    });

    it("deve atualizar email do cliente", () => {
      const cliente = Cliente.create(validProps);
      cliente.update({ email: "novo@email.com" });
      expect(cliente.email).toBe("novo@email.com");
    });

    it("deve lancar NameRequiredError ao atualizar com nome vazio", () => {
      const cliente = Cliente.create(validProps);
      expect(() => cliente.update({ nome: "" })).toThrow(NameRequiredError);
    });

    it("deve lancar PhoneRequiredError ao atualizar com telefone vazio", () => {
      const cliente = Cliente.create(validProps);
      expect(() => cliente.update({ telefone: "" })).toThrow(
        PhoneRequiredError,
      );
    });
  });
});
