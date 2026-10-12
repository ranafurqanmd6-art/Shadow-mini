'use strict';
// ============================================
// 📡 PING / SERVER MONITOR - SHADOW MD
// Live server stats card (latency, CPU, RAM, disk, uptime ...)
// ============================================

const os = require('os');
const { execFile } = require('child_process');
const config = require('../config');

// ── Pakistan time (Asia/Karachi = UTC+5) ──
function pkNow() {
  const d = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const p = (n) => (n < 10 ? '0' + n : String(n));
  let h = d.getUTCHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()];
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return {
    time: `${p(h)}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${ap}`,
    date: `${day}, ${d.getUTCDate()} ${mon} ${d.getUTCFullYear()}`,
  };
}

// ── CPU load % (loadavg / cores) ──
function getCpuUsage() {
  const cores = os.cpus().length || 1;
  return Math.min(100, (os.loadavg()[0] / cores) * 100).toFixed(1);
}

// ── RAM usage % ((total - free) / total) ──
function getRamUsage() {
  const total = os.totalmem();
  return (((total - os.freemem()) / total) * 100).toFixed(1);
}

// ── Disk usage % (df on /, async so it never blocks the bot; "N/A" if unavailable) ──
function getDiskUsage() {
  return new Promise((resolve) => {
    execFile('df', ['-k', '/'], { timeout: 2000 }, (err, out) => {
      if (err || !out) return resolve('N/A');
      const parts = out.trim().split('\n').pop().trim().split(/\s+/);
      const used = parseInt(parts[2], 10);
      const avail = parseInt(parts[3], 10);
      const total = used + avail;
      resolve(total > 0 ? ((used / total) * 100).toFixed(1) : 'N/A');
    });
  });
}

// ── Uptime formatter ──
function formatUptime(seconds) {
  seconds = Math.floor(seconds);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = {
  name: 'ping',
  aliases: ['p', 'speed', 'server', 'stats'],
  category: 'MAIN',
  desc: '📡 Check bot latency & live server stats',
  async run(ctx) {
    // ── Measure latency first ──
    const msgTime = Number(ctx.msg.messageTimestamp) * 1000;
    const latency = Number.isFinite(msgTime) && msgTime > 0 ? Math.max(1, Date.now() - msgTime) : 1;

    await ctx.react('📡').catch(() => {});

    const mem = process.memoryUsage();
    const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(2);
    const rssMem = (mem.rss / 1024 / 1024).toFixed(2);
    const pk = pkNow();
    const cpu = getCpuUsage();
    const ram = getRamUsage();
    const disk = await getDiskUsage();

    await ctx.reply(
`‎⚡ *ʟᴀᴛᴇɴᴄʏ:* ${latency} ᴍs
‎🇵🇰 *ᴘᴀᴋɪsᴛᴀɴ ᴛɪᴍᴇ:* ${pk.time} • ${pk.date}
‎🐧 *ᴏs:* ${os.platform()} ${os.release()}
‎🏗️ *ᴀʀᴄʜ:* ${os.arch()}
‎🖥️ *ᴄᴘᴜ:* ${os.cpus().length || 1} ᴄᴏʀᴇs (${cpu}%)
‎🧠 *ʀᴀᴍ:* ${ram}%
‎💾 *ᴅɪsᴋ:* ${disk === 'N/A' ? 'N/A' : disk + '%'}
‎📦 *ʜᴇᴀᴘ:* ${heapUsed} ᴍʙ
‎🔧 *ʀss:* ${rssMem} ᴍʙ
‎⚙️ *ʀᴜɴᴛɪᴍᴇ:* Node ${process.version}
‎⏱️ *ʙᴏᴛ ᴜᴘᴛɪᴍᴇ:* ${formatUptime(process.uptime())}
‎🕐 *sʏs ᴜᴘᴛɪᴍᴇ:* ${formatUptime(os.uptime())}
‎${config.menuCredit}`
    );

    await ctx.react('✅').catch(() => {});
  },
};
