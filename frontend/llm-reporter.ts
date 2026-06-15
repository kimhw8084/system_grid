import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

class LLMReporter implements Reporter {
  private failures: any[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'passed' && result.status !== 'skipped') {
      // Extract only the most high-value signals, completely ignoring
      // the noisy ANSI codes and stack trace fluff.
      const errorStr = result.error?.message || '';
      // Grab the first line of the error (usually the clearest signal)
      const cleanError = errorStr.split('\n').slice(0, 3).join(' | ').replace(/\x1b\[[0-9;]*m/g, '');

      this.failures.push({
        test: test.title,
        file: test.location?.file,
        line: test.location?.line,
        status: result.status,
        error: cleanError.substring(0, 250) // clamp for token safety
      });
    }
  }

  onEnd() {
    const reportPath = path.resolve(process.cwd(), 'llm-report.json');
    if (this.failures.length > 0) {
      fs.writeFileSync(reportPath, JSON.stringify({
        failed_count: this.failures.length,
        failures: this.failures
      }, null, 2));
      console.log(`\n[LLM-Reporter] Emitted token-optimized failure artifact to ${reportPath}`);
    } else {
      if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath); // Clean up if previous run failed but this one passed
      }
      console.log('\n[LLM-Reporter] All tests passed. No artifact needed.');
    }
  }
}

export default LLMReporter;
