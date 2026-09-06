import { defineConfig } from '@playwright/test'
const proof = process.env.SYSGRID_PROOF_DIR || 'test-results/visual-repair'
export default defineConfig({
 testDir:'./tests',testMatch:'projects-visual-repair.spec.ts',fullyParallel:false,workers:1,retries:0,
 timeout:30000,expect:{timeout:6000},reporter:[['list'],['json',{outputFile:proof+'/playwright-report.json'}]],
 outputDir:proof+'/browser-artifacts',
 use:{baseURL:process.env.SYSGRID_PROOF_URL || 'http://127.0.0.1:5173',headless:true,viewport:{width:1280,height:720},serviceWorkers:'block',trace:'retain-on-failure',screenshot:'only-on-failure',video:'off'}
})
