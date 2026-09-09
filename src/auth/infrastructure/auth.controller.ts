import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from '../domain/authenticated-user';

/**
 * Resource server (US-F3-03): a aplicacao NAO possui mais POST /auth/login.
 * A autenticacao acontece na Lambda de CPF atras do API Gateway
 * (POST {gateway}/auth — repo soat-fiap-oficina-auth-lambda); aqui apenas
 * validamos o token e expomos a identidade corrente.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retorna a identidade do token emitido pela Lambda de CPF',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      nome: user.nome,
      cpf: user.cpf,
      role: user.role,
    };
  }
}
