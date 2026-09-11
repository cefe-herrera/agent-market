import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HireModalComponent } from './hire-modal.component';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import { AgentDto, HireStatus } from '@bnb-marketplace/shared-types';

describe('HireModalComponent', () => {
  let component: HireModalComponent;
  let fixture: ComponentFixture<HireModalComponent>;
  let apiService: jasmine.SpyObj<ApiService>;
  let userService: jasmine.SpyObj<UserService>;

  const mockWallet = '0xDemoUser123456789012345678901234567890';

  const mockAgent: AgentDto = {
    id: '1',
    agentId: 'agent-001',
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'Test',
    shortDescription: 'Test',
    imageUrl: null,
    ownerWallet: '0x1',
    agentWallet: '0x2',
    agentUri: null,
    network: 'BNB Chain',
    chainId: 56,
    isTestnet: false,
    source: 'MARKETPLACE_SEED' as AgentDto['source'],
    publishedAt: null,
    status: 'VERIFIED' as AgentDto['status'],
    verified: true,
    category: 'REBALANCING' as AgentDto['category'],
    protocols: ['PancakeSwap'],
    supportedAssets: ['USDT'],
    strategyName: 'Test Strategy',
    strategyDescription: 'Test desc',
    riskLevel: 'LOW' as AgentDto['riskLevel'],
    minimumCapital: 100,
    recommendedCapital: 500,
    executionFrequency: 'Daily',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    apiService = jasmine.createSpyObj('ApiService', ['createHire']);
    userService = jasmine.createSpyObj('UserService', ['wallet', 'isConnected']);
    userService.wallet.and.returnValue(mockWallet);
    userService.isConnected.and.returnValue(true);
    apiService.createHire.and.returnValue(
      of({
        id: 'hire-1',
        agentId: '1',
        userWallet: '0xDemo',
        amount: 500,
        asset: 'USDT',
        status: HireStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        cancelledAt: null,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [HireModalComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HireModalComponent);
    component = fixture.componentInstance;
    component.agent = mockAgent;
    component.permissions = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at capital step', () => {
    expect(component.step()).toBe('capital');
  });

  it('should advance to strategy step', () => {
    component.capitalForm.patchValue({ amount: 500, asset: 'USDT' });
    component.nextFromCapital();
    expect(component.step()).toBe('strategy');
  });

  it('should call API on activate', () => {
    component.capitalForm.patchValue({ amount: 500, asset: 'USDT' });
    component.activate();
    expect(apiService.createHire).toHaveBeenCalled();
  });
});
