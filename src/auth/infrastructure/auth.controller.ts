import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Usuario } from '../domain/usuario.entity';
import { LoginUseCase } from '../application/use-cases/login.use-case';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuario e retornar JWT' })
  @ApiUnauthorizedResponse({ description: 'Credenciais invalidas' })
  @ApiTooManyRequestsResponse({ description: 'Muitas tentativas de login' })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute({ email: dto.email, senha: dto.senha });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna informacoes do usuario autenticado' })
  async me(@CurrentUser() user: Usuario) {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email.value,
      role: user.role,
    };
  }
}
