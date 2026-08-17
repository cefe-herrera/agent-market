import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HiringService } from './hiring.service';
import { CreateHireDto } from './dto/create-hire.dto';

@ApiTags('hiring')
@Controller('hires')
export class HiringController {
  constructor(private readonly hiringService: HiringService) {}

  @Post()
  @ApiOperation({ summary: 'Hire/activate an agent' })
  create(@Body() dto: CreateHireDto) {
    return this.hiringService.createHire(dto);
  }

  @Get('user/:wallet')
  @ApiOperation({ summary: 'Get hires by user wallet' })
  findByWallet(@Param('wallet') wallet: string) {
    return this.hiringService.getHiresByWallet(wallet);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hire by ID' })
  findOne(@Param('id') id: string) {
    return this.hiringService.getHire(id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke an agent hire' })
  revoke(@Param('id') id: string) {
    return this.hiringService.revokeHire(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause an active agent hire' })
  pause(@Param('id') id: string) {
    return this.hiringService.pauseHire(id);
  }
}
