import { Component, Input, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgentDto, AgentPermissionDto } from '@bnb-marketplace/shared-types';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import { I18nService } from '../../../core/i18n/i18n.service';

type HireStep = 'capital' | 'strategy' | 'permissions' | 'confirm' | 'success';

@Component({
  selector: 'app-hire-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" (click)="close.emit()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          @if (step() !== 'success') {
            <h2 class="mb-1 font-pixel text-lg text-surface-950">{{ t('hire.title', { name: agent.name }) }}</h2>
            <p class="mb-4 font-mono-data text-xs text-surface-500">{{ t('hire.step', { current: stepIndex() + 1 }) }}</p>

            <div class="mb-4 flex gap-1">
              @for (s of steps; track s; let i = $index) {
                <div class="h-1 flex-1 rounded" [class.bg-brand-500]="i <= stepIndex()" [class.bg-surface-300]="i > stepIndex()"></div>
              }
            </div>
          }

          @switch (step()) {
            @case ('capital') {
              <div class="space-y-4">
                <div>
                  <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('hire.capitalAmount') }}</label>
                  <input type="number" [formControl]="capitalForm.controls.amount" class="input-field" [placeholder]="t('hire.minPlaceholder', { min: agent.minimumCapital })" />
                  @if (capitalForm.controls.amount.touched && capitalForm.controls.amount.invalid) {
                    <p class="mt-1 font-mono-data text-xs text-red-400">{{ t('hire.minError', { min: agent.minimumCapital }) }}</p>
                  }
                </div>
                <div>
                  <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('hire.asset') }}</label>
                  <select [formControl]="capitalForm.controls.asset" class="select-field">
                    @for (asset of agent.supportedAssets; track asset) {
                      <option [value]="asset">{{ asset }}</option>
                    }
                  </select>
                </div>
                <button (click)="nextFromCapital()" [disabled]="capitalForm.invalid" class="btn-primary w-full">{{ t('common.continue') }}</button>
              </div>
            }
            @case ('strategy') {
              <div class="space-y-3">
                <h3 class="font-mono-data font-medium text-surface-950">{{ agent.strategyName }}</h3>
                <p class="font-mono-data text-sm text-surface-500">{{ agent.strategyDescription }}</p>
                <div class="rounded border border-surface-300 bg-surface-50 p-3 font-mono-data text-sm">
                  <p><span class="font-medium">{{ t('hire.execution') }}</span> {{ agent.executionFrequency }}</p>
                  <p><span class="font-medium">{{ t('hire.recommended') }}</span> {{ agent.recommendedCapital }} {{ capitalForm.value.asset }}</p>
                </div>
                <div class="flex gap-2">
                  <button (click)="step.set('capital')" class="btn-secondary flex-1">{{ t('common.backStep') }}</button>
                  <button (click)="step.set('permissions')" class="btn-primary flex-1">{{ t('common.continue') }}</button>
                </div>
              </div>
            }
            @case ('permissions') {
              <div class="space-y-3">
                <p class="font-mono-data text-sm font-medium text-surface-950">{{ t('hire.canDo') }}</p>
                @for (perm of allowedPermissions(); track perm.id) {
                  <div class="flex items-start gap-2 font-mono-data text-sm">
                    <span class="text-brand-500">✓</span>
                    <span>{{ perm.description }}</span>
                  </div>
                }
                @if (spendLimit()) {
                  <p class="text-sm font-mono-data text-surface-500">{{ t('hire.maxSpend') }} <strong class="text-surface-950">{{ spendLimit() }} {{ capitalForm.value.asset }}</strong></p>
                }
                @if (deniedPermissions().length) {
                  <p class="mt-2 text-sm font-medium">{{ t('hire.cannot') }}</p>
                  @for (perm of deniedPermissions(); track perm.id) {
                    <div class="flex items-start gap-2 font-mono-data text-sm text-surface-500">
                      <span class="text-red-400">✗</span>
                      <span>{{ perm.description }}</span>
                    </div>
                  }
                }
                <div class="flex gap-2">
                  <button (click)="step.set('strategy')" class="btn-secondary flex-1">{{ t('common.backStep') }}</button>
                  <button (click)="step.set('confirm')" class="btn-primary flex-1">{{ t('common.continue') }}</button>
                </div>
              </div>
            }
            @case ('confirm') {
              <div class="space-y-4">
                <div class="rounded border border-surface-300 bg-surface-50 p-4 font-mono-data text-sm space-y-2">
                  <p><span class="font-medium">{{ t('hire.agent') }}</span> {{ agent.name }}</p>
                  <p><span class="font-medium">{{ t('hire.capital') }}</span> {{ capitalForm.value.amount }} {{ capitalForm.value.asset }}</p>
                  <p><span class="font-medium">{{ t('hire.strategy') }}</span> {{ agent.strategyName }}</p>
                </div>
                @if (error()) {
                  <p class="font-mono-data text-sm text-red-400">{{ error() }}</p>
                }
                <div class="flex gap-2">
                  <button (click)="step.set('permissions')" class="btn-secondary flex-1">{{ t('common.backStep') }}</button>
                  <button (click)="activate()" [disabled]="loading()" class="btn-primary flex-1">
                    {{ loading() ? t('hire.activating') : t('hire.activate') }}
                  </button>
                </div>
              </div>
            }
            @case ('success') {
              <div class="py-6 text-center">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/10 text-2xl text-brand-500">✓</div>
                <h3 class="font-pixel text-lg text-surface-950">{{ t('hire.successTitle') }} ✓</h3>
                <p class="mt-2 font-mono-data text-sm text-surface-500">
                  {{ t('hire.successBody', { name: agent.name, amount: capitalForm.value.amount ?? 0, asset: capitalForm.value.asset ?? '' }) }}
                </p>
                <button (click)="onSuccessClose()" class="btn-primary mt-6">{{ t('common.done') }}</button>
              </div>
            }
          }
        </div>
      </div>
    }
  `,
})
export class HireModalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);

  @Input({ required: true }) agent!: AgentDto;
  @Input({ required: true }) permissions: AgentPermissionDto[] = [];

  readonly close = output<void>();
  readonly hired = output<void>();

  readonly t = this.i18n.t;
  readonly open = signal(true);
  readonly step = signal<HireStep>('capital');
  readonly loading = signal(false);
  readonly error = signal('');

  readonly steps: HireStep[] = ['capital', 'strategy', 'permissions', 'confirm'];

  capitalForm = this.fb.group({
    amount: [500, [Validators.required, Validators.min(1)]],
    asset: ['USDT', Validators.required],
  });

  ngOnInit(): void {
    if (this.agent) {
      this.capitalForm.controls.amount.setValidators([
        Validators.required,
        Validators.min(this.agent.minimumCapital),
      ]);
      this.capitalForm.controls.amount.updateValueAndValidity();

      if (this.agent.supportedAssets.length) {
        this.capitalForm.controls.asset.setValue(this.agent.supportedAssets[0]);
      }
    }
  }

  stepIndex(): number {
    return this.steps.indexOf(this.step());
  }

  allowedPermissions(): AgentPermissionDto[] {
    return this.permissions.filter((p) => p.allowed);
  }

  deniedPermissions(): AgentPermissionDto[] {
    return this.permissions.filter((p) => !p.allowed);
  }

  spendLimit(): number | null {
    const swapPerm = this.permissions.find((p) => p.allowed && p.spendLimit);
    return swapPerm?.spendLimit ?? this.capitalForm.value.amount ?? null;
  }

  nextFromCapital(): void {
    if (this.capitalForm.valid) {
      this.step.set('strategy');
    } else {
      this.capitalForm.markAllAsTouched();
    }
  }

  activate(): void {
    const userWallet = this.userService.wallet();
    if (!userWallet) {
      this.error.set(this.t('wallet.connectRequired'));
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api
      .createHire({
        agentId: this.agent.id,
        userWallet,
        amount: this.capitalForm.value.amount!,
        asset: this.capitalForm.value.asset!,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.step.set('success');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? this.t('hire.error'));
        },
      });
  }

  onSuccessClose(): void {
    this.hired.emit();
    this.close.emit();
  }
}
