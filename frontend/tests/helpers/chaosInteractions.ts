import { Page, Locator } from '@playwright/test';
import { ChaosTool } from './chaosController.ts';

/**
 * InteractionChaos: Implements tools to mimic erratic human behavior.
 */
export class InteractionChaos implements ChaosTool {
  name = 'interaction-chaos';
  enabled = false;

  constructor(private page: Page) {}

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  /**
   * rapidFireClick: Sends multiple clicks in rapid succession.
   */
  async rapidFireClick(locator: Locator, count = 3): Promise<void> {
    if (!this.enabled) return;
    // Mimics human double/triple clicking
    for (let i = 0; i < count; i++) {
        try {
            await locator.click({ delay: 5 });
        } catch (e) {
            // If the element is detached (e.g., due to state change), stop clicking.
            break;
        }
    }
  }

  /**
   * erraticBlur: Focuses and blurs immediately, potentially mid-typing.
   */
  async erraticBlur(locator: Locator): Promise<void> {
    if (!this.enabled) return;
    await locator.focus();
    await locator.blur();
  }

  /**
   * staccatoInput: Types with random jitter to test async validation.
   */
  async staccatoInput(locator: Locator, text: string): Promise<void> {
    if (!this.enabled) return;
    for (const char of text) {
        await locator.type(char, { delay: Math.random() * 150 });
    }
  }
}
