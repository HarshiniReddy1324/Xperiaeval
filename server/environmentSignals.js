/**
 * Browser environment heuristics — VM, multi-monitor, automation signals (client-reported).
 */

export function analyzeEnvironmentSignals(env = {}) {
  if (!env || typeof env !== 'object') {
    return { score: 100, flags: [], vm_suspected: false, multi_monitor_suspected: false };
  }

  const flags = [];
  const vmReasons = [];
  let score = 100;

  if (env.webdriver) {
    vmReasons.push('navigator.webdriver true');
    flags.push('automation_webdriver');
    score -= 25;
  }
  if (env.headless_ua) {
    vmReasons.push('headless user-agent');
    flags.push('headless_browser');
    score -= 20;
  }
  if (env.plugins_count === 0 && !env.mobile) {
    vmReasons.push('zero browser plugins');
    flags.push('vm_zero_plugins');
    score -= 8;
  }
  if (env.hardware_concurrency != null && env.hardware_concurrency <= 2 && env.device_memory <= 2) {
    vmReasons.push('low CPU/RAM fingerprint');
    flags.push('vm_low_resources');
    score -= 6;
  }
  if (env.screen_width >= 5120 || env.screen_height >= 2880) {
    flags.push('unusual_display_ultrawide');
  }
  if (env.window_width && env.screen_width && env.window_width < env.screen_width * 0.35) {
    flags.push('multi_monitor_suspected');
    score -= 4;
  }
  if (env.unusual_display) {
    flags.push('unusual_display');
  }

  const vm_suspected = vmReasons.length >= 2 || env.webdriver || env.headless_ua;

  return {
    score: Math.max(0, Math.min(100, score)),
    flags,
    vm_suspected,
    vm_reasons: vmReasons,
    multi_monitor_suspected: flags.includes('multi_monitor_suspected'),
    summary: vm_suspected
      ? 'Environment resembles VM or automated browser — review with integrity signals.'
      : flags.length
        ? 'Minor display/environment flags — context only.'
        : 'Standard browser environment.',
  };
}
