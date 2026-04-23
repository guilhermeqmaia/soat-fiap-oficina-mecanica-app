import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdicionarServicoDto } from './adicionar-servico.dto';

describe('AdicionarServicoDto', () => {
  it('should accept valid servicoId and quantidade', async () => {
    const dto = plainToInstance(AdicionarServicoDto, {
      servicoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantidade: 2,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should transform quantidade string to number via @Type', () => {
    const dto = plainToInstance(AdicionarServicoDto, {
      servicoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantidade: '3',
    });

    expect(dto.quantidade).toBe(3);
  });

  it('should fail validation when servicoId is not a UUID', async () => {
    const dto = plainToInstance(AdicionarServicoDto, {
      servicoId: 'not-a-uuid',
      quantidade: 1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'servicoId')).toBe(true);
  });

  it('should fail validation when quantidade is zero', async () => {
    const dto = plainToInstance(AdicionarServicoDto, {
      servicoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantidade: 0,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantidade')).toBe(true);
  });

  it('should fail validation when quantidade is negative', async () => {
    const dto = plainToInstance(AdicionarServicoDto, {
      servicoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantidade: -1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantidade')).toBe(true);
  });

  it('should fail validation when quantidade is a float', async () => {
    const dto = plainToInstance(AdicionarServicoDto, {
      servicoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantidade: 1.5,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantidade')).toBe(true);
  });
});
