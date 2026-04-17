import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  Cliente,
  CreateClienteProps,
  UpdateClienteProps,
} from "../domain/cliente.entity";
import {
  ClienteRepository,
  CLIENTE_REPOSITORY,
  FindAllParams,
  PaginatedResult,
} from "../domain/cliente.repository";
import { DuplicateCpfCnpjError } from "../domain/errors/duplicate-cpf-cnpj.error";
import { normalizeCpfCnpj } from "../domain/value-objects/cpf-cnpj.utils";

@Injectable()
export class ClienteService {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly repository: ClienteRepository,
  ) {}

  async create(props: CreateClienteProps): Promise<Cliente> {
    const exists = await this.repository.existsByCpfCnpj(
      normalizeCpfCnpj(props.cpfCnpj),
    );
    if (exists) {
      throw new DuplicateCpfCnpjError(props.cpfCnpj);
    }

    const cliente = Cliente.create(props);
    return this.repository.create(cliente);
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Cliente>> {
    return this.repository.findAll(params);
  }

  async findById(id: string): Promise<Cliente> {
    const cliente = await this.repository.findById(id);
    if (!cliente) {
      throw new NotFoundException(`Cliente com id '${id}' nao encontrado`);
    }
    return cliente;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Cliente> {
    const cliente = await this.repository.findByCpfCnpj(
      normalizeCpfCnpj(cpfCnpj),
    );
    if (!cliente) {
      throw new NotFoundException(
        `Cliente com CPF/CNPJ '${cpfCnpj}' nao encontrado`,
      );
    }
    return cliente;
  }

  async update(id: string, props: UpdateClienteProps): Promise<Cliente> {
    const cliente = await this.repository.findById(id);
    if (!cliente) {
      throw new NotFoundException(`Cliente com id '${id}' nao encontrado`);
    }

    cliente.update(props);
    return this.repository.update(cliente);
  }

  /**
   * Soft delete: marks the cliente as inactive but keeps the record.
   *
   * TODO (integration with OrdemDeServico): when the OS module is available,
   * this method must reject the deactivation if the cliente has any open
   * (non-finalizada, non-entregue, non-cancelada) service order.
   */
  async delete(id: string): Promise<void> {
    const cliente = await this.repository.findById(id);
    if (!cliente) {
      throw new NotFoundException(`Cliente com id '${id}' nao encontrado`);
    }

    cliente.deactivate();
    await this.repository.update(cliente);
  }
}
