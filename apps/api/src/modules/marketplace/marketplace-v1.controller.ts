import {
  BadRequestException,
  BadGatewayException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto';
import { AgentsService } from '../agents/agents.service';
import { IndexerBnbService } from '../blockchain/indexer-bnb/indexer-bnb.service';
import { IndexerHttpError } from '../blockchain/indexer-bnb/indexer-bnb.types';
import { AgentCardPreviewService } from './agent-card-preview.service';
import {
  A2aHealthResponseDto,
  AgentCardPreviewResponseDto,
  ErrorResponseDto,
  MarketplaceStatsResponseDto,
  MarketplaceV1ListResponseDto,
} from './dto/marketplace-v1-swagger.dto';

@ApiTags('marketplace-v1')
@Controller('api/v1/marketplace')
export class MarketplaceV1Controller {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly agentsService: AgentsService,
    private readonly indexer: IndexerBnbService,
    private readonly agentCardPreview: AgentCardPreviewService,
  ) {}

  @Get('agents')
  @ApiOperation({ summary: 'List and filter marketplace agents (v1)' })
  @ApiOkResponse({ type: MarketplaceV1ListResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  listAgents(@Query() query: MarketplaceQueryDto) {
    return this.withIndexerBoundary(() => this.marketplaceService.listAgents(query));
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured agents (v1)' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { type: 'object' },
      example: [
        {
          id: 'f81f5f4e-bf09-457f-a86f-b090ac9056f9',
          agentId: '97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417',
          name: 'Latam FX Desk',
        },
      ],
    },
  })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  getFeatured() {
    return this.withIndexerBoundary(() => this.marketplaceService.getFeatured());
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get marketplace statistics (v1)' })
  @ApiOkResponse({ type: MarketplaceStatsResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  getStats() {
    return this.withIndexerBoundary(() => this.marketplaceService.getStats());
  }

  @Get('search')
  @ApiOperation({ summary: 'Search marketplace agents (v1)' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search term; if absent uses query.search',
    example: 'bnbagent',
  })
  @ApiOkResponse({ type: MarketplaceV1ListResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  search(@Query() query: MarketplaceQueryDto, @Query('q') q?: string) {
    return this.withIndexerBoundary(() =>
      this.marketplaceService.listAgents({
        ...query,
        search: q?.trim() || query.search,
      }),
    );
  }

  @Get('agents/:id')
  @ApiOperation({ summary: 'Get marketplace agent by id/slug (v1)' })
  @ApiParam({
    name: 'id',
    description: 'UUID, ERC-8004 id (chain:registry:tokenId), tokenId, or slug',
    example: '97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      example: {
        id: 'f81f5f4e-bf09-457f-a86f-b090ac9056f9',
        agentId: '97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417',
        name: 'Latam FX Desk',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Agent not found', type: ErrorResponseDto })
  getAgent(@Param('id') id: string) {
    return this.agentsService.findById(id);
  }

  @Get('agents/:id/a2a-health')
  @ApiOperation({ summary: 'Get A2A health by id/slug (v1)' })
  @ApiParam({
    name: 'id',
    description: 'UUID, ERC-8004 id (chain:registry:tokenId), tokenId, or slug',
  })
  @ApiOkResponse({ type: A2aHealthResponseDto })
  @ApiNotFoundResponse({ description: 'Agent or A2A endpoint not found', type: ErrorResponseDto })
  getA2aHealth(@Param('id') id: string) {
    return this.agentsService.getA2aHealth(id);
  }

  @Get('agents/:id/reputation')
  @ApiOperation({ summary: 'Get reputation details by id/slug (v1)' })
  @ApiParam({
    name: 'id',
    description: 'tokenId or ERC-8004 id format chain:registry:tokenId',
    example: '97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      example: {
        agentId: '97:0x8004a818bfb912233c491871b3d84c89a494bd9e:417',
        tokenId: '417',
        owner: '0xabc...',
        clients: ['0xdef...'],
        feedbacks: [],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Cannot parse or resolve agent id', type: ErrorResponseDto })
  @ApiBadGatewayResponse({ description: 'Indexer upstream failed', type: ErrorResponseDto })
  async getReputation(@Param('id') id: string) {
    try {
      const data = await this.indexer.getReputation(id);
      if (!data) {
        throw new NotFoundException(`Agent ${id} not found in indexer`);
      }
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof IndexerHttpError) {
        throw new BadGatewayException(`Indexer unavailable: ${error.message}`);
      }
      throw error;
    }
  }

  @Get('agents/:id/card')
  @ApiOperation({ summary: 'Get resolved Agent Card preview by id/slug (v1)' })
  @ApiParam({
    name: 'id',
    description: 'UUID, ERC-8004 id (chain:registry:tokenId), tokenId, or slug',
  })
  @ApiOkResponse({ type: AgentCardPreviewResponseDto })
  @ApiNotFoundResponse({ description: 'No Agent Card JSON found', type: ErrorResponseDto })
  async getCard(@Param('id') id: string) {
    const card = await this.agentCardPreview.fetchAgentCardPreview(id);
    if (!card) {
      throw new NotFoundException('No Agent Card JSON found before payment');
    }
    return card;
  }

  private async withIndexerBoundary<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('indexer')) {
        throw new BadGatewayException(`Indexer unavailable: ${message}`);
      }
      throw error;
    }
  }
}
