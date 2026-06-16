/**
 * ChaosController: Centralized manager for orchestrating chaos injection.
 * Acts as the "God Mode" controller for all functional resilience tests.
 */

export interface ChaosTool {
  name: string;
  enabled: boolean;
  enable(): void;
  disable(): void;
}

export class ChaosController {
  private registry: Map<string, ChaosTool> = new Map();

  /**
   * Registers a new chaos tool into the controller.
   */
  register(tool: ChaosTool): void {
    this.registry.set(tool.name, tool);
    console.log(`[ChaosController] Registered: ${tool.name}`);
  }

  /**
   * Enables a specific tool.
   */
  enable(name: string): void {
    const tool = this.registry.get(name);
    if (tool) {
      tool.enabled = true;
      tool.enable();
      console.log(`[ChaosController] Enabled: ${name}`);
    } else {
      console.warn(`[ChaosController] Tool not found: ${name}`);
    }
  }

  /**
   * Disables a specific tool.
   */
  disable(name: string): void {
    const tool = this.registry.get(name);
    if (tool) {
      tool.enabled = false;
      tool.disable();
      console.log(`[ChaosController] Disabled: ${name}`);
    }
  }

  /**
   * Emergency "Kill Switch" to disable all chaos.
   */
  killAll(): void {
    console.log('[ChaosController] Kill Switch: Disabling all chaos tools.');
    for (const tool of this.registry.values()) {
      if (tool.enabled) {
        tool.disable();
        tool.enabled = false;
      }
    }
  }

  /**
   * Returns current status of all tools.
   */
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name, tool] of this.registry.entries()) {
      status[name] = tool.enabled;
    }
    return status;
  }
}
